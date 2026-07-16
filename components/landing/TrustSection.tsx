'use client'

import { useLocale } from '@/hooks/useLocale'
import { SectionEyebrow } from './SectionEyebrow'

export function TrustSection() {
  const { t } = useLocale()
  const tr = t.trust

  return (
    <section style={{
      padding: 'clamp(48px, 7vw, 80px) clamp(16px, 5vw, 48px)',
      background: 'var(--bg)', borderTop: '1px solid var(--bd)',
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <SectionEyebrow align="center" color="#00FF85" rgb="0,255,133">{tr.eyebrow}</SectionEyebrow>
          <h2 style={{ fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 900, letterSpacing: '-0.04em', margin: 0, color: 'var(--t1)', lineHeight: 1.08 }}>{tr.h2}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: '14px' }}>
          {tr.items.map(item => (
            <div key={item.title} style={{
              background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '12px',
              padding: '22px 20px', transition: 'border-color 0.18s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(77,143,255,0.35)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bd)' }}
            >
              <div style={{ fontSize: '20px', marginBottom: '12px' }}>{item.icon}</div>
              <h3 style={{ margin: '0 0 6px', color: 'var(--t1)', fontSize: '14px', fontWeight: 700, letterSpacing: '-0.01em' }}>{item.title}</h3>
              <p style={{ margin: 0, color: 'var(--t2)', fontSize: '12px', lineHeight: 1.65 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
