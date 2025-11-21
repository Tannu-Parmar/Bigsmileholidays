import * as XLSX from "xlsx"
import fs from "fs"
import path from "path"
import { DocumentSet } from "./models"

const isVercel = !!process.env.VERCEL
const baseDir = isVercel ? (process.env.TMPDIR || "/tmp") : process.cwd()
const DATA_DIR = path.join(baseDir, "data")
const EXCEL_PATH = path.join(DATA_DIR, "records.xlsx")
const EXCEL_TMP_PATH = path.join(DATA_DIR, "records.xlsx.tmp")

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
	"FF QR",
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
	// Payment status
	"Payment Complete",
]

function ensureWorkbook(): { wb: XLSX.WorkBook; ws: XLSX.WorkSheet } {
	if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

	if (!fs.existsSync(EXCEL_PATH)) {
		return createWorkbookWithHeaders()
	}

	try {
		const stats = fs.statSync(EXCEL_PATH)
		if (stats.size === 0) {
			return createWorkbookWithHeaders()
		}
	} catch {
		// If stat fails, rebuild workbook
		return createWorkbookWithHeaders()
	}

	try {
		const wb = XLSX.readFile(EXCEL_PATH)
		let ws = wb.Sheets[wb.SheetNames[0]]
		if (!ws) {
			ws = XLSX.utils.aoa_to_sheet([HEADERS])
			XLSX.utils.book_append_sheet(wb, ws, "records")
		}
		return { wb, ws }
	} catch (err) {
		console.error("[excel] failed to read workbook, recreating:", err)
		return createWorkbookWithHeaders()
	}
}

function createWorkbookWithHeaders(): { wb: XLSX.WorkBook; ws: XLSX.WorkSheet } {
	const wb = XLSX.utils.book_new()
	const ws = XLSX.utils.aoa_to_sheet([HEADERS])
	XLSX.utils.book_append_sheet(wb, ws, "records")
	const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer
	writeExcelBufferWithRetry(Buffer.from(buf))
	return { wb, ws }
}

function sleep(ms: number) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function writeExcelBufferWithRetry(buffer: Buffer, options?: { attempts?: number; delayMs?: number }) {
    const attempts = options?.attempts ?? 5
    const baseDelayMs = options?.delayMs ?? 150

    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            // Write to a temp file first to minimize lock window, then rename atomically
            fs.writeFileSync(EXCEL_TMP_PATH, buffer)
            fs.renameSync(EXCEL_TMP_PATH, EXCEL_PATH)
            return
        } catch (err: any) {
            const code = err?.code
            const isLockLike = code === "EBUSY" || code === "EPERM" || code === "EACCES" || code === "ETXTBSY"
            // Clean up temp file if it exists
            try { if (fs.existsSync(EXCEL_TMP_PATH)) fs.unlinkSync(EXCEL_TMP_PATH) } catch {}
            if (attempt < attempts && isLockLike) {
                const jitter = Math.floor(Math.random() * 100)
                sleep(baseDelayMs * attempt + jitter)
                continue
            }
            throw err
        }
    }
}

function paymentCell(payment: any): string {
    if (payment?.bypassPasswordUsed) return "Admin"
    if (payment?.paymentDone) {
        // When payment completed using a promo code, mark explicitly
        if (payment?.promoCodeUsed) return "Promo Code"
        const amount = Number(payment?.amount)
        return Number.isFinite(amount) && amount > 0 ? `Yes / ₹${amount}` : "Yes"
    }
    return "No"
}

function normalizeCellValue(value: any): string {
	return value === undefined || value === null ? "" : String(value)
}

