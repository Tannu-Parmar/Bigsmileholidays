import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Big Smile Holidays',
  description: 'Big Smile Holidays Pvt. Ltd.',
  icons: {
    icon: '/placeholder-big-logo.webp',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} bg-gradient-to-r from-[#1B5E20]/90 via-[#4CAF50]/80 to-[#FFEB3B]/60 bg-fixed min-h-screen`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
