import { google } from "googleapis"
import { HEADERS, buildRowFromDocument } from "../lib/excel"
import { mapRowToDocument } from "../lib/google-sheets"

function columnNumberToA1Column(n: number): string {
	let result = ""
	let num = n
	while (num > 0) {
		num--
		result = String.fromCharCode(65 + (num % 26)) + result
		num = Math.floor(num / 26)
	}
	return result
}

async function normalizeLegacyRows() {
	const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
	const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
	const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
	if (!spreadsheetId || !serviceAccountEmail || !serviceAccountKey) {
		throw new Error("Missing GOOGLE_SHEETS_SPREADSHEET_ID or Google service account credentials")
	}
	const privateKey = serviceAccountKey.replace(/\\n/g, "\n")
	const auth = new google.auth.JWT({
		email: serviceAccountEmail,
		key: privateKey,
		scopes: ["https://www.googleapis.com/auth/spreadsheets"],
	})
	const sheets = google.sheets({ version: "v4", auth })
	const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || "records"

	const headerResp = await sheets.spreadsheets.values.get({
		spreadsheetId,
		range: `${sheetName}!A1:ZZ1`,
	})
	const headers = (headerResp.data.values?.[0] || []) as string[]

	if (!headers.length) {
		throw new Error("Unable to read header row from Google Sheet")
	}

	const lastColLetter = columnNumberToA1Column(Math.max(HEADERS.length, headers.length))
	const dataResp = await sheets.spreadsheets.values.get({
		spreadsheetId,
		range: `${sheetName}!A2:${lastColLetter}`,
	})
	const rows = (dataResp.data.values as string[][]) || []

	const updates = rows
		.map((row, idx) => {
			const hasData = row.some((cell) => cell !== undefined && cell !== null && String(cell).trim() !== "")
			if (!hasData) return null
			const sequence = idx + 1
			const document = mapRowToDocument(row, headers)
			const normalizedRow = buildRowFromDocument(document, sequence)
			return {
				range: `${sheetName}!A${sequence + 1}:${lastColLetter}${sequence + 1}`,
				values: [normalizedRow],
			}
		})
		.filter(Boolean) as { range: string; values: string[][] }[]

	if (!updates.length) {
		console.log("No legacy rows needed updating")
		return
	}

	await sheets.spreadsheets.values.batchUpdate({
		spreadsheetId,
		requestBody: {
			valueInputOption: "RAW",
			data: updates,
		},
	})

	console.log(`Normalized ${updates.length} ${updates.length === 1 ? "row" : "rows"} in ${sheetName}`)
}

normalizeLegacyRows().catch((err) => {
	console.error("Failed to normalize legacy rows:", err)
	process.exitCode = 1
})

