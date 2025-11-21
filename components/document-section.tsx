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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import Cropper from "react-easy-crop"
import "react-easy-crop/react-easy-crop.css"
import { Slider } from "@/components/ui/slider"

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
  passport_back: [
    "fatherName",
    "motherName",
    "spouseName",
    "address",
    "mobileNumber",
    "email",
    "ref",
    "ff6E",
    "ffEK",
    "ffEY",
    "ffAI",
    "ffSQ",
    "ffQR",
  ],
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

// Custom labels to match exact UI requirements
const CUSTOM_LABELS: Record<string, string> = {
  ref: "Reference",
  ff6E: "FF 6E",
  ffEK: "FF EK",
  ffEY: "FF EY",
  ffSQ: "FF SQ",
  ffAI: "FF AI",
  ffQR: "FF QR",
}

function displayLabel(key: string) {
  return CUSTOM_LABELS[key] ?? labelize(key)
}

// Manual-only fields must not be auto-filled by extraction
const MANUAL_ONLY_FIELDS: Record<DocType, Set<string>> = {
  passport_front: new Set<string>([]),
  passport_back: new Set<string>([
    "mobileNumber",
    "email",
    "ref",
    "ff6E",
    "ffEK",
    "ffEY",
    "ffSQ",
    "ffAI",
    "ffQR",
  ]),
  aadhar: new Set<string>([]),
  pan: new Set<string>([]),
}

