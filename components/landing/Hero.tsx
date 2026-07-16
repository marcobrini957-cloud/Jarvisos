'use client'

import Link from 'next/link'
import { useLocale } from '@/hooks/useLocale'
import { Aurora } from './Aurora'
import { AnimatedDashboard } from './AnimatedDashboard'
import { TickerStrip } from './TickerStrip'

export function Hero() {
  const { t } = useLocale()

  return (
    <section style={{ position: 'relative', paddingBottom: '0', background: '#000', overflow: 'hidden' }}>
      {/* Aurora bars at very top */}
      <Aurora />

      {/* Live market ticker — terminal energy */}
      <TickerStrip />

      {/* Premium grid texture for depth */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: '54px 54px',
        maskImage: 'radial-gradient(ellipse 80% 55% at 50% 32%, #000 0%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 55% at 50% 32%, #000 0%, transparent 75%)',
      }} />

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
          fontSize: 'clamp(46px, 9vw, 104px)', fontWeight: 900, lineHeight: 0.95,
          letterSpacing: '-0.045em', margin: '0 0 28px', color: '#fff',
        }}>
          {t.hero.h1a}<span style={{ color: 'rgba(255,255,255,0.3)' }}> /</span><br />
          <span style={{
            background: 'linear-gradient(100deg, #4B8FFF 0%, #9D7BFF 45%, #E040FB 100%)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text',
            WebkitTextFillColor: 'transparent', color: 'transparent',
          }}>{t.hero.h1b}</span>
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
          {/* Floating glass proof-chips — real product results, desktop only */}
          <ProofChip top="6%"  left="-3%"  delay="0s"   color="#00FF85" label="EDGE FOUND"   value="+€680 / 90d" />
          <ProofChip top="30%" left="-5%"  delay="1.1s" color="#4B8FFF" label="DNA SCORE"    value="89 / 100" />
          <ProofChip top="10%" right="-3%" delay="0.6s" color="#9D7BFF" label="COPY LATENCY" value="1.4s" />
          <ProofChip top="34%" right="-5%" delay="1.6s" color="#00FF85" label="WIN RATE"     value="78% · London" />

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

// Floating glass proof-chip. Hidden on small screens (would crowd the frame).
function ProofChip({
  top, left, right, delay, color, label, value,
}: {
  top: string; left?: string; right?: string; delay: string; color: string; label: string; value: string
}) {
  return (
    <div
      className="vq-proof-chip"
      style={{
        position: 'absolute', top, left, right, zIndex: 3,
        padding: '9px 13px', borderRadius: 12,
        background: 'rgba(14,17,24,0.72)', backdropFilter: 'blur(14px)',
        border: '1px solid rgba(255,255,255,0.09)',
        boxShadow: '0 12px 34px rgba(0,0,0,0.45)',
        animation: `vqFloat 5.5s ease-in-out ${delay} infinite`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        <span style={{ width: 5, height: 5, borderRadius: 3, background: color, boxShadow: `0 0 8px ${color}` }} />
        <span style={{ fontSize: 8.5, letterSpacing: 1.2, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{value}</div>
      <style>{`
        @keyframes vqFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-9px) } }
        @media (max-width: 860px) { .vq-proof-chip { display: none } }
      `}</style>
    </div>
  )
}

