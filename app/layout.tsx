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
  metadataBase: new URL('https://velquor.app'),
  title: {
    default: 'Velquor — Your Trading Operating System',
    template: '%s · Velquor',
  },
  description:
    'Auto-sync every MT5 trade, get AI analysis of your real trading data, copy trades across accounts in seconds, and track prop firm rules in real time. Free forever plan — no card needed.',
  keywords: ['trading journal', 'MT5', 'MetaTrader 5', 'trade copier', 'prop firm tracker', 'AI trading analysis', 'trading dashboard'],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: 'https://velquor.app',
    siteName: 'Velquor',
    title: 'Velquor — Your Trading Operating System',
    description:
      'Every MT5 trade auto-logged, analysed by AI, and copied across your accounts. Built for serious traders.',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Velquor — Your Trading Operating System',
    description:
      'Every MT5 trade auto-logged, analysed by AI, and copied across your accounts. Built for serious traders.',
  },
  robots: { index: true, follow: true },
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