function stripManualOnly(type: DocType, data: AnyObj | null | undefined): AnyObj {
  const blocked = MANUAL_ONLY_FIELDS[type]
  if (!data || !blocked?.size) return data || {}
  const cleaned: AnyObj = {}
  for (const [k, v] of Object.entries(data)) {
    if (!blocked.has(k)) cleaned[k] = v
  }
  return cleaned
}

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

  // Crop state
  const [cropOpen, setCropOpen] = useState(false)
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [cropZoom, setCropZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    width: number
    height: number
    x: number
    y: number
  } | null>(null)
  const [cropBusy, setCropBusy] = useState(false)

  useEffect(() => {
    // Sync from parent value when it changes (e.g., after search load)
    if (value?.imageUrl) {
      setImageUrl(value.imageUrl)
      setPublicId(value.publicId || null)
      return
    }
    // If no imageUrl in value, clear local state
    setImageUrl(null)
    setPublicId(null)
    setZoom(1)
    setRotation(0)
  }, [value?.imageUrl, value?.publicId])

  function getRadianAngle(degreeValue: number) {
    return (degreeValue * Math.PI) / 180
  }

  async function getCroppedImg(
    imageSrc: string,
    pixelCrop: { x: number; y: number; width: number; height: number },
    rotationDeg = 0,
  ): Promise<Blob> {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = imageSrc
    })

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas not supported")

    const rotation = getRadianAngle(rotationDeg)
    const { width: bBoxWidth, height: bBoxHeight } = {
      width: Math.abs(Math.cos(rotation) * image.width) + Math.abs(Math.sin(rotation) * image.height),
      height: Math.abs(Math.sin(rotation) * image.width) + Math.abs(Math.cos(rotation) * image.height),
    }

    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    // translate canvas context to a central location to allow rotating around the center.
    ctx.translate(-pixelCrop.x, -pixelCrop.y)
    ctx.translate(bBoxWidth / 2, bBoxHeight / 2)
    ctx.rotate(rotation)
    ctx.translate(-image.width / 2, -image.height / 2)
    ctx.drawImage(image, 0, 0)

    return await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob as Blob), "image/jpeg", 0.95)
    })
  }

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
      setImageUrl(upJson.previewUrl || upJson.url)
      setPublicId(upJson.publicId)
      setZoom(1)
      setRotation(0)

      // 2) Classify document/page
      let detectedType: string | null = null
      let detectedPageUrl: string | null = null
      try {
        const clsFd = new FormData()
        if (upJson.isPdf) {
          clsFd.append("publicId", upJson.publicId)
          clsFd.append("isPdf", "true")
        }
        if (upJson.previewUrl) clsFd.append("imageUrl", upJson.previewUrl)
        const clsRes = await fetch("/api/classify", { method: "POST", body: clsFd })
        const clsJson = await clsRes.json()
        if (clsRes.ok) {
          if (Array.isArray(clsJson?.results) && clsJson.results.length) {
            const results = (clsJson.results as any[]).filter(Boolean)

            // Prefer exact type match with highest confidence
            const matching = results
              .filter((r) => r?.type === type)
              .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))

            let chosen = matching[0]

            if (!chosen && results.length >= 2 && (type === "passport_front" || type === "passport_back")) {
              // If one page is front and the other is back, pick the correct one deterministically
              const frontCandidate = [...results]
                .filter((r) => r?.type === "passport_front")
                .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0]
              const backCandidate = [...results]
                .filter((r) => r?.type === "passport_back")
                .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0]

              if (type === "passport_front" && frontCandidate) chosen = frontCandidate
              if (type === "passport_back" && backCandidate) chosen = backCandidate

              // If both pages classified identically (both front or both back), tie-break by page number:
              if (!chosen) {
                const byConfidence = [...results].sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
                const page1 = byConfidence.find((r) => r?.page === 1)
                const page2 = byConfidence.find((r) => r?.page === 2)
                if (type === "passport_front") chosen = page1 || byConfidence[0]
                if (type === "passport_back") chosen = page2 || byConfidence[0]
              }
            }

            // Final fallback: highest confidence overall
            if (!chosen) {
              chosen = [...results].sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0]
            }

            detectedType = chosen?.type || null
            detectedPageUrl = chosen?.pageImageUrl || null
          } else if (clsJson?.type) {
            detectedType = clsJson.type
            detectedPageUrl = clsJson.pageImageUrl || (upJson.previewUrl || upJson.url)
          }
        }
      } catch {}

      if (detectedPageUrl) setImageUrl(detectedPageUrl)

      // If we found pages but none matched the current section, warn and skip
      if (detectedType && detectedType !== "unknown" && detectedType !== type) {
        toast({ title: "Detected different document", description: `Detected ${labelize(detectedType.replace(/_/g, " "))}. Switch to that section for best results.`, variant: "destructive" })
        return
      }

      // 3) Extract with AI
      const fd = new FormData()
      fd.append("type", type)
      if (upJson.previewUrl) {
        fd.append("imageUrl", detectedPageUrl || upJson.previewUrl)
      } else {
        fd.append("file", file)
      }
      const res = await fetch("/api/extract", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Extraction failed")

      const extracted = stripManualOnly(type, json?.data)
      const finalImageUrl = detectedPageUrl || upJson.previewUrl || upJson.url
      onChange({ ...value, ...extracted, imageUrl: finalImageUrl, publicId: upJson.publicId })
      toast({ title: "Uploaded & Extracted", description: `Fields filled from ${file.name}` })
    } catch (e: any) {
      toast({ title: "Upload/Extract failed", description: e?.message || "Try again.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  function onCropComplete(_: any, areaPixels: { width: number; height: number; x: number; y: number }) {
    setCroppedAreaPixels(areaPixels)
  }

  async function applyCrop({ reextract }: { reextract: boolean }) {
    if (!imageUrl || !croppedAreaPixels) return
    try {
      setCropBusy(true)
      const blob = await getCroppedImg(imageUrl, croppedAreaPixels, rotation)
      const croppedFile = new File([blob], `cropped-${fileName || type}.jpg`, { type: "image/jpeg" })

      // Optional: remove previous upload
      try {
        if (publicId) await fetch("/api/upload", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publicId }) })
      } catch {}

      // Upload cropped image
      const up = new FormData()
      up.append("file", croppedFile)
      up.append("folder", `id-ocr-docs/${type}`)
      const upRes = await fetch("/api/upload", { method: "POST", body: up })
      const upJson = await upRes.json()
      if (!upRes.ok) throw new Error(upJson?.error || "Crop upload failed")

      setImageUrl(upJson.previewUrl || upJson.url)
      setPublicId(upJson.publicId)
      setZoom(1)
      setCropOpen(false)

      if (reextract) {
        setLoading(true)
        const fd = new FormData()
        fd.append("type", type)
        if (upJson.previewUrl) {
          fd.append("imageUrl", upJson.previewUrl)
        } else {
          fd.append("file", croppedFile)
        }
        const res = await fetch("/api/extract", { method: "POST", body: fd })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || "Extraction failed")
        const extracted = stripManualOnly(type, json?.data)
        onChange({ ...value, ...extracted, imageUrl: upJson.previewUrl || upJson.url, publicId: upJson.publicId })
        toast({ title: "Cropped & Re-extracted", description: `Fields updated from cropped image` })
      } else {
        onChange({ ...value, imageUrl: upJson.previewUrl || upJson.url, publicId: upJson.publicId })
        toast({ title: "Cropped", description: `Applied crop to image` })
      }
    } catch (e: any) {
      toast({ title: "Crop failed", description: e?.message || "Try again.", variant: "destructive" })
    } finally {
      setCropBusy(false)
      setLoading(false)
    }
  }

  // Sync with parent clears (e.g., after successful submit)
  useEffect(() => {
    if (!value?.imageUrl) {
      setImageUrl(null)
      setPublicId(null)
      setFileName(null)
    }
  }, [value?.imageUrl])

  return (
    <>
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
                  <Button type="button" variant="secondary" onClick={() => { setCrop({ x: 0, y: 0 }); setCropZoom(1); setCropOpen(true) }}>Crop</Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={async () => {
                      try {
                        if (publicId) await fetch("/api/upload", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publicId }) })
                      } catch {}
                      setImageUrl(null)
                      setPublicId(null)
                      // Clear all related extracted fields when image is removed
                      onChange({})
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
                {(() => {
                  const fieldId = `${type}-${k}`
                  return (
                    <>
                      <Label htmlFor={fieldId}>{displayLabel(k)}</Label>
                      {isTextarea(k) ? (
                        <Textarea
                          id={fieldId}
                          value={value?.[k] || ""}
                          onChange={(e) => onChange({ ...value, [k]: e.target.value })}
                          placeholder={`Enter ${displayLabel(k)}`}
                        />
                      ) : (
                        <Input
                          id={fieldId}
                          value={value?.[k] || ""}
                          onChange={(e) => onChange({ ...value, [k]: e.target.value })}
                          placeholder={`Enter ${displayLabel(k)}`}
                        />
                      )}
                    </>
                  )
                })()}
              </div>
            ))}
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Crop Dialog */}
      <Dialog open={cropOpen} onOpenChange={setCropOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Crop Image</DialogTitle>
            <DialogDescription>
              Drag to adjust the crop box. Use Zoom and Rotation to refine the area.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative h-[360px] w-full bg-muted overflow-hidden rounded">
              {imageUrl ? (
                <Cropper
                  image={imageUrl}
                  crop={crop}
                  zoom={cropZoom}
                  rotation={rotation}
                  aspect={4 / 3}
                  onCropChange={setCrop}
                  onZoomChange={setCropZoom}
                  onCropComplete={onCropComplete}
                />
              ) : null}
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Zoom</div>
              <Slider min={1} max={3} step={0.1} value={[cropZoom]} onValueChange={(v) => setCropZoom(v[0] ?? 1)} />
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Rotation</div>
              <Slider min={0} max={360} step={1} value={[rotation]} onValueChange={(v) => setRotation(v[0] ?? 0)} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="secondary" onClick={() => setCropOpen(false)} disabled={cropBusy}>Cancel</Button>
            <Button type="button" variant="outline" onClick={() => applyCrop({ reextract: false })} disabled={cropBusy}>
              {cropBusy ? "Applying..." : "Apply Crop"}
            </Button>
            <Button type="button" onClick={() => applyCrop({ reextract: true })} disabled={cropBusy}>
              {cropBusy ? "Re-extracting..." : "Apply & Re-extract"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  ) 
}

