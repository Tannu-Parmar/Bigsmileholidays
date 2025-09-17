import { NextRequest } from "next/server"
import { findRowsByQuery, mapRowToDocument } from "@/lib/google-sheets"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
	try {
		const url = new URL(req.url)
		const q = (url.searchParams.get("q") || "").trim()
		if (!q) return Response.json({ ok: false, error: "Missing q" }, { status: 400 })
		const matches = await findRowsByQuery(q)
		const results = matches.map((m) => ({ sequence: m.sequence, values: m.values, document: mapRowToDocument(m.values) }))
		return Response.json({ ok: true, results })
	} catch (e: any) {
		return Response.json({ ok: false, error: e?.message || "Search failed" }, { status: 500 })
	}
} 