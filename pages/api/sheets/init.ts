// @ts-nocheck
import { google } from "googleapis";
import { getSession } from "next-auth/react";

export default async function handler(req, res) {
	// Check if the request is authenticated
	const session = await getSession({ req });
	if (!session || !session.accessToken) {
		return res.status(401).json({ error: "Not authenticated" });
	}

	try {
		// Setup the OAuth2 client with the access token from Next‑Auth
		const oauth2Client = new google.auth.OAuth2();
		oauth2Client.setCredentials({ access_token: session.accessToken });

		const sheets = google.sheets({ version: "v4", auth: oauth2Client });

		// Create a new spreadsheet for the user
		const createResponse = await sheets.spreadsheets.create({
			resource: {
				properties: {
					title: `Transactions for ${session.user.email}`,
				},
				sheets: [
					{
						properties: {
							title: "Transactions",
						},
					},
				],
			},
		});

		const spreadsheetId = createResponse.data.spreadsheetId;
		// In a real-world app you might persist the spreadsheet ID for later access.
		res.status(200).json({ spreadsheetId });
	} catch (error) {
		console.error("Error creating spreadsheet:", error);
		res.status(500).json({ error: error.message });
	}
}
