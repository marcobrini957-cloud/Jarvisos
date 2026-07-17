'use client'

import { useState } from 'react'
import { useLocale } from '@/hooks/useLocale'
import { SectionEyebrow } from './SectionEyebrow'

export function FAQ() {
  const { t } = useLocale()
  const f = t.faq
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" style={{
      padding: 'clamp(60px, 10vw, 100px) clamp(16px, 5vw, 48px)',
      background: 'var(--bg)', borderTop: '1px solid var(--bd)',
    }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '44px' }}>
          <SectionEyebrow align="center">{f.eyebrow}</SectionEyebrow>
          <h2 style={{ fontSize: 'clamp(28px, 5.5vw, 42px)', fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 12px', color: 'var(--t1)', lineHeight: 1.06 }}>{f.h2}</h2>
          <p style={{ color: 'var(--t2)', fontSize: '15px', maxWidth: '440px', margin: '0 auto', lineHeight: 1.65 }}>{f.subtitle}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {f.items.map((item, i) => {
            const isOpen = open === i
            return (
              <div key={i} style={{
                background: 'var(--s1)', border: `1px solid ${isOpen ? 'rgba(77,143,255,0.3)' : 'var(--bd)'}`,
                borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.2s',
              }}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                    width: '100%', padding: '18px 22px', background: 'transparent', border: 'none',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ color: 'var(--t1)', fontSize: '15px', fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.4 }}>{item.q}</span>
                  <span style={{
                    color: isOpen ? 'var(--ac)' : 'var(--t3)', fontSize: '18px', fontWeight: 400, flexShrink: 0,
                    transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.2s, color 0.2s',
                    lineHeight: 1,
                  }}>+</span>
                </button>
                <div style={{
                  display: 'grid', gridTemplateRows: isOpen ? '1fr' : '0fr',
                  transition: 'grid-template-rows 0.25s ease',
                }}>
                  <div style={{ overflow: 'hidden' }}>
                    <p style={{ margin: 0, padding: '0 22px 18px', color: 'var(--t2)', fontSize: '14px', lineHeight: 1.7 }}>{item.a}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
