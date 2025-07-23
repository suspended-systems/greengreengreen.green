"use server";

import { google } from "googleapis";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { defaultStartingDate, defaultStartingValue, defaultTransactions, Transaction } from "./transactions";
import { RRule } from "rrule";
import { v4 as uuid } from "uuid";
import { parse } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { SheetsRow, TransactionRowSchema, transactionToSheetsRow, TRANSACTION_FIELDS } from "./transactionSchema";
import { formatDateToSheets, letterToIndex, pMapConfig } from "./utils";
import { partition } from "lodash";
import pMap from "p-map";

type ColumnLetter = (typeof TRANSACTION_FIELDS)[keyof typeof TRANSACTION_FIELDS]["sheetsColumnLetter"];

const credentials = {
	project_id: "green-456901",
	client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
	private_key: process.env.GOOGLE_PRIVATE_KEY!,
};

const TRANSACTIONS_SHEET_NAME = "Transactions";
const STARTING_VALUES_SHEET_NAME = "Starting Values";

const parseDate = (dateString: string, tz: string) => fromZonedTime(parse(dateString, "M/d/yyyy", new Date()), tz);

// Generate a UUID if one doesn't exist and then push it to the first sheets row which has an empty uuid field (an assumption we're forced to make)
const assignUUID = async ({ spreadsheetId }: { spreadsheetId: string }) => {
	const id = uuid();

	await updateSheetsRow({
		spreadsheetId,
		filterValue: "",
		column: TRANSACTION_FIELDS.id.sheetsColumnLetter,
		cellValue: id,
	});

	return id;
};

// Generate a disabled/enabled toggle state if one doesn't exist
const assignEnabled = async ({ rowUUID, spreadsheetId }: { rowUUID: string; spreadsheetId: string }) => {
	await updateSheetsRow({
		spreadsheetId,
		filterColumn: TRANSACTION_FIELDS.id.sheetsColumnLetter,
		filterValue: rowUUID,
		column: TRANSACTION_FIELDS.disabled.sheetsColumnLetter,
		// boolean value flipped because in the sheet we store the opposite: "enabled"
		cellValue: true,
	});

	// in the app we store "disabled"
	return false;
};

// todo ratelimiting backoff retry
// Error: Quota exceeded for quota metric 'Read requests' and limit 'Read requests per minute per user' of service 'sheets.googleapis.com' for consumer 'project_number:274980100053'.
const spreadsheets = (readonly?: "readonly") => {
	const auth = new google.auth.GoogleAuth({
		credentials,
		scopes: [`https://www.googleapis.com/auth/spreadsheets${readonly ? ".readonly" : ""}`],
	});

	const { spreadsheets } = google.sheets({ version: "v4", auth });

	return spreadsheets;
};

export default async function getSheetsData({ tz }: { tz: string }) {
	const session: Session | null = await getServerSession(authOptions);
	const accessToken = session?.accessToken;

	if (!accessToken) {
		return;
	}

	/**
	 * Grab the sheet
	 */

	// Using the accessToken, look up the respective email using Google's server, then filter using that email
	const { email } = await getEmailFromToken(accessToken);
	const sheetIsOwnedByAuthTokenUser = `'${email}' in owners`;

	const sheetFile = (
		await google
			.drive({
				version: "v3",
				auth: new google.auth.GoogleAuth({
					credentials,
					scopes: [
						"https://www.googleapis.com/auth/drive.metadata.readonly",
						"https://www.googleapis.com/auth/spreadsheets.readonly",
					],
				}),
			})
			.files.list({
				q: ["mimeType='application/vnd.google-apps.spreadsheet'", "trashed = false", sheetIsOwnedByAuthTokenUser].join(
					" AND ",
				),
				orderBy: "createdTime asc",
				pageSize: 1,
				fields: "files(id, name, owners, createdTime)",
			})
	).data.files?.[0];

	if (!sheetFile?.id) {
		return;
	}

	// Initialize the spreadsheet
	if (await isSpreadsheetEmpty(sheetFile.id)) {
		await initSheet(sheetFile.id);
	}

	/**
	 * Parse the rows
	 */

	const rawRows =
		((
			await spreadsheets("readonly").values.get({
				spreadsheetId: sheetFile.id,
				range: `${TRANSACTIONS_SHEET_NAME}!A:Z`,
			})
		).data.values
			// skip headers
			?.slice(1) as Array<[string, string, string, string, string, string]>) ?? [];

	const [validatedRows, malformedRows] = partition(rawRows, (row) => {
		try {
			TransactionRowSchema.parse(row);
			return true;
		} catch (error) {
			console.warn({ error, row });
			return false;
		}
	});

	// Map the rows to our app's data structure and reconcile missing UUID/toggle state
	const transactions: Transaction[] = await pMap(
		validatedRows,
		async ([name, amount, date, recurrence, enabled, id]) => {
			const assignedId = id || (await assignUUID({ spreadsheetId: sheetFile.id! }));

			const isDisabled = enabled
				? enabled.toLowerCase() !== "true"
				: await assignEnabled({ rowUUID: assignedId, spreadsheetId: sheetFile.id! });

			return {
				name,
				id: assignedId,
				disabled: isDisabled,
				amount: Number(amount),
				date: parseDate(date, tz).getTime(),
				...(recurrence &&
					RRule.fromText(recurrence) && {
						freq: RRule.fromText(recurrence).options.freq,
						interval: RRule.fromText(recurrence).options.interval,
					}),
			};
		},
		pMapConfig,
	);

	return {
		sheet: { id: sheetFile.id },
		transactions,
		malformedTransactions: malformedRows,
		...(sheetFile?.id && (await getStartingValues(sheetFile?.id, tz))),
	};
}

