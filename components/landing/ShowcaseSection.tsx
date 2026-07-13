'use client'

import dynamic from 'next/dynamic'
import { useLocale } from '@/hooks/useLocale'

const BeforeAfterMockup = dynamic(() => import('./BeforeAfterMockup').then(m => m.BeforeAfterMockup))

export function ShowcaseSection() {
  const { t } = useLocale()
  const sc = t.showcase
  return (
    <section id="showcase" style={{
      position: 'relative', overflow: 'hidden',
      background: '#000',
      padding: 'clamp(60px, 10vw, 110px) clamp(16px, 5vw, 48px)',
    }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', bottom: '5%', left: '-8%', width: '45vw', height: '45vw', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(33,110,243,0.22) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', bottom: '0%', right: '-8%', width: '45vw', height: '45vw', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(196,50,220,0.18) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', top: '0', left: '50%', transform: 'translateX(-50%)', width: '60vw', height: '30vh', background: 'radial-gradient(ellipse, rgba(55,80,160,0.12) 0%, transparent 70%)' }} />
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <p style={{ color: '#4B8FFF', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>{sc.eyebrow}</p>
          <h2 style={{ fontSize: 'clamp(28px, 6vw, 48px)', fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 16px', color: '#fff', lineHeight: 1.05 }}>
            {sc.h2a}<br />{sc.h2b}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(14px, 2vw, 16px)', maxWidth: '560px', margin: '0 auto', lineHeight: 1.6 }}>
            {sc.subtitle}
          </p>
        </div>

        {/* Column labels above the card */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', marginBottom: '18px', padding: '0 2px', alignItems: 'end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span style={{ color: '#FF3347', fontSize: 'clamp(38px, 7vw, 64px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, textTransform: 'uppercase' }}>Before</span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>No structure. No patterns. Just losses.</span>
          </div>
          <div />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end', textAlign: 'right' }}>
            <span style={{ color: '#00FF85', fontSize: 'clamp(38px, 7vw, 64px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, textTransform: 'uppercase' }}>After</span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Every trade tracked. AI finds your edge.</span>
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(90deg, #FF3347 0%, #7B2FBF 50%, #00FF85 100%)',
          padding: '1.5px', borderRadius: '16px',
          boxShadow: '0 0 60px rgba(255,51,71,0.12), 0 0 100px rgba(0,255,133,0.10)',
        }}>
          <BeforeAfterMockup />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: '16px', marginTop: '28px' }}>
          {sc.cards.map((c, i) => (
            <div key={c.title} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderTop: `2px solid ${['#00FF85','#4B8FFF','#FFB830'][i] ?? 'rgba(255,255,255,0.2)'}`,
              borderRadius: '8px', padding: '20px',
            }}>
              <h3 style={{ margin: '0 0 8px', color: '#fff', fontSize: '13px', fontWeight: 700, letterSpacing: '-0.01em' }}>{c.title}</h3>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '12px', lineHeight: 1.65 }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

