import * as XLSX from "xlsx"
import fs from "fs"
import path from "path"
import { DocumentSet } from "./models"

const isVercel = !!process.env.VERCEL
const baseDir = isVercel ? (process.env.TMPDIR || "/tmp") : process.cwd()
const DATA_DIR = path.join(baseDir, "data")
const EXCEL_PATH = path.join(DATA_DIR, "records.xlsx")

export const HEADERS = [
	"NO",
	"PAN Number",
	"Aadhaar Number",
	"Aadhaar Name",
	"Sex",
	"Full Name (Passport)",
	"Last Name",
	"Passport No.",
	"Nationality",
	"DOB",
	"D.O.Issue",
	"D.O.Expire",
	"Mobile Number",
	"Email",
	"REF",
	"FF 6E",
	"FF EK",
	"FF EY",
	"FF SQ",
	"FF AI",
	"Father Name",
	"Mother Name",
	"Spouse Name",
	"Place Of Birth",
	"Place Of Issue",
	"PAN Name",
	"Passport Address",
	"Passport Front Image URL",
	"Passport Back Image URL",
	"Aadhaar Image URL",
	"PAN Image URL",
	// New column for traveler photo
	"Traveler Photo URL",
]

function ensureWorkbook(): { wb: XLSX.WorkBook; ws: XLSX.WorkSheet } {
	if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
	let wb: XLSX.WorkBook
	let ws: XLSX.WorkSheet
	if (fs.existsSync(EXCEL_PATH)) {
		wb = XLSX.readFile(EXCEL_PATH)
		ws = wb.Sheets[wb.SheetNames[0]]
		if (!ws) {
			ws = XLSX.utils.aoa_to_sheet([HEADERS])
			XLSX.utils.book_append_sheet(wb, ws, "records")
		}
	} else {
		wb = XLSX.utils.book_new()
		ws = XLSX.utils.aoa_to_sheet([HEADERS])
		XLSX.utils.book_append_sheet(wb, ws, "records")
		const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer
		fs.writeFileSync(EXCEL_PATH, Buffer.from(buf))
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
			doc.pan?.panNumber || "",
			doc.aadhar?.aadhaarNumber || "",
			doc.aadhar?.name || "",
			doc.passport_front?.sex || "",
			doc.passport_front?.firstName || "",
			doc.passport_front?.lastName || "",
			doc.passport_front?.passportNumber || "",
			doc.passport_front?.nationality || "",
			doc.passport_front?.dateOfBirth || "",
			doc.passport_front?.dateOfIssue || "",
			doc.passport_front?.dateOfExpiry || "",
			((doc as any).passport_back?.mobileNumber) || "",
			((doc as any).passport_back?.email) || "",
			((doc as any).passport_back?.ref) || "",
			((doc as any).passport_back?.ff6E) || "",
			((doc as any).passport_back?.ffEK) || "",
			((doc as any).passport_back?.ffEY) || "",
			((doc as any).passport_back?.ffSQ) || "",
			((doc as any).passport_back?.ffAI) || "",
			doc.passport_back?.fatherName || "",
			doc.passport_back?.motherName || "",
			doc.passport_back?.spouseName || "",
			doc.passport_front?.placeOfBirth || "",
			doc.passport_front?.placeOfIssue || "",
			doc.pan?.name || "",
			doc.passport_back?.address || "",
			doc.passport_front?.imageUrl || "",
			doc.passport_back?.imageUrl || "",
			doc.aadhar?.imageUrl || "",
			doc.pan?.imageUrl || "",
			// New traveler photo
			doc.photo?.imageUrl || "",
		]

		const wsRange = XLSX.utils.decode_range(ws['!ref'] as string)
		const newRowIndex = wsRange.e.r + 1
		XLSX.utils.sheet_add_aoa(ws, [row], { origin: { r: newRowIndex, c: 0 } })
		const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer
		fs.writeFileSync(EXCEL_PATH, Buffer.from(buf))
	}
	catch {}
}

export function getExcelFileBuffer(): Buffer {
	const { wb } = ensureWorkbook()
	return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer
}

export function buildExcelBufferFromDocuments(documents: DocumentSet[]): Buffer {
	const wb = XLSX.utils.book_new()
	const rows: any[][] = [HEADERS]

	documents.forEach((doc, index) => {
		rows.push(buildRowFromDocument(doc as any, index + 1))
	})

	const ws = XLSX.utils.aoa_to_sheet(rows)
	XLSX.utils.book_append_sheet(wb, ws, "records")
	return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer
}

export function buildRowFromDocument(doc: DocumentSet, sequence: number) {
	return [
		sequence,
		doc.pan?.panNumber || "",
		doc.aadhar?.aadhaarNumber || "",
		doc.aadhar?.name || "",
		doc.passport_front?.sex || "",
		doc.passport_front?.firstName || "",
		doc.passport_front?.lastName || "",
		doc.passport_front?.passportNumber || "",
		doc.passport_front?.nationality || "",
		doc.passport_front?.dateOfBirth || "",
		doc.passport_front?.dateOfIssue || "",
		doc.passport_front?.dateOfExpiry || "",
		((doc as any).passport_back?.mobileNumber) || "",
		((doc as any).passport_back?.email) || "",
		((doc as any).passport_back?.ref) || "",
		((doc as any).passport_back?.ff6E) || "",
		((doc as any).passport_back?.ffEK) || "",
		((doc as any).passport_back?.ffEY) || "",
		((doc as any).passport_back?.ffSQ) || "",
		((doc as any).passport_back?.ffAI) || "",
		doc.passport_back?.fatherName || "",
		doc.passport_back?.motherName || "",
		doc.passport_back?.spouseName || "",
		doc.passport_front?.placeOfBirth || "",
		doc.passport_front?.placeOfIssue || "",
		doc.pan?.name || "",
		doc.passport_back?.address || "",
		doc.passport_front?.imageUrl || "",
		doc.passport_back?.imageUrl || "",
		doc.aadhar?.imageUrl || "",
		doc.pan?.imageUrl || "",
		// New traveler photo
		doc.photo?.imageUrl || "",
	]
}

// New: update an existing row by sequence number (1-indexed for data rows)
export function updateRowFromDocument(sequence: number, doc: DocumentSet) {
	try {
		const { wb, ws } = ensureWorkbook()
		// Row index in sheet: +1 header, + (sequence)
		const rowIndex = 1 + sequence // A2 = seq 1
		const row = buildRowFromDocument(doc, sequence)
		XLSX.utils.sheet_add_aoa(ws, [row], { origin: { r: rowIndex, c: 0 } })
		const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer
		fs.writeFileSync(EXCEL_PATH, Buffer.from(buf))
	} catch {}
} 
