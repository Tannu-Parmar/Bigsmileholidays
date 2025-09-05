import type { NextRequest } from "next/server"
import { dbConnect } from "@/lib/mongodb"
import { DocumentSetModel } from "@/lib/models"
import { appendRowFromDocument } from "@/lib/excel"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
	try {
		const payload = await req.json()
		if (!payload || typeof payload !== "object") {
			return Response.json({ ok: false, error: "Invalid payload" }, { status: 400 })
		}

		await dbConnect()
		const created = await DocumentSetModel.create(payload)

		// Append to Excel file with ordered headers and sequence
		try {
			appendRowFromDocument(created.toObject())
		} catch (excelErr: any) {
			console.error("[submit] excel append failed:", excelErr?.message)
		}

		return Response.json({ ok: true, id: created._id })
	} catch (err: any) {
		console.error("[submit] error:", err)
		return Response.json({ ok: false, error: "Save failed" }, { status: 500 })
	}
}
