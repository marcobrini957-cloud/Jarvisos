'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function ImpressumPage() {
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
          Impressum
        </h1>
        <p style={{ color: 'var(--t3)', fontSize: '13px', margin: '0 0 40px' }}>
          Angaben gemäß § 25 MedienG und § 5 ECG (Österreich)
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

          <section>
            <h2 style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--t3)', margin: '0 0 12px' }}>
              Medieninhaber &amp; Herausgeber
            </h2>
            <div style={{ color: 'var(--t1)', fontSize: '15px', lineHeight: 2 }}>
              <p style={{ margin: 0 }}>Marco Brini</p>
              <p style={{ margin: 0 }}>Ägydygasse 14</p>
              <p style={{ margin: 0 }}>8020 Graz</p>
              <p style={{ margin: 0 }}>Österreich (Austria)</p>
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--t3)', margin: '0 0 12px' }}>
              Kontakt
            </h2>
            <p style={{ margin: 0, color: 'var(--t1)', fontSize: '15px' }}>
              E-Mail:{' '}
              <a href="mailto:support@velquor.app" style={{ color: 'var(--ac)', textDecoration: 'none' }}>
                support@velquor.app
              </a>
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--t3)', margin: '0 0 12px' }}>
              Unternehmensgegenstand
            </h2>
            <p style={{ margin: 0, color: 'var(--t2)', fontSize: '14px', lineHeight: 1.7 }}>
              Betrieb der Online-Plattform Velquor — ein Trading-Dashboard für MT5-Händler.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--t3)', margin: '0 0 12px' }}>
              Haftungsausschluss
            </h2>
            <p style={{ margin: 0, color: 'var(--t2)', fontSize: '14px', lineHeight: 1.7 }}>
              Die Inhalte dieser Website dienen ausschließlich zu Informationszwecken und stellen keine Anlageberatung dar.
              Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links.
              Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
            </p>
          </section>

        </div>

        <div style={{ borderTop: '1px solid var(--bd)', marginTop: '48px', paddingTop: '24px' }}>
          <p style={{ color: 'var(--t3)', fontSize: '12px', margin: 0 }}>
            © 2026 Velquor ·{' '}
            <Link href="/" style={{ color: 'var(--t3)', textDecoration: 'none' }}>velquor.app</Link>
          </p>
        </div>

      </div>
    </div>
  )
}