/**
 * For security purposes, the client sends us the signed in user's token.
 * We then make a request here in the server to Google to get the token's associated email.
 * This way, we do not run any risk of email spoofing.
 */
async function getEmailFromToken(accessToken: string) {
	const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
		headers: { Authorization: `Bearer ${accessToken}` },
	});

	if (!res.ok) {
		throw new Error(`Failed to fetch userinfo: ${res.status} ${await res.text()}`);
	}

	const profile = await res.json();

	return {
		email: profile.email,
		verified: profile.email_verified,
	};
}

async function isSpreadsheetEmpty(spreadsheetId: string): Promise<boolean> {
	// Fetch the metadata of the sheet
	const sheetTabs =
		(
			await spreadsheets("readonly").get({
				spreadsheetId,
				fields: "sheets(properties(title))",
			})
		).data.sheets ?? [];

	if (!sheetTabs.length) {
		// No tabs, empty!
		return true;
	}

	// For each sheet‐tab, check if there are any values
	for (const tab of sheetTabs) {
		const title = tab.properties?.title;

		if (!title) {
			continue;
		}

		// Request the entire sheet by using the sheet name as the “range”.
		// If there’s absolutely no data on that sheet, `values` will be undefined.
		const tabRows = (
			await spreadsheets("readonly").values.get({
				spreadsheetId,
				range: `${title}`, // just the sheet name
				// (the Sheets API will return only the non‐empty rows/columns)
			})
		).data.values;

		if (tabRows?.length) {
			// Found at least one non-empty row/cell in this sheet → not empty
			return false;
		}
	}

	// If we fell through all tabs without finding any non-empty values, it’s empty
	return true;
}

async function initSheet(spreadsheetId: string) {
	// Fetch current sheets metadata
	const sheets =
		(
			await spreadsheets().get({
				spreadsheetId,
				fields: "sheets(properties(sheetId,title))",
			})
		).data.sheets ?? [];

	// Rename the first tab
	const alreadyHasTransactionsTab = sheets.some((s) => s.properties?.title === TRANSACTIONS_SHEET_NAME);
	if (sheets[0]?.properties && !alreadyHasTransactionsTab) {
		await spreadsheets().batchUpdate({
			spreadsheetId,
			requestBody: {
				requests: [
					{
						updateSheetProperties: {
							properties: {
								sheetId: sheets[0].properties.sheetId,
								title: TRANSACTIONS_SHEET_NAME,
							},
							fields: "title",
						},
					},
				],
			},
		});

		// Initialize the headers and default transactions
		await spreadsheets().values.update({
			spreadsheetId,
			range: `${TRANSACTIONS_SHEET_NAME}!A1`,
			valueInputOption: "USER_ENTERED",
			requestBody: {
				values: [
					Object.values(TRANSACTION_FIELDS).map((c) => c.header),
					...defaultTransactions.map(transactionToSheetsRow),
				],
			},
		});
	}

	// Add “Starting Values” tab only if it does not exist yet
	const alreadyHasStartingValues = sheets.some((s) => s.properties?.title === STARTING_VALUES_SHEET_NAME);
	if (!alreadyHasStartingValues) {
		await spreadsheets().batchUpdate({
			spreadsheetId,
			requestBody: {
				requests: [
					{
						addSheet: {
							properties: {
								title: STARTING_VALUES_SHEET_NAME,
								gridProperties: {
									rowCount: 1,
									columnCount: 4,
								},
							},
						},
					},
				],
			},
		});

		// Initialize the single row with text and default starting date and starting amount
		await spreadsheets().values.update({
			spreadsheetId,
			range: `${STARTING_VALUES_SHEET_NAME}!A1:D1`,
			valueInputOption: "USER_ENTERED",
			requestBody: {
				values: [["Starting on", formatDateToSheets(defaultStartingDate), "with", defaultStartingValue]],
			},
		});

		// Center the "with" text
		const startingValuesTabSheetId = (
			await spreadsheets().get({
				spreadsheetId,
				fields: "sheets(properties(sheetId,title))",
			})
		).data.sheets?.find(({ properties }) => properties?.title === STARTING_VALUES_SHEET_NAME)?.properties?.sheetId;

		if (startingValuesTabSheetId) {
			await spreadsheets().batchUpdate({
				spreadsheetId,
				requestBody: {
					requests: [
						{
							repeatCell: {
								range: {
									sheetId: startingValuesTabSheetId,
									startRowIndex: 0,
									endRowIndex: 1,
									startColumnIndex: 2,
									endColumnIndex: 3,
								},
								cell: {
									userEnteredFormat: {
										horizontalAlignment: "CENTER",
									},
								},
								fields: "userEnteredFormat.horizontalAlignment",
							},
						},
					],
				},
			});
		}
	}
}

