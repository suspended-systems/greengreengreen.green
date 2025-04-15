// @ts-nocheck
import { google } from "googleapis";
import { getSession } from "next-auth/react";

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const { spreadsheetId, transactions } = req.body;
	if (!spreadsheetId || !Array.isArray(transactions)) {
		return res.status(400).json({ error: "Invalid request data" });
	}

	const session = await getSession({ req });
	if (!session || !session.accessToken) {
		return res.status(401).json({ error: "Not authenticated" });
	}

	try {
		const oauth2Client = new google.auth.OAuth2();
		oauth2Client.setCredentials({ access_token: session.accessToken });

		const sheets = google.sheets({ version: "v4", auth: oauth2Client });

		// Generate header row from the first transaction object keys (if any)
		let headers = [];
		if (transactions.length > 0) {
			headers = Object.keys(transactions[0]);
		}

		// Build rows: first row is headers, subsequent rows are transaction values
		const rows = [headers];
		transactions.forEach((tx) => {
			// Map each header to the corresponding value (or an empty string if missing)
			const row = headers.map((key) => tx[key] || "");
			rows.push(row);
		});

		// Define the starting range for the data (assumes sheet named "Transactions")
		const range = "Transactions!A1";

		// Update the sheet using the Google Sheets API
		const response = await sheets.spreadsheets.values.update({
			spreadsheetId,
			range,
			valueInputOption: "RAW",
			resource: { values: rows },
		});

		res.status(200).json(response.data);
	} catch (error) {
		console.error("Error updating spreadsheet:", error);
		res.status(500).json({ error: error.message });
	}
}
