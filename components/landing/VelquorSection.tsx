'use client'

import { useState } from 'react'
import { LogoMark } from '@/components/ui/LogoMark'
import { useLocale } from '@/hooks/useLocale'
import { SectionEyebrow } from './SectionEyebrow'

export function VelquorSection() {
  const { t } = useLocale()
  const ai = t.velquorAI
  const [active, setActive] = useState(0)

  return (
    <section style={{ padding: 'clamp(60px, 10vw, 100px) clamp(16px, 5vw, 48px)', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 'clamp(32px, 6vw, 72px)', alignItems: 'center' }}>
        <div>
          <SectionEyebrow>{ai.eyebrow}</SectionEyebrow>
          <h2 style={{ fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 16px', color: 'var(--t1)', lineHeight: 1.15 }}>{ai.h2}</h2>
          <p style={{ color: 'var(--t2)', fontSize: '15px', lineHeight: 1.7, margin: '0 0 28px' }}>{ai.subtitle}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {ai.qa.map((item, i) => (
              <button key={i} onClick={() => setActive(i)} style={{
                textAlign: 'left', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
                background: active === i ? 'rgba(77,143,255,0.1)' : 'transparent',
                border: active === i ? '1px solid rgba(77,143,255,0.3)' : '1px solid transparent',
                color: active === i ? 'var(--t1)' : 'var(--t2)',
                fontSize: '13px', transition: 'all 0.15s',
              }}>
                {active === i ? '→ ' : ''}{item.q}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LogoMark size={26} />
            <div>
              <p style={{ margin: 0, color: 'var(--t1)', fontSize: '12px', fontWeight: 600 }}>VELQUOR</p>
              <p style={{ margin: 0, color: 'var(--gr2)', fontSize: '10px' }}>● {ai.online}</p>
            </div>
          </div>

          <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '220px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ background: 'var(--ac)', color: 'white', padding: '9px 13px', borderRadius: '11px 11px 2px 11px', fontSize: '13px', maxWidth: '80%' }}>
                {ai.qa[active].q}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '9px', alignItems: 'flex-start' }}>
              <LogoMark size={26} />
              <div style={{ background: 'var(--s2)', border: '1px solid var(--bd)', padding: '11px 13px', borderRadius: '2px 11px 11px 11px', fontSize: '12px', color: 'var(--t2)', lineHeight: 1.65, maxWidth: '85%' }}>
                {ai.qa[active].a}
              </div>
            </div>
          </div>

          <div style={{ padding: '11px 14px', borderTop: '1px solid var(--bd)' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: '9px', padding: '9px 13px' }}>
              <span style={{ color: 'var(--t3)', fontSize: '12px', flex: 1 }}>{ai.placeholder}</span>
              <span style={{ background: 'var(--ac)', color: 'white', fontSize: '10px', padding: '3px 9px', borderRadius: '5px', fontWeight: 500 }}>Send</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

