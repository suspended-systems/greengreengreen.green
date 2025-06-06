"use server";
import { google } from "googleapis";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "../pages/api/auth/[...nextauth]";
import { Transaction } from "./transactions";
import { RRule } from "rrule";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";
import { COLUMNS, letterToIndex } from "./utils";

const credentials = {
	project_id: "green-456901",
	client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
	private_key: process.env.GOOGLE_PRIVATE_KEY!,
};

export type SheetsHeaderRow = [string, string, string, string, string, string];
export type SheetsRow = [string, number, string, string, boolean, string];

export default async function getSpreadSheet({ tz }: { tz: string }) {
	const session: Session | null = await getServerSession(authOptions);
	const accessToken = session?.accessToken;

	if (!accessToken) return { sheet: undefined, transactions: [] };

	const { email } = await getEmailFromToken(accessToken);
	// Token is directly from Google server, no spoofing possible
	const sheetIsOwnedByAuthTokenUser = `'${email}' in owners`;

	const auth = new google.auth.GoogleAuth({
		credentials,
		scopes: ["https://www.googleapis.com/auth/drive.metadata.readonly", "https://www.googleapis.com/auth/spreadsheets"],
	});

	const sheet = (
		await google.drive({ version: "v3", auth }).files.list({
			q: ["mimeType='application/vnd.google-apps.spreadsheet'", "trashed = false", sheetIsOwnedByAuthTokenUser].join(
				" AND ",
			),
			orderBy: "createdTime asc",
			pageSize: 1,
			fields: "files(id, name, owners, createdTime)",
		})
	).data.files?.map((file) => ({
		id: file.id,
		name: file.name,
		owners: file.owners?.map((o) => o.emailAddress).join(", "),
	}))?.[0];

	const transactions: Transaction[] = sheet?.id
		? await Promise.all(
				(
					((
						await google
							.sheets({ version: "v4", auth })
							.spreadsheets.values.get({ spreadsheetId: sheet.id, range: "Sheet1!A:Z" })
					).data.values ?? []) as [string, number, string, string, string, string][]
				)
					// skip headers
					.slice(1)
					.filter((_) =>
						z.tuple([
							z.string().nonempty(),
							z.number(),
							z.string(),
							z.literal("TRUE").or(z.literal("FALSE")),
							z.string().uuid(),
						]),
					)
					.map(async ([name, amount, date, recurrence, enabled, id]) => ({
						id:
							id ||
							/**
							 * Generate a UUID if one doesn't exist and then push it to the first sheets row which has an empty uuid field (an assumption we're forced to make)
							 */
							(await (async () => {
								const id = uuid();

								await updateSheetsRow({
									spreadsheetId: sheet.id!,
									filterValue: "",
									column: COLUMNS.UUID,
									cellValue: id,
								});

								return id;
							})()),
						name,
						amount: Number(amount),
						date: fromZonedTime(new Date(date) || new Date(), tz).getTime(),
						...(recurrence &&
							// todo: malformed recurrence graceful handling
							RRule.fromText(recurrence) && {
								freq: RRule.fromText(recurrence).options.freq,
								interval: RRule.fromText(recurrence).options.interval,
							}),
						disabled: enabled
							? enabled.toLowerCase() !== "true"
							: await (async () => {
									await updateSheetsRow({
										spreadsheetId: sheet.id!,
										filterColumn: id ? COLUMNS.UUID : COLUMNS.Enabled,
										filterValue: id ? id : "",
										column: COLUMNS.Enabled,
										// boolean value flipped because in the sheet we store the opposite: "enabled"
										cellValue: true,
									});

									// in the app we store "disabled"
									return false;
							  })(),
					})),
		  )
		: [];

	return { sheet, transactions };
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

export async function isSpreadsheetEmpty(spreadsheetId: string): Promise<boolean> {
	const auth = new google.auth.GoogleAuth({
		credentials,
		scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
	});

	const sheetsApi = google.sheets({ version: "v4", auth });

	// Fetch metadata so we know each sheet’s title
	const metaResp = await sheetsApi.spreadsheets.get({
		spreadsheetId,
		fields: "sheets(properties(title))",
	});

	const sheetProps = metaResp.data.sheets ?? [];
	if (sheetProps.length === 0) {
		// If there are no sheets at all, treat it as “empty.”
		return true;
	}

	// For each sheet‐tab, check if there are any values
	for (const s of sheetProps) {
		const title = s.properties?.title;
		if (!title) continue;

		// Request the entire sheet by using the sheet name as the “range”.
		// If there’s absolutely no data on that sheet, `values` will be undefined.
		const valuesResp = await sheetsApi.spreadsheets.values.get({
			spreadsheetId,
			range: `${title}`, // just the sheet name
			// (the Sheets API will return only the non‐empty rows/columns)
		});

		const rows = valuesResp.data.values;
		if (rows && rows.length > 0) {
			// Found at least one non-empty row/cell in this sheet → not empty
			return false;
		}
	}

	// If we fell through all tabs without finding any non-empty values, it’s empty
	return true;
}

/** Helper: load sheets client & first‐tab metadata */
async function getFirstSheet(spreadsheetId: string) {
	const auth = new google.auth.GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
	const sheetsApi = google.sheets({ version: "v4", auth });
	const { data: meta } = await sheetsApi.spreadsheets.get({
		spreadsheetId,
		fields: "sheets(properties(sheetId,title))",
	});
	const props = meta.sheets?.[0]?.properties;
	if (!props?.title || props.sheetId == null) {
		throw new Error("No sheets found in this spreadsheet");
	}
	return { sheetsApi, sheetName: props.title, sheetId: props.sheetId };
}

/** 1) Overwrite the first sheet with a 2D array of values */
export async function initSheet(spreadsheetId: string, data: [SheetsHeaderRow, ...SheetsRow[]]) {
	const { sheetsApi, sheetName } = await getFirstSheet(spreadsheetId);
	await sheetsApi.spreadsheets.values.update({
		spreadsheetId,
		range: `${sheetName}!A1`,
		valueInputOption: "USER_ENTERED",
		requestBody: { values: data },
	});
}

/** 2) Append a single row at the bottom of the first sheet */
export async function appendSheetsRow(spreadsheetId: string, row: SheetsRow) {
	const { sheetsApi, sheetName } = await getFirstSheet(spreadsheetId);
	await sheetsApi.spreadsheets.values.append({
		spreadsheetId,
		range: sheetName,
		valueInputOption: "USER_ENTERED",
		insertDataOption: "INSERT_ROWS",
		requestBody: { values: [row] },
	});
}

const findSheetRowIndex = async ({
	spreadsheetId,
	filterValue,
	filterColumn,
}: {
	spreadsheetId: string;
	filterValue: string | number;
	filterColumn?: string;
}) => {
	filterColumn = filterColumn ?? COLUMNS.UUID;

	// find the target row
	const { sheetsApi, sheetId, sheetName } = await getFirstSheet(spreadsheetId);
	const colRange = `${sheetName}!A:${filterColumn}`;
	const sheetsRows =
		(
			await sheetsApi.spreadsheets.values.get({
				spreadsheetId,
				range: colRange,
			})
		).data.values ?? [];

	const targetRowIndex = sheetsRows.findIndex((tx, i) => {
		// skip header
		if (i === 0) return;

		const colIndex = letterToIndex(filterColumn);
		const cell = tx[colIndex];
		return String(cell ?? "") === String(filterValue);
	});
	if (targetRowIndex < 0) throw new Error("No matching row found");

	return { sheetsApi, sheetId, sheetName, targetRowIndex };
};

/**
 *  Update the first row matching filterColumn=filterValue.
 *
 *  Overloads:
 *    • Single‐cell update:
 *        updateSheetsRow(id, "A", "foo", "C", 123)
 *    • Full‐row replace:
 *        updateSheetsRow(id, "A", "foo", [1,2,3,4])
 */
export async function updateSheetsRow(
	input: {
		spreadsheetId: string;
		filterColumn?: (typeof COLUMNS)[keyof typeof COLUMNS];
		filterValue: string | number;
	} & ({ column: string; cellValue: string | number | boolean } | { rowVal: SheetsRow }),
) {
	const { spreadsheetId, filterColumn, filterValue } = input;

	// args allow for updating a row or a cell
	const [column, cellValue] = "cellValue" in input ? [input.column, input.cellValue] : [undefined, undefined];
	const rowVal = "rowVal" in input ? input.rowVal : undefined;

	// determine range & payload
	const { sheetsApi, sheetName, targetRowIndex } = await findSheetRowIndex({
		filterValue,
		spreadsheetId,
		filterColumn,
	});

	const rowNum = targetRowIndex + 1; // index -> number (1 based)
	const { range, value } = rowVal
		? {
				range: (() => {
					const endCol = String.fromCharCode("A".charCodeAt(0) + rowVal.length - 1);
					return `${sheetName}!A${rowNum}:${endCol}${rowNum}`;
				})(),
				value: rowVal,
		  }
		: { range: `${sheetName}!${column}${rowNum}:${column}${rowNum}`, value: [cellValue] };

	// write back
	await sheetsApi.spreadsheets.values.update({
		spreadsheetId,
		range,
		valueInputOption: "USER_ENTERED",
		requestBody: { values: [value] },
	});
}

/**
 * Delete the *first* row where `filterColumn === filterValue` in the first sheet
 */
export async function deleteSheetsRow({
	spreadsheetId,
	filterValue,
	filterColumn,
}: {
	spreadsheetId: string;
	filterValue: string | number;
	filterColumn?: string;
}) {
	// find the target row
	const { sheetsApi, sheetId, targetRowIndex } = await findSheetRowIndex({
		filterValue,
		spreadsheetId,
		filterColumn,
	});

	const rowNum = targetRowIndex + 1; // index -> number (1 based)

	// delete via batchUpdate
	await sheetsApi.spreadsheets.batchUpdate({
		spreadsheetId,
		requestBody: {
			requests: [
				{
					deleteDimension: {
						range: {
							sheetId,
							dimension: "ROWS",
							startIndex: rowNum - 1, // zero‑based
							endIndex: rowNum, // non‑inclusive
						},
					},
				},
			],
		},
	});
}
