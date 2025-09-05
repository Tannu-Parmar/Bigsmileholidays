"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { UploadCloud } from "lucide-react"

export function FileDrop({
  onFile,
  accept = "image/*",
  label,
}: {
  onFile: (file: File) => void
  accept?: string
  label?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  return (
    <div className="space-y-2">
      {label ? <p className="text-sm text-muted-foreground">{label}</p> : null}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          const f = e.dataTransfer.files?.[0]
          if (f) onFile(f)
        }}
        className={cn(
          "rounded-lg border border-dashed p-6 text-center bg-card/40 transition-colors",
          over ? "border-primary bg-primary/5" : "border-muted-foreground/30",
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <UploadCloud className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">Drag and drop files to upload</p>
          <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
            Select file
          </Button>
          <p className="text-xs text-muted-foreground">Supports JPG, JPEG, PNG • Max ~5MB</p>
        </div>
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept={accept}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onFile(f)
          }}
        />
      </div>
    </div>
  )
}
