import { getExcelFileBuffer, buildExcelBufferFromDocuments } from "@/lib/excel"
import { dbConnect } from "@/lib/mongodb"
import { DocumentSetModel } from "@/lib/models"

export const runtime = "nodejs"

export async function GET() {
	try {
		let buf: Buffer | null = null
		// Try to export from MongoDB if configured
		try {
			await dbConnect()
			const docs = await DocumentSetModel.find({}).sort({ createdAt: 1 }).lean().exec()
			if (docs && docs.length > 0) {
				buf = buildExcelBufferFromDocuments(docs as any)
			}
		} catch (e) {
			// DB not configured/unavailable; fall back to file-based export
		}

		if (!buf) {
			buf = getExcelFileBuffer()
		}

		return new Response(buf, {
			status: 200,
			headers: {
				"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				"Content-Disposition": `attachment; filename="document-records.xlsx"`,
			},
		})
	} catch (err: any) {
		return new Response("Export failed", { status: 500 })
	}
}
