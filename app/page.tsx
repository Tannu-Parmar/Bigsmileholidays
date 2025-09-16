"use client"

import { useState } from "react"
import { DocumentSection, PhotoSection } from "@/components/document-section"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { FileSpreadsheet, Send } from "lucide-react"
import { BigSmileLogo } from "@/components/big-smile-logo"

type AnyObj = Record<string, any>

export default function HomePage() {
  const [passportFront, setPassportFront] = useState<AnyObj>({})
  const [passportBack, setPassportBack] = useState<AnyObj>({})
  const [aadhar, setAadhar] = useState<AnyObj>({})
  const [pan, setPan] = useState<AnyObj>({})
  const [photo, setPhoto] = useState<AnyObj>({})
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  async function handleSubmit() {
    try {
      setSubmitting(true)
      const payload = {
        passport_front: passportFront,
        passport_back: passportBack,
        aadhar,
        pan,
        photo,
      }
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      
      if (!res.ok) throw new Error(json?.error || "Save failed")

      toast({ title: "Saved", description: "Record stored; images removed." })
      // Excel master file is saved automatically. Use Export button when needed.
    } catch (e: any) {
      toast({ title: "Submit failed", description: e?.message || "Try again.", variant: "destructive" })
    } finally {
      setSubmitting(false)
      setPassportFront({})
      setPassportBack({})
      setAadhar({})
      setPan({})
      setPhoto({})
    }
  }

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-[#1B5E20]/90 via-[#4CAF50]/80 to-[#FFEB3B]/60 backdrop-blur supports-[backdrop-filter]:bg-opacity-90">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="h-auto flex items-center gap-3">
            <BigSmileLogo size="xl" imageSrc="/logo.png" showText={false} />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => (window.location.href = process.env.NEXT_PUBLIC_SHEET_URL || "/api/export") }>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Open Spreadsheet
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              <Send className="h-4 w-4 mr-2" />
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-balance">Upload and Extract Details</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Upload images for Passport Front & Back, Aadhaar, and PAN. The AI will pre-fill fields; review and edit if
            needed. Submit to store in MongoDB and append to the Excel export.
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DocumentSection type="passport_front" value={passportFront} onChange={setPassportFront} />
          <DocumentSection type="passport_back" value={passportBack} onChange={setPassportBack} />
          <DocumentSection type="aadhar" value={aadhar} onChange={setAadhar} />
          <DocumentSection type="pan" value={pan} onChange={setPan} />
          {/* New: traveler photo card */}
          <PhotoSection value={photo} onChange={setPhoto} />
        </div>
        <div className="flex items-center justify-end">
          <Button onClick={handleSubmit} disabled={submitting}>
            <Send className="h-6 w-6 mr-2" />
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </section>

    </main>
  )
}