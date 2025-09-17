import type { NextRequest } from "next/server"
import { dbConnect } from "@/lib/mongodb"
import { DocumentSetModel } from "@/lib/models"
import { appendRowFromDocument, updateRowFromDocument as updateExcelRow } from "@/lib/excel"
import { appendDocumentToSheet, updateRowFromDocument as updateSheetsRow } from "@/lib/google-sheets"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
	try {
		const payload = await req.json()
		if (!payload || typeof payload !== "object") {
			return Response.json({ ok: false, error: "Invalid payload" }, { status: 400 })
		}

		const sequence: number | undefined = typeof payload.sequence === "number" ? payload.sequence : undefined
		// Remove sequence before DB create to keep schema clean
		if ("sequence" in payload) delete payload.sequence

		try {
			await dbConnect()
			const created = await DocumentSetModel.create(payload)

			// Excel and Google Sheets: update if sequence provided; else append
			try {
				if (sequence && sequence > 0) {
					updateExcelRow(sequence, created.toObject())
				} else {
					appendRowFromDocument(created.toObject())
				}
			} catch (excelErr: any) {
				console.error("[submit] excel write failed:", excelErr?.message)
			}

			try {
				if (sequence && sequence > 0) {
					await updateSheetsRow(sequence, created.toObject())
				} else {
					await appendDocumentToSheet(created.toObject())
				}
			} catch (sheetsErr: any) {
				console.error("[submit] sheets write failed:", sheetsErr?.message)
			}

			return Response.json({ ok: true })
		} catch (e: any) {
			return Response.json({ ok: false, error: e?.message || "Save failed" }, { status: 500 })
		}
	} catch (e: any) {
		return Response.json({ ok: false, error: e?.message || "Invalid request" }, { status: 400 })
	}
}