const COLUMN_GETTERS: Record<string, (doc: DocumentSet) => any> = {
	"PAN Number": (doc) => doc.pan?.panNumber,
	"Aadhaar Number": (doc) => doc.aadhar?.aadhaarNumber,
	"Aadhaar Name": (doc) => doc.aadhar?.name,
	"Sex": (doc) => doc.passport_front?.sex,
	"Full Name (Passport)": (doc) => doc.passport_front?.firstName,
	"Last Name": (doc) => doc.passport_front?.lastName,
	"Passport No.": (doc) => doc.passport_front?.passportNumber,
	"Nationality": (doc) => doc.passport_front?.nationality,
	"DOB": (doc) => doc.passport_front?.dateOfBirth,
	"D.O.Issue": (doc) => doc.passport_front?.dateOfIssue,
	"D.O.Expire": (doc) => doc.passport_front?.dateOfExpiry,
	"Mobile Number": (doc) => (doc as any).passport_back?.mobileNumber,
	"Email": (doc) => (doc as any).passport_back?.email,
	"REF": (doc) => (doc as any).passport_back?.ref,
	"FF 6E": (doc) => (doc as any).passport_back?.ff6E,
	"FF EK": (doc) => (doc as any).passport_back?.ffEK,
	"FF EY": (doc) => (doc as any).passport_back?.ffEY,
	"FF SQ": (doc) => (doc as any).passport_back?.ffSQ,
	"FF AI": (doc) => (doc as any).passport_back?.ffAI,
	"FF QR": (doc) => (doc as any).passport_back?.ffQR,
	"Father Name": (doc) => doc.passport_back?.fatherName,
	"Mother Name": (doc) => doc.passport_back?.motherName,
	"Spouse Name": (doc) => doc.passport_back?.spouseName,
	"Place Of Birth": (doc) => doc.passport_front?.placeOfBirth,
	"Place Of Issue": (doc) => doc.passport_front?.placeOfIssue,
	"PAN Name": (doc) => doc.pan?.name,
	"Passport Address": (doc) => doc.passport_back?.address,
	"Passport Front Image URL": (doc) => doc.passport_front?.imageUrl,
	"Passport Back Image URL": (doc) => doc.passport_back?.imageUrl,
	"Aadhaar Image URL": (doc) => doc.aadhar?.imageUrl,
	"PAN Image URL": (doc) => doc.pan?.imageUrl,
	"Traveler Photo URL": (doc) => doc.photo?.imageUrl,
}

export function appendRowFromDocument(doc: DocumentSet) {
	try {
		const { wb, ws } = ensureWorkbook()
		const existing = XLSX.utils.sheet_to_json(ws)
		const seq = (existing?.length || 0) + 1

		const row = buildRowFromDocument(doc, seq)

		const wsRange = XLSX.utils.decode_range(ws['!ref'] as string)
		const newRowIndex = wsRange.e.r + 1
		XLSX.utils.sheet_add_aoa(ws, [row], { origin: { r: newRowIndex, c: 0 } })
        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer
        writeExcelBufferWithRetry(Buffer.from(buf))
        // Basic success log for debugging
        console.log(`[excel] appended row #${seq} to`, EXCEL_PATH)
    }
    catch (err: any) {
        console.error("[excel] append failed:", err?.message || err)
    }
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
	return HEADERS.map((header) => {
		if (header === "NO") return sequence
		if (header === "Payment Complete") return paymentCell((doc as any).payment)
		const getter = COLUMN_GETTERS[header]
		return getter ? normalizeCellValue(getter(doc)) : ""
	})
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
        writeExcelBufferWithRetry(Buffer.from(buf))
        console.log(`[excel] updated row #${sequence} at`, EXCEL_PATH)
    } catch (err: any) {
        console.error("[excel] update failed:", err?.message || err)
    }
}

// Check for duplicate records in Excel file
export function checkForDuplicates(doc: DocumentSet): { hasDuplicate: boolean; duplicateField?: string; duplicateValue?: string } {
	try {
		const { ws } = ensureWorkbook()
		const existing = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]
		
		// Skip header row (index 0)
		const dataRows = existing.slice(1)
		
		const passportNumber = doc.passport_front?.passportNumber?.trim()
		const aadhaarNumber = doc.aadhar?.aadhaarNumber?.trim()
		const panNumber = doc.pan?.panNumber?.trim()
		
		// Check each data row for duplicates
		for (const row of dataRows) {
			// Column indices: Passport No. (7), Aadhaar Number (2), PAN Number (1)
			const existingPassport = row[7]?.trim()
			const existingAadhaar = row[2]?.trim()
			const existingPAN = row[1]?.trim()
			
			// Check for Passport Number duplicate
			if (passportNumber && existingPassport && passportNumber === existingPassport) {
				return { hasDuplicate: true, duplicateField: "Passport Number", duplicateValue: passportNumber }
			}
			
			// Check for Aadhaar Number duplicate
			if (aadhaarNumber && existingAadhaar && aadhaarNumber === existingAadhaar) {
				return { hasDuplicate: true, duplicateField: "Aadhaar Number", duplicateValue: aadhaarNumber }
			}
			
			// Check for PAN Number duplicate
			if (panNumber && existingPAN && panNumber === existingPAN) {
				return { hasDuplicate: true, duplicateField: "PAN Number", duplicateValue: panNumber }
			}
		}
		
		return { hasDuplicate: false }
	} catch (err: any) {
		console.error("[excel] duplicate check failed:", err?.message || err)
		// Return no duplicate on error to avoid blocking submissions
		return { hasDuplicate: false }
	}
} 
