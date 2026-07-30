'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { openCookieSettings } from '@/components/CookieConsent'

export function LegalSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
        letterSpacing: '0.16em', textTransform: 'uppercase',
        color: 'var(--color-ink-3)', margin: '0 0 12px',
      }}>
        {heading}
      </h2>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)',
        color: 'var(--color-ink-2)', lineHeight: 1.75,
      }}>
        {children}
      </div>
    </section>
  )
}

export function LegalPage({ title, subtitle, altLang, children }: {
  title: string
  subtitle: string
  altLang?: { href: string; label: string }   // link to this document in the other language
  children: React.ReactNode
}) {
  // Root layout locks overflow:hidden for the dashboard — unlock it here
  useEffect(() => {
    document.body.style.overflow = 'auto'
    document.documentElement.style.overflow = 'auto'
    document.body.style.overflowX = 'hidden'
    document.documentElement.style.overflowX = 'hidden'
    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
      document.body.style.overflowX = ''
      document.documentElement.style.overflowX = ''
    }
  }, [])

  return (
    <div className="vq2" style={{ background: 'var(--bg)', color: 'var(--t1)', minHeight: '100dvh', padding: 'clamp(40px, 8vw, 80px) clamp(16px, 5vw, 48px)' }}>
      <div style={{ maxWidth: '720px' }}>

        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: 'var(--color-ink-3)', textDecoration: 'none', marginBottom: '40px',
        }}>
          ← Back
        </Link>

        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(26px, 3.2vw, 36px)',
          lineHeight: 1.05, letterSpacing: '-0.03em',
          margin: '0 0 10px', color: 'var(--color-ink-1)',
        }}>
          {title}
        </h1>
        <p style={{
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
          color: 'var(--color-ink-3)', margin: altLang ? '0 0 12px' : '0 0 40px',
        }}>
          {subtitle}
        </p>
        {altLang && (
          <p style={{ margin: '0 0 40px' }}>
            <Link href={altLang.href} style={{ color: 'var(--color-ink-1)', fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              {altLang.label} →
            </Link>
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {children}
        </div>

        <div style={{ borderTop: '1px solid var(--color-line-1)', marginTop: '48px', paddingTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)', margin: 0 }}>© 2026 Velquor</p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <Link href="/impressum" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', color: 'var(--color-ink-3)', textDecoration: 'none' }}>Impressum</Link>
            <Link href="/privacy" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', color: 'var(--color-ink-3)', textDecoration: 'none' }}>Privacy</Link>
            <Link href="/terms" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', color: 'var(--color-ink-3)', textDecoration: 'none' }}>Terms</Link>
            <Link href="/datenschutz" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', color: 'var(--color-ink-3)', textDecoration: 'none' }}>Datenschutz</Link>
            <Link href="/agb" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', color: 'var(--color-ink-3)', textDecoration: 'none' }}>AGB</Link>
            <button
              onClick={openCookieSettings}
              style={{ background: 'none', border: 'none', padding: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', color: 'var(--color-ink-3)', cursor: 'pointer' }}
            >
              Cookie settings
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
