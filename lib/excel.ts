import * as XLSX from "xlsx"
import fs from "fs"
import path from "path"
import { DocumentSet } from "./models"

const isVercel = !!process.env.VERCEL
const baseDir = isVercel ? (process.env.TMPDIR || "/tmp") : process.cwd()
const DATA_DIR = path.join(baseDir, "data")
const EXCEL_PATH = path.join(DATA_DIR, "records.xlsx")

export const HEADERS = [
	"Sequence",
	// Passport Front
	"Passport Number",
	"First Name",
	"Last Name",
	"Nationality",
	"Sex",
	"Date Of Birth (Passport)",
	"Place Of Birth",
	"Place Of Issue",
	"Date Of Issue",
	"Date Of Expiry",
	"ImageUrl",
	// Passport Back
	"Father Name",
	"Mother Name",
	"Spouse Name",
	"Passport Address",
	"ImageUrl",
	// Aadhar
	"Aadhaar Number",
	"Aadhaar Name",
	"Aadhaar Date Of Birth",
	"Aadhaar Gender",
	"ImageUrl",
	// PAN
	"PAN Number",
	"PAN Name",
	"PAN Father Name",
	"PAN Date Of Birth",
	"ImageUrl",
]

function ensureWorkbook(): { wb: XLSX.WorkBook; ws: XLSX.WorkSheet } {
	if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
	if (!fs.existsSync(EXCEL_PATH)) {
		const wb = XLSX.utils.book_new()
		const ws = XLSX.utils.aoa_to_sheet([HEADERS])
		XLSX.utils.book_append_sheet(wb, ws, "records")
		const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer
		fs.writeFileSync(EXCEL_PATH, Buffer.from(buf))
	}
	const wb = XLSX.read(fs.readFileSync(EXCEL_PATH))
	let ws = wb.Sheets[wb.SheetNames[0]]

	// Ensure header row exists and matches our HEADERS
	const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]
	const hasHeader = rows.length > 0 && JSON.stringify(rows[0]) === JSON.stringify(HEADERS)
	if (!hasHeader) {
		const newWs = XLSX.utils.aoa_to_sheet([HEADERS, ...rows])
		wb.Sheets[wb.SheetNames[0]] = newWs
		const buf2 = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer
		fs.writeFileSync(EXCEL_PATH, Buffer.from(buf2))
		ws = newWs
	}

	return { wb, ws }
}

export function appendRowFromDocument(doc: DocumentSet) {
	try {
		const { wb, ws } = ensureWorkbook()
		const existing = XLSX.utils.sheet_to_json(ws)
		const seq = (existing?.length || 0) + 1

		const row = [
			seq,
			doc.passport_front?.passportNumber || "",
			doc.passport_front?.firstName || "",
			doc.passport_front?.lastName || "",
			doc.passport_front?.nationality || "",
			doc.passport_front?.sex || "",
			doc.passport_front?.dateOfBirth || "",
			doc.passport_front?.placeOfBirth || "",
			doc.passport_front?.placeOfIssue || "",
			doc.passport_front?.dateOfIssue || "",
			doc.passport_front?.dateOfExpiry || "",
			doc.passport_front?.imageUrl || "",
			doc.passport_back?.fatherName || "",
			doc.passport_back?.motherName || "",
			doc.passport_back?.spouseName || "",
			doc.passport_back?.address || "",
			doc.passport_back?.imageUrl || "",
			doc.aadhar?.aadhaarNumber || "",
			doc.aadhar?.name || "",
			doc.aadhar?.dateOfBirth || "",
			doc.aadhar?.gender || "",
			doc.aadhar?.imageUrl || "",
			doc.pan?.panNumber || "",
			doc.pan?.name || "",
			doc.pan?.fatherName || "",
			doc.pan?.dateOfBirth || "",
			doc.pan?.imageUrl || "",
		]

		const wsRange = XLSX.utils.decode_range(ws['!ref'] as string)
		const newRowIndex = wsRange.e.r + 1
		XLSX.utils.sheet_add_aoa(ws, [row], { origin: { r: newRowIndex, c: 0 } })
		const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer
		fs.writeFileSync(EXCEL_PATH, Buffer.from(buf))
	} catch (error: any) {
		console.error("[excel] append error:", error?.message)
		// Non-critical: do not throw to keep API response successful
	}
}

export function getExcelFileBuffer(): Buffer {
	const { wb } = ensureWorkbook()
	return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer
} 