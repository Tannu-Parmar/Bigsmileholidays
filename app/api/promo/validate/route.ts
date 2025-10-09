import type { NextRequest } from "next/server"

// Promo codes with their discount percentages
const PROMO_CODES = {
  "BIG123": { valid: true, discount: 100 },
}

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json()
    
    if (!code || typeof code !== "string") {
      return Response.json({ 
        ok: false, 
        error: "Promo code is required" 
      }, { status: 400 })
    }

    const upperCode = code.toUpperCase().trim()
    const promo = PROMO_CODES[upperCode as keyof typeof PROMO_CODES]

    if (!promo || !promo.valid) {
      return Response.json({ 
        ok: false, 
        error: "Invalid promo code" 
      }, { status: 400 })
    }

    return Response.json({ 
      ok: true, 
      valid: true,
      discount: promo.discount,
      code: upperCode
    })

  } catch (e: any) {
    return Response.json({ 
      ok: false, 
      error: e?.message || "Invalid request" 
    }, { status: 400 })
  }
}
