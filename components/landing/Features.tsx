'use client'

import { useLocale } from '@/hooks/useLocale'

export function Features() {
  const { t } = useLocale()
  const ft = t.features
  const accentColors = ['var(--go2)', 'var(--ac)', 'var(--cy)', 'var(--am2)', 'var(--gr2)', 'var(--pu)']

  return (
    <section id="features" style={{ padding: 'clamp(60px, 10vw, 100px) clamp(16px, 5vw, 48px)', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: 'clamp(30px, 6vw, 46px)', fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 12px', color: 'var(--t1)', lineHeight: 1.04 }}>{ft.h2}</h2>
        <p style={{ color: 'var(--t2)', fontSize: '15px', maxWidth: '480px', margin: 0, lineHeight: 1.65 }}>{ft.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: '1px', border: '1px solid var(--bd)', borderRadius: '12px', overflow: 'hidden' }}>
        {ft.items.map((f, i) => (
          <div key={f.title} style={{
            background: 'var(--s1)', padding: '24px',
            borderRight: (i % 3 !== 2) ? '1px solid var(--bd)' : 'none',
            borderBottom: (i < 3) ? '1px solid var(--bd)' : 'none',
            cursor: 'default', transition: 'background 0.18s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--s2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--s1)' }}
          >
            <p style={{
              margin: '0 0 16px',
              color: accentColors[i],
              fontSize: '11px', fontWeight: 700,
              letterSpacing: '0.08em',
              fontFamily: 'monospace',
            }}>
              {String(i + 1).padStart(2, '0')}
            </p>
            <h3 style={{ margin: '0 0 8px', color: 'var(--t1)', fontSize: '14px', fontWeight: 700, letterSpacing: '-0.01em' }}>{f.title}</h3>
            <p style={{ margin: 0, color: 'var(--t2)', fontSize: '12px', lineHeight: 1.65 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

