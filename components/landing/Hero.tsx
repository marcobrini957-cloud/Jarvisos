'use client'

import Link from 'next/link'
import { useLocale } from '@/hooks/useLocale'
import { Aurora } from './Aurora'
import { AnimatedDashboard } from './AnimatedDashboard'

export function Hero() {
  const { t } = useLocale()

  return (
    <section style={{ position: 'relative', paddingBottom: '0', background: '#000', overflow: 'hidden' }}>
      {/* Aurora bars at very top */}
      <Aurora />

      {/* Deep space background glows */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: '-15%', left: '50%', transform: 'translateX(-50%)',
          width: '90vw', height: '70vh', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(55,90,180,0.22) 0%, rgba(30,50,120,0.08) 45%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', top: '20%', left: '-8%',
          width: '50vw', height: '50vw', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(33,110,210,0.10) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', top: '15%', right: '-8%',
          width: '45vw', height: '45vw', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(140,60,220,0.10) 0%, transparent 65%)',
        }} />
      </div>

      {/* Centered text block */}
      <div style={{
        position: 'relative', zIndex: 2,
        textAlign: 'center',
        padding: 'clamp(72px, 11vw, 120px) clamp(16px, 5vw, 48px) clamp(48px, 7vw, 72px)',
      }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '5px 14px', borderRadius: '20px', marginBottom: '32px',
          background: 'rgba(77,143,255,0.1)', border: '1px solid rgba(77,143,255,0.22)',
        }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4B8FFF', display: 'block', boxShadow: '0 0 6px #4B8FFF' }} />
          <span style={{ color: '#4B8FFF', fontSize: '12px', fontWeight: 500 }}>{t.hero.badge}</span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 'clamp(44px, 8.5vw, 96px)', fontWeight: 900, lineHeight: 0.97,
          letterSpacing: '-0.04em', margin: '0 0 28px', color: '#fff',
        }}>
          {t.hero.h1a}<span style={{ color: 'rgba(255,255,255,0.3)' }}> /</span><br />
          {t.hero.h1b}
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 'clamp(15px, 2.2vw, 19px)', color: 'rgba(255,255,255,0.52)',
          lineHeight: 1.65, margin: '0 auto 40px', maxWidth: '520px', fontWeight: 400,
        }}>
          {t.hero.subtitle}
        </p>

        {/* CTA */}
        <div style={{ marginBottom: '28px' }}>
          <Link href="/login?mode=signup" style={{
            background: '#fff', color: '#000', padding: '14px 30px', borderRadius: '8px',
            fontSize: '15px', fontWeight: 700, textDecoration: 'none', display: 'inline-block',
            boxShadow: '0 4px 24px rgba(255,255,255,0.15)', whiteSpace: 'nowrap',
          }}>{t.hero.cta}</Link>
        </div>

        {/* Trust bullets */}
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {t.hero.trust.map(b => (
            <div key={b} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ color: '#00FF85', fontSize: '11px' }}>✓</span>
              <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: '12px' }}>{b}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dashboard frame with gradient border */}
      <div style={{ position: 'relative', zIndex: 2, padding: '0 clamp(12px, 4vw, 48px)', marginTop: 'clamp(48px, 7vw, 80px)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative' }}>
          {/* Nebula glow behind the frame */}
          <div aria-hidden style={{
            position: 'absolute', inset: '-40px -60px 0',
            background: [
              'radial-gradient(ellipse at 20% 60%, rgba(33,110,243,0.28) 0%, transparent 55%)',
              'radial-gradient(ellipse at 80% 60%, rgba(196,50,220,0.22) 0%, transparent 55%)',
            ].join(', '),
            filter: 'blur(40px)',
            pointerEvents: 'none', zIndex: 0,
          }} />

          {/* Gradient border wrapper */}
          <div style={{
            position: 'relative', zIndex: 1,
            background: 'linear-gradient(90deg, #2196F3 0%, #7B2FBF 50%, #E040FB 100%)',
            padding: '1.5px',
            borderRadius: '14px 14px 0 0',
            boxShadow: [
              '0 0 60px rgba(33,150,243,0.22)',
              '0 0 120px rgba(224,64,251,0.14)',
              '0 -10px 60px rgba(33,100,200,0.12)',
            ].join(', '),
          }}>
            <div style={{ background: '#090D13', borderRadius: '12px 12px 0 0', overflow: 'hidden' }}>
              {/* Browser chrome */}
              <div style={{
                background: 'rgba(10,14,20,0.98)', padding: '10px 16px',
                display: 'flex', alignItems: 'center', gap: '12px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  {['rgba(255,95,87,0.8)', 'rgba(255,189,46,0.8)', 'rgba(40,201,64,0.8)'].map((c, i) => (
                    <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }} />
                  ))}
                </div>
                <div style={{
                  flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '6px', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '6px',
                  maxWidth: '320px', margin: '0 auto',
                }}>
                  <span style={{ color: '#00FF85', fontSize: '10px' }}>🔒</span>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>velquor.app/dashboard</span>
                </div>
                <div style={{ flexShrink: 0, width: '52px' }} />
              </div>
              <AnimatedDashboard />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

