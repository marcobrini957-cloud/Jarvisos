import type { Metadata, Viewport } from 'next'
import { DisplayModeProvider } from '@/context/DisplayModeContext'
import { CookieConsent } from '@/components/CookieConsent'
import './globals.css'

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
    // Without this every shared link unfurled as a bare text stub, while the
    // Twitter card below was already promising a large image. Regenerate with
    // `node scripts/og.mjs` — it renders in the product's own type.
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Velquor — your edge is already in your trades' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Velquor — Your Trading Operating System',
    description:
      'Every MT5 trade auto-logged, analysed by AI, and copied across your accounts. Built for serious traders.',
    images: ['/og.png'],
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
    <html lang="en" className="h-full">
      {/* Body is NOT scroll-locked. It used to be `overflow: hidden` so the
          dashboard's inner-scrolling layout could not double-scroll — but that
          silently clipped every ordinary page taller than the viewport, which is
          why the landing and login pages each had to set `body.style.overflow =
          'auto'` by hand, and why /pricing and /connect were unreachable below
          the fold. Containment belongs to the dashboard shell, which is sized to
          100dvh and scrolls its own <main>. */}
      <body className="h-full">
        <DisplayModeProvider>{children}</DisplayModeProvider>
        <CookieConsent />
      </body>
    </html>
  )
}
