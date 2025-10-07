"use client"

import { useState } from "react"
import { DocumentSection, PhotoSection } from "@/components/document-section"
import { PaymentComponent } from "@/components/payment-component"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { FileSpreadsheet, Send, Search, Lock, Unlock, Eye, EyeOff, CreditCard } from "lucide-react"
import { BigSmileLogo } from "@/components/big-smile-logo"
import { Input } from "@/components/ui/input"

type AnyObj = Record<string, any>

type SearchResult = { sequence: number; document: AnyObj; values: string[] }

export default function HomePage() {
  const [passportFront, setPassportFront] = useState<AnyObj>({})
  const [passportBack, setPassportBack] = useState<AnyObj>({})
  const [aadhar, setAadhar] = useState<AnyObj>({})
  const [pan, setPan] = useState<AnyObj>({})
  const [photo, setPhoto] = useState<AnyObj>({})
  const [submitting, setSubmitting] = useState(false)
  const [sequence, setSequence] = useState<number | null>(null)
  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [unlocked, setUnlocked] = useState<boolean>(false)
  const [password, setPassword] = useState<string>("")
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [passwordError, setPasswordError] = useState<string>("")
  const [showPayment, setShowPayment] = useState(false)
  const [paymentData, setPaymentData] = useState<any>(null)
  const { toast } = useToast()

  function getAuthHeaders() {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (password) headers["x-app-pass"] = password
    return headers
  }

  async function handleUnlock() {
    try {
      const test = await fetch(`/api/sheets/search?q=${encodeURIComponent("_healthcheck_")}`, { headers: { "x-app-pass": password } })
      if (test.status === 401) throw new Error("Password is wrong")
      setUnlocked(true)
      setPasswordError("")
      toast({ title: "Unlocked", description: "You can now search and submit." })
    } catch (e: any) {
      setUnlocked(false)
      setPasswordError("Password is wrong")
      toast({ title: "Password is wrong", variant: "destructive" })
    }
  }

  function handlePaymentSuccess(paymentInfo: any) {
    setPaymentData(paymentInfo)
    setShowPayment(false)
    toast({
      title: "Payment Successful",
      description: paymentInfo.bypassPasswordUsed 
        ? "Payment bypassed successfully" 
        : `Payment of ₹${paymentInfo.amount} completed`,
    })
    // Auto-submit immediately after successful payment
    submitWith(paymentInfo)
  }

  function handlePaymentError(error: string) {
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive",
    })
  }

  async function submitWith(paymentInfo: any) {
    try {
      // Prevent submission if everything is empty
      const isEmptyObject = (obj: AnyObj | null | undefined) => {
        if (!obj || typeof obj !== "object") return true
        return Object.values(obj).every((v) => v === undefined || v === null || String(v).trim() === "")
      }
      const allEmpty = [passportFront, passportBack, aadhar, pan, photo].every(isEmptyObject)
      if (allEmpty) {
        toast({ title: "Nothing to submit", description: "Please fill at least one field or upload an image.", variant: "destructive" })
        return
      }

      setSubmitting(true)
      const payload: AnyObj = {
        passport_front: passportFront,
        passport_back: passportBack,
        aadhar,
        pan,
        photo,
        payment: paymentInfo,
      }
      if (sequence && sequence > 0) payload.sequence = sequence
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Save failed")
      toast({ title: "Saved", description: sequence ? `Row #${sequence} updated.` : "Record stored; images removed." })
    } catch (e: any) {
      toast({ title: "Submit failed", description: e?.message || "Try again.", variant: "destructive" })
    } finally {
      setSubmitting(false)
      setPassportFront({})
      setPassportBack({})
      setAadhar({})
      setPan({})
      setPhoto({})
      setSequence(null)
      setResults([])
      setQuery("")
      setPaymentData(null)
    }
  }

  async function handleSubmit() {
    // Prevent opening payment when form is empty
    const isEmptyObject = (obj: AnyObj | null | undefined) => {
      if (!obj || typeof obj !== "object") return true
      return Object.values(obj).every((v) => v === undefined || v === null || String(v).trim?.() === "")
    }
    const allEmpty = [passportFront, passportBack, aadhar, pan, photo].every(isEmptyObject)
    if (allEmpty) {
      toast({ title: "Nothing to submit", description: "Please fill at least one field or upload an image.", variant: "destructive" })
      return
    }
    
    // If unlocked, bypass payment locally
    if (unlocked) {
      await submitWith({ paymentDone: true, amount: 0, bypassPasswordUsed: true })
      return
    }
    // If payment is not done yet, open payment modal; otherwise submit with existing payment data
    if (!paymentData) {
      setShowPayment(true)
      return
    }
    await submitWith(paymentData)
  }

  async function handleSearch() {
    try {
      if (!unlocked) {
        toast({ title: "Locked", description: "Enter the password to unlock first." })
        return
      }
      const q = query.trim()
      if (!q) return
      setSearching(true)
      const res = await fetch(`/api/sheets/search?q=${encodeURIComponent(q)}`, { headers: { "x-app-pass": password } })
      const json = await res.json()
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Search failed")
      setResults(json.results || [])
      if ((json.results || []).length === 0) {
        toast({ title: "No matches", description: "Type a broader value (name, mobile, passport no)." })
      }
    } catch (e: any) {
      toast({ title: "Search error", description: e?.message || "Try again.", variant: "destructive" })
    } finally {
      setSearching(false)
    }
  }

  function loadResult(r: SearchResult) {
    const doc = r.document || {}
    setPassportFront(doc.passport_front || {})
    setPassportBack(doc.passport_back || {})
    setAadhar(doc.aadhar || {})
    setPan(doc.pan || {})
    setPhoto(doc.photo || {})
    setSequence(r.sequence)
    toast({ title: "Loaded from sheet", description: `Editing row #${r.sequence}` })
  }

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-[#1B5E20]/90 via-[#4CAF50]/80 to-[#FFEB3B]/60 backdrop-blur supports-[backdrop-filter]:bg-opacity-90">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="h-auto flex items-center gap-3">
            <BigSmileLogo size="xl" imageSrc="/logo.png" showText={false} />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="relative w-40">
                <Input
                  placeholder="Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (passwordError) setPasswordError("") }}
                  className="pr-9"
                />
                {passwordError ? (
                  <div className="absolute -bottom-5 left-0 w-full text-xs text-destructive">
                    {passwordError}
                  </div>
                ) : null}
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button type="button" variant={unlocked ? "secondary" : "default"} onClick={handleUnlock}>
                {unlocked ? <Unlock className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                {unlocked ? "Unlocked" : "Unlock"}
              </Button>
            </div>
            <Button variant="outline" onClick={() => (window.location.href = process.env.NEXT_PUBLIC_SHEET_URL || "/api/export") } disabled={!unlocked}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Open Spreadsheet
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              <Send className="h-4 w-4 mr-2" />
              {submitting ? "Submitting..." : (sequence ? "Update" : "Submit")}
            </Button>
            {paymentData && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CreditCard className="h-4 w-4" />
                {paymentData.bypassPasswordUsed ? "Bypassed" : `Paid ₹${paymentData.amount}`}
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-balance">Upload and Extract Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Input placeholder="Search by name, mobile, passport, PAN, REF..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }} />
                <Button type="button" variant="secondary" onClick={handleSearch} disabled={searching || !unlocked}>
                  <Search className="h-4 w-4 mr-2" />
                  {searching ? "Searching..." : "Search"}
                </Button>
              </div>
              {results.length > 0 ? (
                <div className="text-sm text-muted-foreground">
                  {results.slice(0, 5).map((r, idx) => (
                    <button key={idx} className="block w-full text-left px-3 py-1.5 rounded hover:bg-muted" onClick={() => loadResult(r)}>
                      Row #{r.sequence}: {(r.values || []).filter(Boolean).slice(0, 4).join(" • ")}
                    </button>
                  ))}
                  {results.length > 5 ? <div className="px-3 py-1.5">+{results.length - 5} more</div> : null}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Upload images for Passport Front & Back, Aadhaar, and PAN. The AI will pre-fill fields; review and edit if needed. Submit to store in Data and append to the Excel export. 
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DocumentSection type="passport_front" value={passportFront} onChange={setPassportFront} />
          <DocumentSection type="passport_back" value={passportBack} onChange={setPassportBack} />
          <DocumentSection type="aadhar" value={aadhar} onChange={setAadhar} />
          <DocumentSection type="pan" value={pan} onChange={setPan} />
          {/* New: traveler photo card */}
          <PhotoSection value={photo} onChange={setPhoto} />
          {/* Payment Method Card (hidden when unlocked) */}
          {!unlocked && (
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!paymentData ? (
                <div className="space-y-3">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      Payment required to submit form
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      ₹1
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowPayment(true)}
                    className="w-full"
                    size="lg"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Proceed to Payment
                  </Button>
                  <div className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPayment(true)}
                      className="text-xs text-muted-foreground"
                    >
                      <Lock className="h-3 w-3 mr-1" />
                      Admin Bypass
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
                      <CreditCard className="h-5 w-5" />
                      <span className="font-semibold">Payment Completed</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {paymentData.bypassPasswordUsed ? "Payment bypassed using admin password" : `Amount paid: ₹${paymentData.amount}`}
                    </p>
                    {paymentData.paymentId && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Payment ID: {paymentData.paymentId}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPaymentData(null)
                      toast({
                        title: "Payment Reset",
                        description: "You can now proceed with a new payment.",
                      })
                    }}
                    className="w-full"
                  >
                    Reset Payment
                  </Button>
                </div>
              )}
              <div className="text-xs text-muted-foreground text-center">
                <p>Secure payment powered by Razorpay</p>
              </div>
            </CardContent>
          </Card>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {paymentData && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CreditCard className="h-4 w-4" />
                {paymentData.bypassPasswordUsed ? "Payment Bypassed" : `Payment: ₹${paymentData.amount}`}
              </div>
            )}
          </div>
          <Button onClick={handleSubmit} disabled={submitting}>
            <Send className="h-6 w-6 mr-2" />
            {submitting ? "Submitting..." : (sequence ? "Update" : "Submit")}
          </Button>
        </div>
      </section>

      {/* Payment Modal (hidden when unlocked) */}
      {!unlocked && showPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-md w-full">
            <PaymentComponent
              amount={1} // Set your desired amount here
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
            />
            <div className="p-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowPayment(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}