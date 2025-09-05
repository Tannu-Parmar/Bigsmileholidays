import type { NextRequest } from "next/server"
import cloudinary from "@/lib/cloudinary"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get("file") as File | null
    const folder = (form.get("folder") as string) || "id-ocr-docs"
    if (!file) return Response.json({ error: "Missing file" }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")
    const dataUri = `data:${file.type};base64,${base64}`

    const uploaded = await cloudinary.uploader.upload(dataUri, { folder })

    return Response.json({ url: uploaded.secure_url, publicId: uploaded.public_id })
  } catch (e: any) {
    console.error("[v0] upload error:", e?.message)
    return Response.json({ error: "Upload failed" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { publicId } = await req.json()
    if (!publicId) return Response.json({ error: "Missing publicId" }, { status: 400 })
    await cloudinary.uploader.destroy(publicId)
    return Response.json({ ok: true })
  } catch (e: any) {
    console.error("[v0] delete upload error:", e?.message)
    return Response.json({ error: "Delete failed" }, { status: 500 })
  }
} 