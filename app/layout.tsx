import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { DisplayModeProvider } from '@/context/DisplayModeContext'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  // Load the weights we actually use
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'Velquor',
  description: 'Your trading operating system — powered by VELQUOR AI',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Velquor',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0A0E14',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${inter.variable}`}>
      <body className="h-full" style={{ overflow: 'hidden' }}>
        <DisplayModeProvider>{children}</DisplayModeProvider>
      </body>
    </html>
  )
}
