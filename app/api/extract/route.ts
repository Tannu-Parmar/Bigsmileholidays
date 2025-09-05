import type { NextRequest } from "next/server"
import { z } from "zod"
import { generateObject } from "ai"
import { createOpenAI } from "@ai-sdk/openai"

const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  throw new Error("OPENAI_API_KEY is not set. Add it to your environment.")
}
const openai = createOpenAI({ apiKey })

const DOC_SCHEMAS = {
  passport_front: z.object({
    passportNumber: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    nationality: z.string().optional(),
    sex: z.string().optional(),
    dateOfBirth: z.string().optional(),
    placeOfBirth: z.string().optional(),
    placeOfIssue: z.string().optional(),
    maritalStatus: z.string().optional(),
    dateOfIssue: z.string().optional(),
    dateOfExpiry: z.string().optional(),
  }),
  passport_back: z.object({
    fatherName: z.string().optional(),
    motherName: z.string().optional(),
    spouseName: z.string().optional(),
    address: z.string().optional(),
  }),
  aadhar: z.object({
    aadhaarNumber: z.string().optional(),
    name: z.string().optional(),
    dateOfBirth: z.string().optional(),
    gender: z.string().optional(),
    address: z.string().optional(),
  }),
  pan: z.object({
    panNumber: z.string().optional(),
    name: z.string().optional(),
    fatherName: z.string().optional(),
    dateOfBirth: z.string().optional(),
  }),
} as const

type DocType = keyof typeof DOC_SCHEMAS

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const type = (form.get("type") as DocType) || "passport_front"
    const file = form.get("file") as File | null

    if (!file) return Response.json({ error: "Missing file" }, { status: 400 })

    const arrayBuf = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuf).toString("base64")
    const dataUrl = `data:${file.type};base64,${base64}`

    const schema = DOC_SCHEMAS[type]
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema,
      messages: [
        {
          role: "system",
          content:
            "You are a precise OCR assistant. Extract only clean text for the requested fields. Use yyyy-mm-dd for dates when visible. Omit fields you cannot find.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: `Extract fields for ${type.replaceAll("_", " ")} from this image.` },
            { type: "image", image: dataUrl },
          ],
        },
      ],
    })

    return Response.json({ data: object })
  } catch (err: any) {
    console.error("[v0] extract error:", err?.message)
    return Response.json({ error: "Extraction failed" }, { status: 500 })
  }
}
