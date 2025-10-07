import type { NextRequest } from "next/server"
import Razorpay from "razorpay"
import crypto from "crypto"

export const runtime = "nodejs"

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function POST(req: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return Response.json({ error: "Missing payment verification data" }, { status: 400 })
    }

    // Create signature
    const body = razorpay_order_id + "|" + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest("hex")

    const isAuthentic = expectedSignature === razorpay_signature

    if (!isAuthentic) {
      return Response.json({ error: "Payment verification failed" }, { status: 400 })
    }

    // Fetch payment details from Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id)

    return Response.json({
      success: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      amount: payment.amount / 100, // Convert from paise to rupees
      status: payment.status,
      method: payment.method,
      transactionReference: payment.id,
    })
  } catch (error: any) {
    console.error("Payment verification failed:", error)
    return Response.json(
      { error: error.message || "Payment verification failed" },
      { status: 500 }
    )
  }
}
