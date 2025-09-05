"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FileDrop } from "@/components/file-drop"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Loader2, Award as IdCard } from "lucide-react"

type DocType = "passport_front" | "passport_back" | "aadhar" | "pan"
type AnyObj = Record<string, any>

const TITLES: Record<DocType, string> = {
  passport_front: "Passport Front Page",
  passport_back: "Passport Back Page",
  aadhar: "Aadhaar Card",
  pan: "PAN Card",
}

const FIELDS: Record<DocType, string[]> = {
  passport_front: [
    "passportNumber",
    "firstName",
    "lastName",
    "nationality",
    "sex",
    "dateOfBirth",
    "placeOfBirth",
    "placeOfIssue",
    "maritalStatus",
    "dateOfIssue",
    "dateOfExpiry",
  ],
  passport_back: ["fatherName", "motherName", "spouseName", "address"],
  aadhar: ["aadhaarNumber", "name", "dateOfBirth", "gender", "address"],
  pan: ["panNumber", "name", "fatherName", "dateOfBirth"],
}

function labelize(s: string) {
  return s
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase())
}
const isTextarea = (k: string) => /address/i.test(k)

export function DocumentSection({
  type,
  value,
  onChange,
}: {
  type: DocType
  value: AnyObj
  onChange: (v: AnyObj) => void
}) {
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [publicId, setPublicId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const { toast } = useToast()

  useEffect(() => {
    if (!value?.imageUrl) {
      setImageUrl(null)
      setPublicId(null)
      setZoom(1)
      setRotation(0)
    }
  }, [value?.imageUrl])

  async function onFile(file: File) {
    try {
      setLoading(true)
      setFileName(file.name)

      // 1) Upload to Cloudinary
      const up = new FormData()
      up.append("file", file)
      up.append("folder", `id-ocr-docs/${type}`)
      const upRes = await fetch("/api/upload", { method: "POST", body: up })
      const upJson = await upRes.json()
      if (!upRes.ok) throw new Error(upJson?.error || "Upload failed")
      setImageUrl(upJson.url)
      setPublicId(upJson.publicId)
      setZoom(1)
      setRotation(0)

      // 2) Extract with AI
      const fd = new FormData()
      fd.append("type", type)
      fd.append("file", file)
      const res = await fetch("/api/extract", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Extraction failed")

      onChange({ ...value, ...(json?.data || {}), imageUrl: upJson.url, publicId: upJson.publicId })
      toast({ title: "Uploaded & Extracted", description: `Fields filled from ${file.name}` })
    } catch (e: any) {
      toast({ title: "Upload/Extract failed", description: e?.message || "Try again.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <IdCard className="h-5 w-5 text-primary" />
          {TITLES[type]}
        </CardTitle>
        {fileName ? <span className="text-xs text-muted-foreground">From: {fileName}</span> : null}
      </CardHeader>
      <CardContent className="space-y-6">
        {!imageUrl ? <FileDrop onFile={onFile} label={`${TITLES[type]} Image`} /> : null}
        {imageUrl ? (
          <div className="rounded border p-2 text-xs text-muted-foreground space-y-2">
            <div className="flex items-center justify-between">
              <div>Preview</div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setZoom((z) => Math.min(3, z + 0.2))}>Zoom In</Button>
                <Button type="button" variant="secondary" onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}>Zoom Out</Button>
                <Button type="button" variant="secondary" onClick={() => setRotation((r) => (r + 90) % 360)}>Rotate</Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={async () => {
                    try {
                      if (publicId) await fetch("/api/upload", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publicId }) })
                    } catch {}
                    setImageUrl(null)
                    setPublicId(null)
                  }}
                >
                  Remove
                </Button>
              </div>
            </div>
            <div className="overflow-auto">
              <img
                src={imageUrl}
                alt={`${type} preview`}
                className="mx-auto max-h-72"
                style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, transformOrigin: "center" }}
              />
            </div>
          </div>
        ) : null}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FIELDS[type].map((k) => (
            <div key={k} className="space-y-2">
              <Label htmlFor={`${type}-${k}`}>{labelize(k)}</Label>
              {isTextarea(k) ? (
                <Textarea
                  id={`${type}-${k}`}
                  value={value?.[k] || ""}
                  onChange={(e) => onChange({ ...value, [k]: e.target.value })}
                  placeholder={`Enter ${labelize(k).toLowerCase()}`}
                />
              ) : (
                <Input
                  id={`${type}-${k}`}
                  value={value?.[k] || ""}
                  onChange={(e) => onChange({ ...value, [k]: e.target.value })}
                  placeholder={`Enter ${labelize(k).toLowerCase()}`}
                />
              )}
            </div>
          ))}
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Extracting fields...
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