export function PhotoSection({ value, onChange }: { value: AnyObj; onChange: (v: AnyObj) => void }) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(value?.imageUrl || null)
  const [publicId, setPublicId] = useState<string | null>(value?.publicId || null)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [cropOpen, setCropOpen] = useState(false)
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [cropZoom, setCropZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    width: number
    height: number
    x: number
    y: number
  } | null>(null)
  const [cropBusy, setCropBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Sync from parent when search result loads
  useEffect(() => {
    if (value?.imageUrl) {
      setImageUrl(value.imageUrl)
      setPublicId(value.publicId || null)
      return
    }
    setImageUrl(null)
    setPublicId(null)
    setZoom(1)
    setRotation(0)
  }, [value?.imageUrl, value?.publicId])

  function getRadianAngle(degreeValue: number) {
    return (degreeValue * Math.PI) / 180
  }

  async function getCroppedImg(
    imageSrc: string,
    pixelCrop: { x: number; y: number; width: number; height: number },
    rotationDeg = 0,
  ): Promise<Blob> {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = imageSrc
    })

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas not supported")

    const rotation = getRadianAngle(rotationDeg)
    const { width: bBoxWidth, height: bBoxHeight } = {
      width: Math.abs(Math.cos(rotation) * image.width) + Math.abs(Math.sin(rotation) * image.height),
      height: Math.abs(Math.sin(rotation) * image.width) + Math.abs(Math.cos(rotation) * image.height),
    }

    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    ctx.translate(-pixelCrop.x, -pixelCrop.y)
    ctx.translate(bBoxWidth / 2, bBoxHeight / 2)
    ctx.rotate(rotation)
    ctx.translate(-image.width / 2, -image.height / 2)
    ctx.drawImage(image, 0, 0)

    return await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob as Blob), "image/jpeg", 0.95)
    })
  }

  async function onFile(file: File) {
    try {
      setLoading(true)
      setFileName(file.name)
      const up = new FormData()
      up.append("file", file)
      up.append("folder", "id-ocr-docs/photo")
      const upRes = await fetch("/api/upload", { method: "POST", body: up })
      const upJson = await upRes.json()
      if (!upRes.ok) throw new Error(upJson?.error || "Upload failed")
      const url = upJson.previewUrl || upJson.url
      setImageUrl(url)
      setPublicId(upJson.publicId)
      setZoom(1)
      setRotation(0)
      onChange({ ...value, imageUrl: url, publicId: upJson.publicId })
      toast({ title: "Photo uploaded", description: file.name })
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message || "Try again.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  function onCropComplete(_: any, areaPixels: { width: number; height: number; x: number; y: number }) {
    setCroppedAreaPixels(areaPixels)
  }

  async function applyCrop() {
    if (!imageUrl || !croppedAreaPixels) return
    try {
      setCropBusy(true)
      setLoading(true)
      const blob = await getCroppedImg(imageUrl, croppedAreaPixels, rotation)
      const croppedFile = new File([blob], `photo-cropped-${fileName || "photo"}.jpg`, { type: "image/jpeg" })

      // Optional: remove previous upload
      try {
        if (publicId) await fetch("/api/upload", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publicId }) })
      } catch {}

      const up = new FormData()
      up.append("file", croppedFile)
      up.append("folder", "id-ocr-docs/photo")
      const upRes = await fetch("/api/upload", { method: "POST", body: up })
      const upJson = await upRes.json()
      if (!upRes.ok) throw new Error(upJson?.error || "Crop upload failed")

      const url = upJson.previewUrl || upJson.url
      setImageUrl(url)
      setPublicId(upJson.publicId)
      setZoom(1)
      setCropOpen(false)
      onChange({ ...value, imageUrl: url, publicId: upJson.publicId })
      toast({ title: "Cropped", description: `Applied crop to photo` })
    } catch (e: any) {
      toast({ title: "Crop failed", description: e?.message || "Try again.", variant: "destructive" })
    } finally {
      setCropBusy(false)
      setLoading(false)
    }
  }

  // Sync with parent clears (e.g., after successful submit)
  useEffect(() => {
    if (!value?.imageUrl) {
      setImageUrl(null)
      setPublicId(null)
      setFileName(null)
    }
  }, [value?.imageUrl])

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Passport Size Photo</CardTitle>
        {fileName ? <span className="text-xs text-muted-foreground">From: {fileName}</span> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {!imageUrl ? <FileDrop onFile={onFile} label="Passport Size Photo" accept="image/*" /> : null}
        {imageUrl ? (
          <div className="rounded border p-2 text-xs text-muted-foreground space-y-2">
            <div className="flex items-center justify-between">
              <div>Preview</div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setZoom((z) => Math.min(3, z + 0.2))}>Zoom In</Button>
                <Button type="button" variant="secondary" onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}>Zoom Out</Button>
                <Button type="button" variant="secondary" onClick={() => setRotation((r) => (r + 90) % 360)}>Rotate</Button>
                <Button type="button" variant="secondary" onClick={() => { setCrop({ x: 0, y: 0 }); setCropZoom(1); setCropOpen(true) }}>Crop</Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={async () => {
                    try {
                      if (publicId) await fetch("/api/upload", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publicId }) })
                    } catch {}
                    setImageUrl(null)
                    setPublicId(null)
                    // Clear related fields when image removed
                    onChange({})
                  }}
                >
                  Remove
                </Button>
              </div>
            </div>
            <div className="overflow-auto">
              <img
                src={imageUrl}
                alt={`passport photo preview`}
                className="mx-auto max-h-72"
                style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, transformOrigin: "center" }}
              />
            </div>
          </div>
        ) : null}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </div>
        ) : null}
      </CardContent>

      {/* Crop Dialog */}
      <Dialog open={cropOpen} onOpenChange={setCropOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Crop Image</DialogTitle>
            <DialogDescription>
              Drag to adjust the crop box. Use Zoom and Rotation to refine the area.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative h-[360px] w-full bg-muted overflow-hidden rounded">
              {imageUrl ? (
                <Cropper
                  image={imageUrl}
                  crop={crop}
                  zoom={cropZoom}
                  rotation={rotation}
                  aspect={4 / 3}
                  onCropChange={setCrop}
                  onZoomChange={setCropZoom}
                  onCropComplete={onCropComplete}
                />
              ) : null}
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Zoom</div>
              <Slider min={1} max={3} step={0.1} value={[cropZoom]} onValueChange={(v) => setCropZoom(v[0] ?? 1)} />
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Rotation</div>
              <Slider min={0} max={360} step={1} value={[rotation]} onValueChange={(v) => setRotation(v[0] ?? 0)} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="secondary" onClick={() => setCropOpen(false)} disabled={cropBusy}>Cancel</Button>
            <Button type="button" onClick={applyCrop} disabled={cropBusy}>
              {cropBusy ? "Applying..." : "Apply Crop"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
