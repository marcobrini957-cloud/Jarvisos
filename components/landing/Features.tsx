'use client'

import { useLocale } from '@/hooks/useLocale'
import { SectionEyebrow } from './SectionEyebrow'

export function Features() {
  const { t } = useLocale()
  const ft = t.features
  const accentColors = ['var(--go2)', 'var(--ac)', 'var(--cy)', 'var(--am2)', 'var(--gr2)', 'var(--pu)']
  const accentRgbs   = ['255,184,48', '77,143,255', '34,211,238', '255,184,48', '0,255,133', '167,139,250']

  return (
    <section id="features" style={{ padding: 'clamp(60px, 10vw, 100px) clamp(16px, 5vw, 48px)', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '48px' }}>
        <SectionEyebrow>{ft.eyebrow}</SectionEyebrow>
        <h2 style={{ fontSize: 'clamp(30px, 6vw, 46px)', fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 12px', color: 'var(--t1)', lineHeight: 1.04 }}>{ft.h2}</h2>
        <p style={{ color: 'var(--t2)', fontSize: '15px', maxWidth: '480px', margin: 0, lineHeight: 1.65 }}>{ft.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: '1px', border: '1px solid var(--bd)', borderRadius: '12px', overflow: 'hidden' }}>
        {ft.items.map((f, i) => {
          const rgb = accentRgbs[i % accentRgbs.length]
          return (
          <div key={f.title} style={{
            background: 'var(--s1)', padding: '24px',
            position: 'relative', overflow: 'hidden',
            borderRight: (i % 3 !== 2) ? '1px solid var(--bd)' : 'none',
            borderBottom: (i < ft.items.length - (ft.items.length % 3 || 3)) ? '1px solid var(--bd)' : 'none',
            cursor: 'default', transition: 'background 0.18s',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--s2)'
              const bar = e.currentTarget.querySelector<HTMLElement>('[data-hairline]')
              if (bar) bar.style.opacity = '1'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--s1)'
              const bar = e.currentTarget.querySelector<HTMLElement>('[data-hairline]')
              if (bar) bar.style.opacity = '0.45'
            }}
          >
            {/* accent hairline — ties each cell to the hero's gradient language */}
            <div data-hairline aria-hidden style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
              background: `linear-gradient(90deg, rgba(${rgb},0.9) 0%, rgba(${rgb},0.15) 55%, transparent 100%)`,
              opacity: 0.45, transition: 'opacity 0.18s',
            }} />
            <p style={{
              margin: '0 0 16px',
              color: accentColors[i % accentColors.length],
              fontSize: '11px', fontWeight: 700,
              letterSpacing: '0.08em',
              fontFamily: 'monospace',
              textShadow: `0 0 12px rgba(${rgb},0.55)`,
            }}>
              {String(i + 1).padStart(2, '0')}
            </p>
            <h3 style={{ margin: '0 0 8px', color: 'var(--t1)', fontSize: '14px', fontWeight: 700, letterSpacing: '-0.01em' }}>{f.title}</h3>
            <p style={{ margin: 0, color: 'var(--t2)', fontSize: '12px', lineHeight: 1.65 }}>{f.desc}</p>
          </div>
        )})}
      </div>
    </section>
  )
}

