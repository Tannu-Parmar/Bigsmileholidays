import { buildExcelBufferFromDocuments, getExcelFileBuffer } from "@/lib/excel"
import { dbConnect } from "@/lib/mongodb"
import { DocumentSetModel } from "@/lib/models"

export const runtime = "nodejs"

export async function GET() {
	try {
		await dbConnect()
		const docs = await DocumentSetModel.find({}).sort({ createdAt: 1 }).lean()
		const buf = buildExcelBufferFromDocuments(docs as any)
		return new Response(buf, {
			status: 200,
			headers: {
				"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				"Content-Disposition": `attachment; filename="document-records.xlsx"`,
			},
		})
	} catch (err: any) {
		console.error("[export] db-backed export failed, falling back:", err?.message)
		try {
			const fallback = getExcelFileBuffer()
			return new Response(fallback, {
				status: 200,
				headers: {
					"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
					"Content-Disposition": `attachment; filename="document-records.xlsx"`,
				},
			})
		} catch (fallbackErr: any) {
			console.error("[export] fallback failed:", fallbackErr?.message)
			return new Response("Export failed", { status: 500 })
		}
	}
}
