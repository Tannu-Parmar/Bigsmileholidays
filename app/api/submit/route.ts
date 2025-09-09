import type { NextRequest } from "next/server"
import { dbConnect } from "@/lib/mongodb"
import { DocumentSetModel } from "@/lib/models"
import { appendRowFromDocument } from "@/lib/excel"
import { appendDocumentToSheet } from "@/lib/google-sheets"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
	try {
		const payload = await req.json()
		if (!payload || typeof payload !== "object") {
			return Response.json({ ok: false, error: "Invalid payload" }, { status: 400 })
		}

		try {
			await dbConnect()
			const created = await DocumentSetModel.create(payload)

			// Append to Excel file with ordered headers and sequence
			try {
				appendRowFromDocument(created.toObject())
			} catch (excelErr: any) {
				console.error("[submit] excel append failed:", excelErr?.message)
			}

			// Also append to shared Google Sheet if configured
			try {
				await appendDocumentToSheet(created.toObject())
			} catch (sheetsErr: any) {
				console.error("[submit] sheets append skipped:", sheetsErr?.message)
			}

			return Response.json({ ok: true, id: created._id })
		} catch (dbErr: any) {
			console.error("[submit] DB unavailable, falling back to Excel-only:", dbErr?.message)
			try {
				appendRowFromDocument(payload)
				// Attempt Sheets append as well
				try {
					await appendDocumentToSheet(payload)
				} catch (sheetsErr: any) {
					console.error("[submit] sheets append skipped:", sheetsErr?.message)
				}
				return Response.json({ ok: true, fallback: "excel-only" })
			} catch (excelErr: any) {
				console.error("[submit] excel append also failed:", excelErr?.message)
				return Response.json({ ok: false, error: "Save failed" }, { status: 500 })
			}
		}
	} catch (err: any) {
		console.error("[submit] error:", err)
		return Response.json({ ok: false, error: "Save failed" }, { status: 500 })
	}
}
