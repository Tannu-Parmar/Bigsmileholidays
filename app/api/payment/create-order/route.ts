import type { NextRequest } from "next/server"
import Razorpay from "razorpay"

export const runtime = "nodejs"

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function POST(req: NextRequest) {
  try {
    // Check if Razorpay is configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return Response.json(
        { error: "Razorpay not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables." },
        { status: 500 }
      )
    }

    const { amount, currency = "INR", receipt } = await req.json()

    if (!amount || amount <= 0) {
      return Response.json({ error: "Invalid amount" }, { status: 400 })
    }

    // Create order
    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
    })

    return Response.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    })
  } catch (error: any) {
    console.error("Razorpay order creation failed:", error)
    return Response.json(
      { error: error.message || "Failed to create order" },
      { status: 500 }
    )
  }
}