async function getStartingValues(
	spreadsheetId: string,
	tz: string,
): Promise<{ startDate: Date | null; startAmount: number | null }> {
	const [_Starting_on, startingDate, _with, startingAmount] =
		(
			await spreadsheets("readonly").values.get({
				spreadsheetId,
				range: `${STARTING_VALUES_SHEET_NAME}!A1:D1`,
			})
		).data.values?.[0] ?? [];

	const startDate = typeof startingDate === "string" ? parseDate(startingDate, tz) : null;

	const startAmount = startingAmount != null ? Number(startingAmount) : null;

	return {
		startDate,
		startAmount,
	};
}

export async function updateStartingDate(spreadsheetId: string, date: Date) {
	await spreadsheets().values.update({
		spreadsheetId,
		range: `${STARTING_VALUES_SHEET_NAME}!B1`,
		valueInputOption: "USER_ENTERED",
		requestBody: { values: [[formatDateToSheets(date)]] },
	});
}

export async function updateStartingNumber(spreadsheetId: string, amount: number) {
	await spreadsheets().values.update({
		spreadsheetId,
		range: `${STARTING_VALUES_SHEET_NAME}!D1`,
		valueInputOption: "USER_ENTERED",
		requestBody: { values: [[amount]] },
	});
}

async function getFirstSheet(spreadsheetId: string) {
	const firstSheet = (
		await spreadsheets("readonly").get({ spreadsheetId, fields: "sheets(properties(sheetId,title))" })
	).data.sheets?.[0]?.properties;

	if (!firstSheet?.title || firstSheet?.sheetId == null) {
		throw new Error("No sheets found in this spreadsheet");
	}

	return { sheetName: firstSheet.title, sheetId: firstSheet.sheetId };
}

export async function updateSheetsRow(input: {
	spreadsheetId: string;
	filterColumn?: ColumnLetter;
	filterValue: string | number;
	column: ColumnLetter;
	cellValue: string | number | boolean;
}) {
	const { spreadsheetId, filterColumn, filterValue, column, cellValue } = input;

	const { sheetName, targetRowIndex } = await findSheetRowIndex({
		filterValue,
		spreadsheetId,
		filterColumn,
	});

	const rowNum = targetRowIndex + 1; // index -> number (1 based)

	await spreadsheets().values.update({
		spreadsheetId,
		range: `${sheetName}!${column}${rowNum}:${column}${rowNum}`,
		valueInputOption: "USER_ENTERED",
		requestBody: { values: [[cellValue]] },
	});
}

export async function appendSheetsRow(spreadsheetId: string, row: SheetsRow) {
	const { sheetName } = await getFirstSheet(spreadsheetId);

	await spreadsheets().values.append({
		spreadsheetId,
		range: sheetName,
		valueInputOption: "USER_ENTERED",
		insertDataOption: "INSERT_ROWS",
		requestBody: { values: [row] },
	});
}

export async function deleteSheetsRow({
	spreadsheetId,
	filterValue,
	filterColumn,
}: {
	spreadsheetId: string;
	filterValue: string | number;
	filterColumn?: ColumnLetter;
}) {
	const { sheetId, targetRowIndex } = await findSheetRowIndex({
		filterValue,
		spreadsheetId,
		filterColumn,
	});

	await spreadsheets().batchUpdate({
		spreadsheetId,
		requestBody: {
			requests: [
				{
					deleteDimension: {
						range: {
							sheetId,
							dimension: "ROWS",
							startIndex: targetRowIndex, // zero‑based
							endIndex: targetRowIndex + 1, // non‑inclusive
						},
					},
				},
			],
		},
	});
}

async function findSheetRowIndex({
	spreadsheetId,
	filterValue,
	filterColumn,
}: {
	spreadsheetId: string;
	filterValue: string | number;
	filterColumn?: ColumnLetter;
}) {
	filterColumn = filterColumn ?? TRANSACTION_FIELDS.id.sheetsColumnLetter;

	// find the target row
	const { sheetId, sheetName } = await getFirstSheet(spreadsheetId);
	const colRange = `${sheetName}!A:${filterColumn}`;
	const sheetsRows =
		(
			await spreadsheets("readonly").values.get({
				spreadsheetId,
				range: colRange,
			})
		).data.values ?? [];

	const targetRowIndex = sheetsRows.findIndex((tx, i) => {
		// skip header
		if (i === 0) {
			return;
		}

		const colIndex = letterToIndex(filterColumn);
		const cellValue = tx[colIndex];

		return String(cellValue ?? "") === String(filterValue);
	});

	if (targetRowIndex < 0) {
		throw new Error("No matching row found");
	}

	return { sheetId, sheetName, targetRowIndex };
}
