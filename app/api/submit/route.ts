import type { NextRequest } from "next/server"
import { dbConnect } from "@/lib/mongodb"
import { DocumentSetModel } from "@/lib/models"
import { appendRowFromDocument } from "@/lib/excel"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    await dbConnect()
    const created = await DocumentSetModel.create(payload)

    // Append to Excel file with ordered headers and sequence
    appendRowFromDocument(created.toObject())

    return Response.json({ ok: true, id: created._id })
  } catch (err: any) {
    console.error("[v0] submit error:", err?.message)
    return Response.json({ ok: false, error: "Save failed" }, { status: 500 })
  }
}
