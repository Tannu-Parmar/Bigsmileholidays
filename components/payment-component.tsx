"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { CreditCard, Eye, EyeOff, Lock, Unlock, Tag, CheckCircle } from "lucide-react"

declare global {
  interface Window {
    Razorpay: any
  }
}

interface PaymentComponentProps {
  amount: number
  onPaymentSuccess: (paymentData: {
    paymentDone: boolean
    amount: number
    paymentId?: string
    transactionReference?: string
    bypassPasswordUsed: boolean
    promoCodeUsed?: boolean
    promoCode?: string
  }) => void
  onPaymentError: (error: string) => void
}

const BYPASS_PASSWORD = process.env.NEXT_PUBLIC_BYPASS_PASSWORD || "Bigsmile@2504"
const PROMO_CODES = {
  "BIG123": { valid: true, discount: 100 },
}

export function PaymentComponent({ amount, onPaymentSuccess, onPaymentError }: PaymentComponentProps) {
  const [showBypassPassword, setShowBypassPassword] = useState(false)
  const [bypassPassword, setBypassPassword] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [bypassMode, setBypassMode] = useState(false)
  const [bypassError, setBypassError] = useState("")
  const [promoCode, setPromoCode] = useState("")
  const [promoError, setPromoError] = useState("")
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null)
  const [showPromoSection, setShowPromoSection] = useState(false)
  const { toast } = useToast()

  const validatePromoCode = (code: string) => {
    const upperCode = code.toUpperCase().trim()
    return PROMO_CODES[upperCode as keyof typeof PROMO_CODES]
  }

  const handlePromoCodeSubmit = async () => {
    try {
      const response = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode }),
      })

      const data = await response.json()

      if (!response.ok || !data.ok) {
        setPromoError("Invalid promo code")
        toast({ title: "Invalid Promo Code", description: "Please check the code and try again.", variant: "destructive" })
        return
      }
      
      setAppliedPromo(data.code)
      setPromoError("")
      toast({ 
        title: "Promo Code Applied!", 
        description: `You got ${data.discount}% off! ${data.discount === 100 ? 'Payment is now free!' : ''}` 
      })
    } catch (error) {
      setPromoError("Failed to validate promo code")
      toast({ title: "Error", description: "Failed to validate promo code. Please try again.", variant: "destructive" })
    }
  }

  const removePromoCode = () => {
    setAppliedPromo(null)
    setPromoCode("")
    setPromoError("")
    toast({ title: "Promo Code Removed", description: "You can apply a new code if needed." })
  }

  const getFinalAmount = () => {
    if (!appliedPromo) return amount
    // For display purposes, we'll use the client-side validation
    // The actual validation happens server-side during payment
    const promo = validatePromoCode(appliedPromo)
    if (!promo) return amount
    return Math.max(0, amount - (amount * promo.discount / 100))
  }

  const loadRazorpayScript = (): Promise<void> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve()
        return
      }

      const script = document.createElement("script")
      script.src = "https://checkout.razorpay.com/v1/checkout.js"
      script.onload = () => resolve()
      script.onerror = () => {
        onPaymentError("Failed to load Razorpay script")
        resolve()
      }
      document.body.appendChild(script)
    })
  }

  const handlePayment = async () => {
    if (bypassMode) {
      handleBypassPayment()
      return
    }

    // Check if promo code makes payment free
    const finalAmount = getFinalAmount()
    if (finalAmount === 0 && appliedPromo) {
      handlePromoPayment()
      return
    }

    // Check if Razorpay is configured
    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID === 'rzp_test_your_key_id_here') {
      toast({
        title: "Razorpay Not Configured",
        description: "Please set up Razorpay environment variables. Using bypass mode instead.",
        variant: "destructive",
      })
      setBypassMode(true)
      return
    }

    setIsProcessing(true)
    try {
      await loadRazorpayScript()

      // Create order
      const orderResponse = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: finalAmount,
          currency: "INR",
          receipt: `receipt_${Date.now()}`,
        }),
      })

      if (!orderResponse.ok) {
        throw new Error("Failed to create payment order")
      }

      const orderData = await orderResponse.json()

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Big Smile Holidays",
        description: "Document Processing Payment",
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            // Verify payment
            const verifyResponse = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })

            if (!verifyResponse.ok) {
              throw new Error("Payment verification failed")
            }

            const verifyData = await verifyResponse.json()

            onPaymentSuccess({
              paymentDone: true,
              amount: verifyData.amount,
              paymentId: verifyData.paymentId,
              transactionReference: verifyData.transactionReference,
              bypassPasswordUsed: false,
              promoCodeUsed: !!appliedPromo,
              promoCode: appliedPromo || undefined,
            })

            toast({
              title: "Payment Successful",
              description: `Payment of ₹${verifyData.amount} completed successfully.`,
            })
          } catch (error: any) {
            onPaymentError(error.message || "Payment verification failed")
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false)
            onPaymentError("Payment cancelled by user")
          },
        },
        theme: {
          color: "#4CAF50",
        },
      }

      const razorpay = new window.Razorpay(options)
      razorpay.open()
    } catch (error: any) {
      setIsProcessing(false)
      onPaymentError(error.message || "Payment failed")
    }
  }

  const handlePromoPayment = () => {
    onPaymentSuccess({
      paymentDone: true,
      amount: 0,
      bypassPasswordUsed: false,
      promoCodeUsed: true,
      promoCode: appliedPromo || undefined,
    })

    toast({
      title: "Payment Completed",
      description: `Payment completed using promo code ${appliedPromo}. Form will be submitted automatically.`,
    })
  }

  const handleBypassPayment = () => {
    if (bypassPassword !== BYPASS_PASSWORD) {
      setBypassError("Password is wrong")
      toast({ title: "Password is wrong", variant: "destructive" })
      return
    }

    onPaymentSuccess({
      paymentDone: true,
      amount: 0,
      bypassPasswordUsed: true,
    })

    toast({
      title: "Payment Bypassed",
      description: "Form submitted using bypass password.",
    })
  }

  const toggleBypassMode = () => {
    setBypassMode(!bypassMode)
    setBypassPassword("")
    setBypassError("")
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Complete payment to submit your form
          </p>
          <div className="space-y-2">
            {appliedPromo ? (
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Promo Code Applied: {appliedPromo}</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-lg text-muted-foreground line-through">₹{amount}</p>
                  <p className="text-2xl font-bold text-green-600">₹{getFinalAmount()}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removePromoCode}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Remove Code
                </Button>
              </div>
            ) : (
              <p className="text-2xl font-bold text-green-600">₹{getFinalAmount()}</p>
            )}
          </div>
        </div>

        {/* Promo Code Section */}
        {!appliedPromo && (
          <div className="space-y-3">
            {!showPromoSection ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPromoSection(true)}
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                <Tag className="h-3 w-3 mr-1" />
                Have a promo code?
              </Button>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="promo-code" className="text-xs">Promo Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="promo-code"
                    placeholder="Enter promo code"
                    value={promoCode}
                    onChange={(e) => { setPromoCode(e.target.value); if (promoError) setPromoError("") }}
                    className="flex-1"
                  />
                  <Button
                    onClick={handlePromoCodeSubmit}
                    disabled={!promoCode.trim()}
                    size="sm"
                    variant="outline"
                  >
                    Apply
                  </Button>
                </div>
                {promoError && (
                  <div className="text-xs text-destructive">{promoError}</div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPromoSection(false)}
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}

        {!bypassMode ? (
          <div className="space-y-3">
            <Button
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? "Processing..." : getFinalAmount() === 0 ? "Submit Free" : `Pay ₹${getFinalAmount()}`}
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>
            
            <Button
              variant="outline"
              onClick={toggleBypassMode}
              className="w-full"
            >
              <Lock className="h-4 w-4 mr-2" />
              Admin Bypass
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="bypass-password">Bypass Password</Label>
              <div className="relative">
                <Input
                  id="bypass-password"
                  type={showBypassPassword ? "text" : "password"}
                  placeholder="Enter bypass password"
                  value={bypassPassword}
                onChange={(e) => { setBypassPassword(e.target.value); if (bypassError) setBypassError("") }}
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowBypassPassword(!showBypassPassword)}
                  className="absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground hover:text-foreground"
                >
                  {showBypassPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            {bypassError ? (
              <div className="text-xs text-destructive">{bypassError}</div>
            ) : null}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleBypassPayment}
                disabled={!bypassPassword}
                className="flex-1"
                variant="outline"
              >
                <Unlock className="h-4 w-4 mr-2" />
                Bypass Payment
              </Button>
              <Button
                onClick={toggleBypassMode}
                variant="ghost"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center">
          <p>Secure payment powered by Razorpay</p>
        </div>
      </CardContent>
    </Card>
  )
}
