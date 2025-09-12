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
    email: z.string().optional(),
    mobileNumber: z.string().optional(),
    // The following fields are manual-only: ref, ff6E, ffEK, ffEY, ffSQ, ffAI
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

// Resiliency helpers mirrored from classify endpoint
function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function isUrlReachable(url: string) {
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-store" })
    return res.ok
  } catch {
    return false
  }
}

async function ensureUrlReady(url: string, attempts = 3, baseDelayMs = 500) {
  if (/^data:/i.test(url)) return
  for (let i = 0; i < attempts; i++) {
    if (await isUrlReachable(url)) return
    await wait(baseDelayMs * Math.pow(2, i))
  }
}

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

    // Warm up remote URLs to avoid transient empty responses
    if (/^https?:/i.test(dataUrl)) {
      await ensureUrlReady(dataUrl, 3, 400)
    }

    const schema = DOC_SCHEMAS[type]
    let object: unknown = {}
    try {
      const result = await generateObject({
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
      object = result.object
    } catch (e: any) {
      if (e?.name === "AI_NoObjectGeneratedError" || /did not match schema/i.test(String(e?.message))) {
        // Fall back to empty object so the endpoint still succeeds
        object = {}
      } else {
        throw e
      }
    }

    // Normalize names for passports so UI fields auto-fill correctly
    const data: Record<string, any> = { ...(object as any) }
    if (type === "passport_front") {
      const rawGiven = String(data.givenNames || data.firstName || "").trim()
      const rawSurname = String(data.surname || data.lastName || "").trim()

      if (rawGiven) {
        const tokens = rawGiven.split(/\s+/).filter(Boolean)
        if (tokens.length > 0) {
          data.firstName = rawGiven
        }
      }
      if (rawSurname) {
        data.lastName = rawSurname
      }
    }

    // Ensure manual-only fields are never populated by extraction
    if (type === "passport_back") {
      delete data.ref
      delete data.ff6E
      delete data.ffEK
      delete data.ffEY
      delete data.ffSQ
      delete data.ffAI
    }

    // Include the imageUrl we used so downstream can store it if desired
    if (dataUrl) {
      data.imageUrl = dataUrl
    }

    return Response.json({ data })
  } catch (err: any) {
    console.error("[v0] extract error:", err?.message)
    return Response.json({ error: "Extraction failed" }, { status: 500 })
  }
}