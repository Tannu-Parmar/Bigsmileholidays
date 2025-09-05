import type { NextRequest } from "next/server"
import { dbConnect } from "@/lib/mongodb"
import { DocumentSetModel } from "@/lib/models"
import { appendRowFromDocument } from "@/lib/excel"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    console.log("Payload received:", payload)

    await dbConnect()
    const created = await DocumentSetModel.create(payload)

    if (!created || typeof created.toObject !== "function") {
      throw new Error("Document creation failed or invalid")
    }

    await appendRowFromDocument(created.toObject()) // Ensure this is awaited

    return Response.json({ ok: true, id: created._id })
  } catch (err: any) {
    console.error("[v0] submit error:", err?.message, err)
    return Response.json({ ok: false, error: "Save failed" }, { status: 500 })
  }
}
