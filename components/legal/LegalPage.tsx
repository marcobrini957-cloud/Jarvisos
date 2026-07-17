'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export function LegalSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--t3)', margin: '0 0 12px' }}>
        {heading}
      </h2>
      <div style={{ color: 'var(--t2)', fontSize: '14px', lineHeight: 1.7 }}>
        {children}
      </div>
    </section>
  )
}

export function LegalPage({ title, subtitle, children }: {
  title: string
  subtitle: string
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
    <div style={{ background: 'var(--bg)', color: 'var(--t1)', minHeight: '100dvh', padding: 'clamp(40px, 8vw, 80px) clamp(16px, 5vw, 48px)' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>

        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--t3)', fontSize: '13px', textDecoration: 'none', marginBottom: '40px' }}>
          ← Back
        </Link>

        <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 8px', color: 'var(--t1)' }}>
          {title}
        </h1>
        <p style={{ color: 'var(--t3)', fontSize: '13px', margin: '0 0 40px' }}>
          {subtitle}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {children}
        </div>

        <div style={{ borderTop: '1px solid var(--bd)', marginTop: '48px', paddingTop: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <p style={{ color: 'var(--t3)', fontSize: '12px', margin: 0 }}>© 2026 Velquor</p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <Link href="/impressum" style={{ color: 'var(--t3)', fontSize: '12px', textDecoration: 'none' }}>Impressum</Link>
            <Link href="/privacy" style={{ color: 'var(--t3)', fontSize: '12px', textDecoration: 'none' }}>Privacy</Link>
            <Link href="/terms" style={{ color: 'var(--t3)', fontSize: '12px', textDecoration: 'none' }}>Terms</Link>
          </div>
        </div>

      </div>
    </div>
  )
}
