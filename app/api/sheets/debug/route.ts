import { NextRequest } from "next/server"
import { google } from "googleapis"
import { HEADERS } from "@/lib/excel"

export const runtime = "nodejs"

function normalizePrivateKey(raw: string): string {
	let key = (raw || "").trim()
	if (!key) return key
	if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
		key = key.slice(1, -1)
	}
	key = key.replace(/\\n/g, "\n").replace(/\r/g, "")
	if (key.includes("BEGIN PRIVATE KEY") || key.includes("BEGIN RSA PRIVATE KEY")) {
		return key
	}
	try {
		const decoded = Buffer.from(key, "base64").toString("utf8")
		if (decoded.includes("BEGIN PRIVATE KEY") || decoded.includes("BEGIN RSA PRIVATE KEY")) {
			return decoded.replace(/\r/g, "")
		}
	} catch {}
	return key
}

function getAuth() {
	const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
	let key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
	if (!email || !key) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL/KEY")
	key = normalizePrivateKey(key)
	return new google.auth.JWT({ email, key, scopes: ["https://www.googleapis.com/auth/spreadsheets"] })
}

export async function GET(req: NextRequest) {
	try {
		const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
		const sheetTitle = process.env.GOOGLE_SHEETS_SHEET_NAME || "records"
		if (!spreadsheetId) throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID not set")
		const auth = getAuth()
		const sheets = google.sheets({ version: "v4", auth })

		// Check spreadsheet access and sheet presence
		const meta = await sheets.spreadsheets.get({ spreadsheetId })
		const titles = (meta.data.sheets || []).map((s) => s.properties?.title)
		const hasSheet = titles.includes(sheetTitle)

		// Check header row
		let headerOk = false
		try {
			const hdr = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetTitle}!A1:Z1` })
			headerOk = JSON.stringify(hdr.data.values?.[0] || []) === JSON.stringify(HEADERS)
		} catch {}

		// Compute next sequence via A2:A length
		let nextSeq: number | null = null
		try {
			const data = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetTitle}!A2:A` })
			nextSeq = (data.data.values?.length || 0) + 1
		} catch {}

		const url = new URL(req.url)
		const doAppend = url.searchParams.get("append") === "1"
		let appended = false
		if (doAppend) {
			if (!hasSheet) {
				await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [{ addSheet: { properties: { title: sheetTitle } } }] } })
			}
			if (!headerOk) {
				await sheets.spreadsheets.values.update({ spreadsheetId, range: `${sheetTitle}!A1`, valueInputOption: "RAW", requestBody: { values: [HEADERS] } })
			}
			const now = new Date().toISOString()
			const seq = nextSeq || 1
			await sheets.spreadsheets.values.append({
				spreadsheetId,
				range: `${sheetTitle}!A1`,
				valueInputOption: "RAW",
				requestBody: { values: [[seq, "Test", "Row", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", `debug:${now}`]] },
			})
			appended = true
		}

		return Response.json({ ok: true, spreadsheetId, sheetTitle, hasSheet, headerOk, nextSeq, titles, appended })
	} catch (e: any) {
		return Response.json({ ok: false, error: e?.message }, { status: 500 })
	}
} 