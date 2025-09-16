import React from "react"

interface BigSmileLogoProps {
  className?: string
  size?: "sm" | "md" | "lg" | "xl" | "2xl"
  tagline?: string
  imageSrc?: string
  showText?: boolean
}

export function BigSmileLogo({ className = "", size = "md", tagline = "Holidays Pvt. Ltd.", imageSrc, showText = true }: BigSmileLogoProps) {
  const sizeClasses = {
    sm: "h-8",
    md: "h-12",
    lg: "h-16",
    xl: "h-20",
    "2xl": "h-28",
  }

  const textSizeClasses = {
    sm: "text-base",
    md: "text-2xl",
    lg: "text-3xl",
    xl: "text-4xl",
    "2xl": "text-5xl",
  }

  const subtextSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
    xl: "text-lg",
    "2xl": "text-xl",
  }

  const iconWidthClasses = {
    sm: "w-10",
    md: "w-12",
    lg: "w-16",
    xl: "w-20",
    "2xl": "w-28",
  }

  const imageHeightClasses = {
    sm: "h-8",
    md: "h-12",
    lg: "h-16",
    xl: "h-20",
    "2xl": "h-28",
  }

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Mark: icon/image */}
      {imageSrc ? (
        <img
          src={imageSrc}
          alt="Big Smile Logo"
          className={`${imageHeightClasses[size]} w-auto flex-shrink-0`}
        />
      ) : (
        <div className={`${sizeClasses[size]} ${iconWidthClasses[size]} flex-shrink-0`}>
          <svg viewBox="0 0 48 48" className="w-full h-full">
            {/* Background colored bands */}
            <rect x="0" y="0" width="48" height="16" fill="#1B5E20" rx="8" ry="8" />
            <rect x="0" y="16" width="48" height="16" fill="#4CAF50" rx="8" ry="8" />
            <rect x="0" y="32" width="48" height="16" fill="#FFEB3B" rx="8" ry="8" />
            
            {/* White S cutout */}
            <path
              d="M24 8 C32 8, 40 12, 40 20 C40 24, 36 28, 32 28 C28 28, 24 24, 24 20 C24 16, 28 12, 32 12 C36 12, 40 16, 40 20 M24 28 C16 28, 8 32, 8 40 C8 44, 12 48, 16 48 C20 48, 24 44, 24 40 C24 36, 20 32, 16 32 C12 32, 8 36, 8 40"
              fill="white"
              stroke="white"
              strokeWidth="2"
            />
          </svg>
        </div>
      )}

      {/* Text */}
      {showText && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-baseline gap-2">
            <span className={`font-extrabold ${textSizeClasses[size]} text-[#1B5E20]`}>Big</span>
            <span className={`font-extrabold ${textSizeClasses[size]} text-[#FFEB3B]`}>Smile</span>
          </div>
          <span className={`italic ${subtextSizeClasses[size]} text-slate-500`}>{tagline}</span>
        </div>
      )}
    </div>
  )
}
