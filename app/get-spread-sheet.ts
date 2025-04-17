"use server";
import { google } from "googleapis";
import { APP_NAME } from "./utils";
import { getServerSession } from "next-auth";
import { authOptions } from "../pages/api/auth/[...nextauth]";

export default async function getSpreadSheet() {
	const session = await getServerSession(authOptions);
	// @ts-ignore
	const accessToken = session?.accessToken;

	if (!accessToken) return [];
	const { email } = await getEmailFromToken(accessToken);

	const auth = new google.auth.GoogleAuth({
		keyFile: "./green-google-service-account.json",
		scopes: ["https://www.googleapis.com/auth/drive.metadata.readonly"],
	});
	const drive = google.drive({ version: "v3", auth });

	// Build your query
	const q = [
		"mimeType='application/vnd.google-apps.spreadsheet'",
		"trashed = false",
		`'${email}' in owners`,
		`name = '${APP_NAME}'`,
	].join(" AND ");

	const res = await drive.files.list({
		q,
		orderBy: "createdTime asc",
		pageSize: 1,
		fields: "files(id, name, owners, createdTime)",
	});

	return res.data.files?.map((file) => ({
		id: file.id,
		name: file.name,
		owners: file.owners?.map((o) => o.emailAddress).join(", "),
	}));

	// try {
	// 	await doc.loadInfo();

	// 	const sheet = doc.sheetsByIndex[0];
	// 	const rows = await sheet.getRows();

	// 	const allValues = [
	// 		{
	// 			name: "Frontend Development",
	// 			id: "frontend_development",
	// 		},
	// 		{
	// 			name: "Software Development",
	// 			id: "software_development",
	// 		},
	// 		{
	// 			name: "Cloud Services",
	// 			id: "cloud_services",
	// 		},
	// 		{
	// 			name: "Machine Learning",
	// 			id: "1",
	// 		},
	// 	].map((value) => {
	// 		const { name, id } = value;
	// 		return {
	// 			name: name,
	// 			count: Number(rows[0].get(id)),
	// 		};
	// 	});

	// 	const total = allValues.reduce((values, value) => values + value.count, 0);
	// 	const max = Math.max(...allValues.map((item) => item.count));

	// 	const results = allValues.map((result, index) => {
	// 		const { name, count } = result;
	// 		return {
	// 			value: name,
	// 			count: count,
	// 			percent: Number((count * 100) / total).toFixed(1),
	// 			max: max,
	// 		};
	// 	});

	// 	return {
	// 		total: total,
	// 		results: results,
	// 	};
	// } catch (error) {
	// 	console.error(error);
	// 	return {
	// 		total: 0,
	// 		results: [],
	// 	};
	// }
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
