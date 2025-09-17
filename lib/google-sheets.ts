import { google } from "googleapis"
import type { DocumentSet } from "./models"
import { HEADERS, buildRowFromDocument } from "./excel"

export type SheetsRow = any[]

function getAuth() {
	const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
	let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
	if (!clientEmail || !privateKey) {
		throw new Error("Google Sheets credentials missing. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_KEY")
	}
	// Handle escaped newlines from env
	privateKey = privateKey.replace(/\\n/g, "\n")
	return new google.auth.JWT({
		email: clientEmail,
		key: privateKey,
		scopes: ["https://www.googleapis.com/auth/spreadsheets"],
	})
}

function getSheetsClient(auth: any) {
	return google.sheets({ version: "v4", auth })
}

async function getOrCreateSheet(spreadsheetId: string, desiredTitle: string | undefined, auth: any): Promise<{ title: string; sheetId: number }> {
	const sheets = getSheetsClient(auth)
	const meta = await sheets.spreadsheets.get({ spreadsheetId })
	const allSheets = meta.data.sheets || []
	if (desiredTitle) {
		const found = allSheets.find((s) => s.properties?.title === desiredTitle)
		if (found?.properties?.title && typeof found.properties.sheetId === "number") {
			return { title: found.properties.title, sheetId: found.properties.sheetId }
		}
		// create the sheet
		const createResp = await sheets.spreadsheets.batchUpdate({
			spreadsheetId,
			requestBody: { requests: [{ addSheet: { properties: { title: desiredTitle } } }] },
		})
		const reply = createResp.data.replies?.[0]?.addSheet?.properties
		if (reply?.title && typeof reply.sheetId === "number") {
			return { title: reply.title, sheetId: reply.sheetId }
		}
		// fallback: re-fetch
		const meta2 = await sheets.spreadsheets.get({ spreadsheetId })
		const created = (meta2.data.sheets || []).find((s) => s.properties?.title === desiredTitle)
		if (!created?.properties?.title || typeof created.properties.sheetId !== "number") throw new Error("Failed to create sheet")
		return { title: created.properties.title, sheetId: created.properties.sheetId }
	}
	// fallback to first sheet
	const first = allSheets[0]?.properties
	if (!first?.title || typeof first.sheetId !== "number") throw new Error("No sheets found in spreadsheet")
	return { title: first.title, sheetId: first.sheetId }
}

async function formatHeaderRow(spreadsheetId: string, sheetId: number, auth: any) {
	const sheets = getSheetsClient(auth)
	const requests: any[] = [
		{
			updateSheetProperties: {
				properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
				fields: "gridProperties.frozenRowCount",
			},
		},
		{
			repeatCell: {
				range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: HEADERS.length },
				cell: {
					userEnteredFormat: {
						textFormat: { bold: true },
						backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
						horizontalAlignment: "CENTER",
						wrapStrategy: "WRAP",
						padding: { top: 2, bottom: 2, left: 4, right: 4 },
					},
				},
				fields: "userEnteredFormat(textFormat,horizontalAlignment,backgroundColor,wrapStrategy,padding)",
			},
		},
	]
	await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } })
}

async function ensureHeadersAndGetNextSequence(spreadsheetId: string, sheetTitle: string, sheetId: number, auth: any) {
	const sheets = getSheetsClient(auth)
	const getResp = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetTitle}!A1:Z1` })
	const firstRow = getResp.data.values?.[0] || []
	let hasHeader = firstRow.length > 0 && JSON.stringify(firstRow) === JSON.stringify(HEADERS)
	if (!hasHeader) {
		await sheets.spreadsheets.values.update({
			spreadsheetId,
			range: `${sheetTitle}!A1`,
			valueInputOption: "RAW",
			requestBody: { values: [HEADERS] },
		})
	}
	// apply header formatting (idempotent)
	await formatHeaderRow(spreadsheetId, sheetId, auth)
	// Count data rows below header
	const dataResp = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetTitle}!A2:A` })
	const numDataRows = (dataResp.data.values?.length || 0)
	const nextSeq = numDataRows + 1
	return { nextSeq }
}

export async function appendRowToSheet(row: SheetsRow, sheetNameParam?: string) {
	const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
	if (!spreadsheetId) throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID is not set")
	const auth = getAuth()
	const desiredTitle = sheetNameParam || process.env.GOOGLE_SHEETS_SHEET_NAME || "records"
	const { title, sheetId } = await getOrCreateSheet(spreadsheetId, desiredTitle, auth)
	const sheets = getSheetsClient(auth)
	// ensure header formatting exists
	await ensureHeadersAndGetNextSequence(spreadsheetId, title, sheetId, auth)
	await sheets.spreadsheets.values.append({
		spreadsheetId,
		range: `${title}!A1`,
		valueInputOption: "RAW",
		requestBody: { values: [row] },
	})
}

