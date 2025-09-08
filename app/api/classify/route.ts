import type { NextRequest } from "next/server"
import { z } from "zod"
import { generateObject } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import cloudinary from "@/lib/cloudinary"

export const runtime = "nodejs"

const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  throw new Error("OPENAI_API_KEY is not set. Add it to your environment.")
}
const openai = createOpenAI({ apiKey })

const DOC_TYPES = ["passport_front", "passport_back", "aadhar", "pan", "unknown"] as const
const CLASSIFY_SCHEMA = z.object({
  type: z.enum(DOC_TYPES),
  confidence: z.number().min(0).max(1),
})

type DocType = (typeof DOC_TYPES)[number]

async function classifyImageByUrl(imageUrl: string) {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: CLASSIFY_SCHEMA,
    messages: [
      {
        role: "system",
        content:
          "You are a careful document classifier for Indian KYC documents. Classify the provided image strictly as one of: passport_front, passport_back, aadhar, pan, or unknown. Return a confidence between 0 and 1.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Classify this document. Guidelines: passport_front = passport biodata page with photo and MRZ (two lines of < at bottom). passport_back = address/family details page of passport, typically without MRZ. aadhar = Aadhaar card with UIDAI branding and 12-digit number. pan = PAN card with 10-character alphanumeric (ABCDE1234F) and Income Tax Dept.",
          },
          { type: "image", image: imageUrl },
        ],
      },
    ],
  })
  return object as { type: DocType; confidence: number }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const imageUrl = (form.get("imageUrl") as string) || (form.get("previewUrl") as string) || ""
    const publicId = (form.get("publicId") as string) || ""
    const isPdfStr = (form.get("isPdf") as string) || ""
    const pageParam = parseInt((form.get("page") as string) || "", 10)
    const file = form.get("file") as File | null

    const isPdf = ["1", "true", "yes"].includes(isPdfStr?.toLowerCase?.() || "")

    // If PDF with Cloudinary publicId, classify first page and try second page too
    if (isPdf && publicId) {
      const page1Url = cloudinary.url(publicId, { resource_type: "image", format: "jpg", page: 1, secure: true })
      const results: Array<{ page: number; type: DocType; confidence: number; pageImageUrl: string }> = []
      try {
        const r1 = await classifyImageByUrl(page1Url)
        results.push({ page: 1, pageImageUrl: page1Url, ...r1 })
      } catch {}
      try {
        const page2Url = cloudinary.url(publicId, { resource_type: "image", format: "jpg", page: 2, secure: true })
        const r2 = await classifyImageByUrl(page2Url)
        results.push({ page: 2, pageImageUrl: page2Url, ...r2 })
      } catch {}
      if (results.length === 0) return Response.json({ error: "Classification failed" }, { status: 500 })
      return Response.json({ results })
    }

    // If explicit page requested with a Cloudinary publicId
    if (publicId && Number.isFinite(pageParam) && pageParam > 0) {
      const pageUrl = cloudinary.url(publicId, { resource_type: "image", format: "jpg", page: pageParam, secure: true })
      const r = await classifyImageByUrl(pageUrl)
      return Response.json({ page: pageParam, pageImageUrl: pageUrl, ...r })
    }

    // If we have an image URL (from upload preview or direct)
    if (imageUrl) {
      const r = await classifyImageByUrl(imageUrl)
      return Response.json(r)
    }

    // If a direct image file is provided
    if (file) {
      if (file.type === "application/pdf") {
        return Response.json({ error: "PDF file provided without publicId/imageUrl. Upload first, then classify by publicId." }, { status: 400 })
      }
      const arrayBuf = await file.arrayBuffer()
      const base64 = Buffer.from(arrayBuf).toString("base64")
      const dataUrl = `data:${file.type};base64,${base64}`
      const r = await classifyImageByUrl(dataUrl)
      return Response.json(r)
    }

    return Response.json({ error: "Provide imageUrl, publicId(+isPdf), or image file" }, { status: 400 })
  } catch (err: any) {
    console.error("[classify] error:", err?.message)
    return Response.json({ error: "Classification failed" }, { status: 500 })
  }
} 