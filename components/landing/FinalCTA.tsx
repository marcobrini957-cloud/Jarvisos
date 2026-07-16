'use client'

import Link from 'next/link'
import { useLocale } from '@/hooks/useLocale'

const BROKERS = ['IC Markets', 'Pepperstone', 'Blueberry', 'Vantage', 'FTMO', 'Eightcap', 'BlackBull', 'Axi']

export function FinalCTA() {
  const { t } = useLocale()
  const c = t.finalCta

  return (
    <section style={{ borderTop: '1px solid var(--bd)', background: 'var(--s1)', overflow: 'hidden', position: 'relative' }}>
      {/* subtle center glow */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 80% at 50% 100%, rgba(77,143,255,0.12), transparent 70%)',
      }} />
      {/* grid texture — matches the hero, ties top to bottom */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)',
        backgroundSize: '54px 54px',
        maskImage: 'radial-gradient(ellipse 70% 70% at 50% 60%, #000, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 60%, #000, transparent 75%)',
      }} />
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: 'clamp(64px, 10vw, 120px) clamp(16px, 5vw, 48px)', textAlign: 'center', position: 'relative' }}>
        <h2 style={{
          fontSize: 'clamp(32px, 6.5vw, 60px)', fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 1.02, margin: '0 0 18px',
          background: 'linear-gradient(180deg, #fff 40%, rgba(255,255,255,0.55))',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent',
        }}>
          {c.h2}
        </h2>
        <p style={{ color: 'var(--t2)', fontSize: '15px', lineHeight: 1.7, maxWidth: '560px', margin: '0 auto 32px' }}>
          {c.subtitle}
        </p>
        <Link href="/login" style={{
          display: 'inline-block', background: '#fff', color: '#000',
          fontSize: '15px', fontWeight: 700, padding: '15px 36px', borderRadius: '10px',
          letterSpacing: '-0.01em', transition: 'transform 0.15s, box-shadow 0.15s',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.1), 0 8px 32px rgba(255,255,255,0.08)',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.15), 0 12px 40px rgba(255,255,255,0.14)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.1), 0 8px 32px rgba(255,255,255,0.08)' }}
        >
          {c.cta}
        </Link>
        <p style={{ color: 'var(--t3)', fontSize: '12px', margin: '14px 0 0' }}>{c.note}</p>

        {/* Broker compatibility strip */}
        <div style={{ marginTop: '56px' }}>
          <p style={{ color: 'var(--t3)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 16px' }}>
            {c.brokersLabel}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px 26px' }}>
            {BROKERS.map(b => (
              <span key={b} style={{ color: 'var(--t2)', fontSize: '13px', fontWeight: 600, letterSpacing: '0.01em', opacity: 0.75 }}>{b}</span>
            ))}
            <span style={{ color: 'var(--t3)', fontSize: '13px' }}>+ any MT5 broker</span>
          </div>
        </div>
      </div>
    </section>
  )
}
