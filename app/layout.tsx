import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

export const metadata: Metadata = {
  title: 'Big Smile Holidays',
  description: 'Big Smile Holidays Pvt. Ltd.',
  icons: {
    icon: '/placeholder-big-logo.webp',
  },
}

const shouldEnableAnalytics =
  process.env.NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS === 'true' ||
  process.env.NODE_ENV === 'production'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} bg-gradient-to-r from-[#1B5E20]/90 via-[#4CAF50]/80 to-[#FFEB3B]/60 bg-fixed min-h-screen`}>
        {children}
        {shouldEnableAnalytics && <Analytics />}
        <Toaster />
      </body>
    </html>
  )
}