export async function appendDocumentToSheet(doc: DocumentSet, sheetNameParam?: string) {
	const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
	if (!spreadsheetId) throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID is not set")
	const auth = getAuth()
	const desiredTitle = sheetNameParam || process.env.GOOGLE_SHEETS_SHEET_NAME || "records"
	const { title, sheetId } = await getOrCreateSheet(spreadsheetId, desiredTitle, auth)
	const { nextSeq } = await ensureHeadersAndGetNextSequence(spreadsheetId, title, sheetId, auth)
	const row = buildRowFromDocument(doc, nextSeq)
	const sheets = getSheetsClient(auth)
	await sheets.spreadsheets.values.append({
		spreadsheetId,
		range: `${title}!A1`,
		valueInputOption: "RAW",
		requestBody: { values: [row] },
	})
}

// New: find and update helpers
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

export type SheetMatch = { sequence: number; rowIndex: number; values: string[] }

export async function findRowsByQuery(query: string, sheetNameParam?: string): Promise<SheetMatch[]> {
	const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
	if (!spreadsheetId) throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID is not set")
	const auth = getAuth()
	const desiredTitle = sheetNameParam || process.env.GOOGLE_SHEETS_SHEET_NAME || "records"
	const { title } = await getOrCreateSheet(spreadsheetId, desiredTitle, auth)
	const sheets = getSheetsClient(auth)
	const lastColLetter = columnNumberToA1Column(HEADERS.length)
	const resp = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${title}!A2:${lastColLetter}` })
	const rows: string[][] = (resp.data.values as any) || []
	const q = query.trim().toLowerCase()
	const matches: SheetMatch[] = []
	rows.forEach((vals, idx) => {
		const seqStr = vals[0] || ""
		const hay = vals.join(" \u0001 ").toLowerCase()
		if (q && hay.includes(q)) {
			const sequence = Number(seqStr) || (idx + 1)
			matches.push({ sequence, rowIndex: idx + 2, values: vals })
		}
	})
	return matches
}

export function mapRowToDocument(values: string[]): DocumentSet {
	// Align strictly with HEADERS ordering. Only map fields that have a dedicated column.
	return {
		pan: {
			panNumber: values[1] || "",
			name: values[25] || "",
			fatherName: "",
			dateOfBirth: "",
			imageUrl: values[30] || "",
		} as any,
		aadhar: {
			aadhaarNumber: values[2] || "",
			name: values[3] || "",
			// Sheet stores a single DOB column; use it if present, else blank
			dateOfBirth: values[9] || "",
			// No dedicated gender/address columns for Aadhaar in sheet; keep blank
			gender: "",
			address: "",
			imageUrl: values[29] || "",
		} as any,
		passport_front: {
			sex: values[4] || "",
			firstName: values[5] || "",
			lastName: values[6] || "",
			passportNumber: values[7] || "",
			nationality: values[8] || "",
			dateOfBirth: values[9] || "",
			dateOfIssue: values[10] || "",
			dateOfExpiry: values[11] || "",
			placeOfBirth: values[23] || "",
			placeOfIssue: values[24] || "",
			imageUrl: values[27] || "",
		} as any,
		passport_back: {
			fatherName: values[20] || "",
			motherName: values[21] || "",
			spouseName: values[22] || "",
			address: values[26] || "",
			email: values[13] || "",
			mobileNumber: values[12] || "",
			ref: values[14] || "",
			ff6E: values[15] || "",
			ffEK: values[16] || "",
			ffEY: values[17] || "",
			ffSQ: values[18] || "",
			ffAI: values[19] || "",
			imageUrl: values[28] || "",
		} as any,
		photo: { imageUrl: values[31] || "" } as any,
	} as any
}

export async function updateRowFromDocument(sequence: number, doc: DocumentSet, sheetNameParam?: string) {
	const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
	if (!spreadsheetId) throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID is not set")
	const auth = getAuth()
	const desiredTitle = sheetNameParam || process.env.GOOGLE_SHEETS_SHEET_NAME || "records"
	const { title } = await getOrCreateSheet(spreadsheetId, desiredTitle, auth)
	const sheets = getSheetsClient(auth)
	const lastColLetter = columnNumberToA1Column(HEADERS.length)
	const row = buildRowFromDocument(doc, sequence)
	const range = `${title}!A${sequence + 1}:${lastColLetter}${sequence + 1}`
	await sheets.spreadsheets.values.update({
		spreadsheetId,
		range,
		valueInputOption: "RAW",
		requestBody: { values: [row] },
	})
} 