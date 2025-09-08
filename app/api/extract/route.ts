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
    // Explicitly capture raw fields visible on the passport UI
    givenNames: z.string().optional(),
    surname: z.string().optional(),
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
    const type = (form.get("type") as keyof typeof DOC_SCHEMAS) || "passport_front"
    const file = form.get("file") as File | null
    const imageUrl = (form.get("imageUrl") as string) || (form.get("previewUrl") as string) || ""

    if (!file && !imageUrl) return Response.json({ error: "Missing file or imageUrl" }, { status: 400 })

    let dataUrl = imageUrl
    if (!dataUrl && file) {
      const arrayBuf = await file.arrayBuffer()
      const base64 = Buffer.from(arrayBuf).toString("base64")
      dataUrl = `data:${file.type};base64,${base64}`
    }

    const schema = DOC_SCHEMAS[type]
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You are a precise OCR assistant. Extract only clean text for the requested fields. Use yyyy-mm-dd for dates when visible. Omit fields you cannot find. For Indian passports: 'surname' is the top-right Surname label and is the lastName; 'givenNames' is the Given Names line; set firstName to the first token of 'givenNames'.",
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

    // Normalize names for passports so UI fields auto-fill correctly
    const data: Record<string, any> = { ...(object as any) }
    if (type === "passport_front") {
      const rawGiven = String(data.givenNames || data.firstName || "").trim()
      const rawSurname = String(data.surname || data.lastName || "").trim()

      if (rawGiven) {
        const tokens = rawGiven.split(/\s+/).filter(Boolean)
        if (tokens.length > 0) {
          data.firstName = tokens[0]
        }
      }
      if (rawSurname) {
        data.lastName = rawSurname
      }
    }

    return Response.json({ data })
  } catch (err: any) {
    console.error("[v0] extract error:", err?.message)
    return Response.json({ error: "Extraction failed" }, { status: 500 })
  }
}
