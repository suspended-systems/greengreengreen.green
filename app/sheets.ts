"use server";
import { google } from "googleapis";
// import { APP_NAME } from "./utils";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "../pages/api/auth/[...nextauth]";
import { Transaction } from "./transactions";
import { RRule } from "rrule";
import { z } from "zod";

const keyFile = "./green-google-service-account.json";

export default async function getSpreadSheet() {
	const session: Session | null = await getServerSession(authOptions);
	const accessToken = session?.accessToken;

	if (!accessToken) return { sheet: undefined, transactions: [] };

	const { email } = await getEmailFromToken(accessToken);

	const auth = new google.auth.GoogleAuth({
		keyFile,
		scopes: ["https://www.googleapis.com/auth/drive.metadata.readonly", "https://www.googleapis.com/auth/spreadsheets"],
	});

	const sheet = (
		await google.drive({ version: "v3", auth }).files.list({
			q: [
				"mimeType='application/vnd.google-apps.spreadsheet'",
				"trashed = false",
				`'${email}' in owners`,
				// `name = '${APP_NAME}'`,
			].join(" AND "),
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
		? (
				((
					await google
						.sheets({ version: "v4", auth })
						.spreadsheets.values.get({ spreadsheetId: sheet.id, range: "Sheet1!A:Z" })
				).data.values ?? []) as [string, number, string, string, string][]
		  )
				// skip headers
				.slice(1)
				.filter((_) => z.tuple([z.string().nonempty(), z.number(), z.string(), z.string()]))
				.map(([name, amount, date, recurrence, enabled]) => ({
					name,
					amount: Number(amount),
					date: new Date(date).getTime(),
					...(recurrence &&
						// todo: verify malformed recurrence is handled gracefully
						RRule.fromText(recurrence) && {
							freq: RRule.fromText(recurrence).options.freq,
							interval: RRule.fromText(recurrence).options.interval,
						}),
					disabled: enabled.toLowerCase() !== "true",
				}))
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

export async function isSheetContentUnedited(fileId: string): Promise<boolean> {
	// If you don't pass an authClient, this will pick up your default credentials
	const auth = new google.auth.GoogleAuth({
		keyFile,
		scopes: [
			"https://www.googleapis.com/auth/drive.readonly",
			"https://www.googleapis.com/auth/drive.activity.readonly",
		],
	});

	// 1) Fetch content revisions
	const revisions =
		(
			await google.drive({ version: "v3", auth }).revisions.list({
				fileId,
				fields: "revisions(id)",
			})
		).data.revisions ?? [];

	// If there's more than one revision, content has been edited
	if (revisions.length > 1) {
		return false;
	}

	// 2) (Optional) Double‑check via Drive Activity API for EDIT actions
	const activities =
		(
			await google.driveactivity({ version: "v2", auth }).activity.query({
				requestBody: {
					itemName: `items/${fileId}`,
					filter: "detail.action_detail_case:EDIT",
					pageSize: 1, // we only need to know if at least one exists
				},
			})
		).data.activities ?? [];

	// If any EDIT event exists, content was edited
	// except we allow for the first edit being the sharing with green
	// todo: this could be a lot better, for example it would fail right now if user edited anything by accident
	// really probably would be better just to check created time
	return activities.length > 1;
}

/** Helper: load sheets client & first‐tab metadata */
async function getFirstSheet(spreadsheetId: string) {
	const auth = new google.auth.GoogleAuth({ keyFile, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
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
export async function initSheet(
	spreadsheetId: string,
	data: [[string, string, string, string, string], ...[string, number, string, string, boolean][]],
) {
	const { sheetsApi, sheetName } = await getFirstSheet(spreadsheetId);
	await sheetsApi.spreadsheets.values.update({
		spreadsheetId,
		range: `${sheetName}!A1`,
		valueInputOption: "USER_ENTERED",
		requestBody: { values: data },
	});
}

/** 2) Append a single row at the bottom of the first sheet */
export async function appendSheetsRow(spreadsheetId: string, row: [string, number, string, string, boolean]) {
	const { sheetsApi, sheetName } = await getFirstSheet(spreadsheetId);
	await sheetsApi.spreadsheets.values.append({
		spreadsheetId,
		range: sheetName,
		valueInputOption: "USER_ENTERED",
		insertDataOption: "INSERT_ROWS",
		requestBody: { values: [row] },
	});
}

/**
 *  Update the first row matching filterColumn=filterValue.
 *
 *  Overloads:
 *    • Single‐cell update:
 *        updateSheetsRow(id, "A", "foo", "C", 123)
 *    • Full‐row replace:
 *        updateSheetsRow(id, "A", "foo", [1,2,3,4])
 */
export async function updateSheetsRow({
	spreadsheetId,
	columnOrRow,
	filterValue,
	filterColumn,
	newValue,
}: {
	spreadsheetId: string;
	filterColumn?: string;
	filterValue: string | number;
	columnOrRow: string | [string, number, string, string, boolean];
	newValue?: string | number | boolean;
}) {
	filterColumn = filterColumn ?? "A";

	const { sheetsApi, sheetName } = await getFirstSheet(spreadsheetId);

	// 1) pull only the filter column (including header)
	const colRange = `${sheetName}!${filterColumn}:${filterColumn}`;
	const { data } = await sheetsApi.spreadsheets.values.get({
		spreadsheetId,
		range: colRange,
	});
	const vals = (data.values || []).slice(1); // drop header
	const idx = vals.findIndex(([cell]) => String(cell) === String(filterValue));
	if (idx < 0) throw new Error("No matching row found");
	const rowNum = idx + 2; // account for header + 1‑based

	// 2) decide which range & payload
	let range: string;
	let values: any[][];

	if (typeof columnOrRow === "string" && newValue !== undefined) {
		// single‐cell
		range = `${sheetName}!${columnOrRow}${rowNum}:${columnOrRow}${rowNum}`;
		values = [[newValue]];
	} else if (Array.isArray(columnOrRow) && newValue === undefined) {
		// full‐row
		const newRow = columnOrRow;
		const endCol = String.fromCharCode("A".charCodeAt(0) + newRow.length - 1);
		range = `${sheetName}!A${rowNum}:${endCol}${rowNum}`;
		values = [newRow];
	} else {
		throw new Error("Invalid args: call as (…, colLetter, value) or (…, newRowArray)");
	}

	// 3) write back
	await sheetsApi.spreadsheets.values.update({
		spreadsheetId,
		range,
		valueInputOption: "USER_ENTERED",
		requestBody: { values },
	});
}

/**
 * 4) Delete the *first* row where `filterColumn === filterValue`
 *    in the first sheet
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
	filterColumn = filterColumn ?? "A";

	const { sheetsApi, sheetName, sheetId } = await getFirstSheet(spreadsheetId);

	// 1) locate the row number
	const colRange = `${sheetName}!${filterColumn}:${filterColumn}`;
	const { data } = await sheetsApi.spreadsheets.values.get({
		spreadsheetId,
		range: colRange,
	});
	const vals = (data.values || []).slice(1);
	const idx = vals.findIndex(([cell]) => String(cell) === String(filterValue));
	if (idx < 0) throw new Error("No matching row found");
	const rowNum = idx + 2; // header + 1‑based

	// 2) delete via batchUpdate
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
