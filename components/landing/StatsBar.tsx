'use client'

import { useLocale } from '@/hooks/useLocale'
import { Counter } from './Counter'

export function StatsBar() {
  const { t } = useLocale()
  const values = [
    { value: 50000, suffix: '+' },
    { value: 23,    suffix: '%', prefix: '+' },
    { value: 1.2,   suffix: 's', decimals: 1 },
    { value: 12,    suffix: '' },
  ]
  return (
    <div style={{
      borderTop: '1px solid var(--bd)', borderBottom: '1px solid var(--bd)',
      background: 'linear-gradient(180deg, rgba(255,255,255,0.015), transparent)',
      position: 'relative',
    }}>
      {/* thin top accent line — terminal feel */}
      <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(77,143,255,0.4), transparent)' }} />
      <div className="grid grid-cols-2 sm:grid-cols-4" style={{
        maxWidth: '1100px', margin: '0 auto',
        padding: 'clamp(28px, 5vw, 40px) clamp(16px, 5vw, 48px)',
        gap: 0,
      }}>
        {t.stats.map((s, i) => (
          <div key={s.label} style={{
            textAlign: 'center', padding: '4px 12px',
            borderLeft: i % 4 === 0 ? 'none' : '1px solid var(--bd)',
          }}>
            <div style={{
              fontSize: 'clamp(28px, 6vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1,
              fontFamily: 'var(--font-mono, ui-monospace, monospace)',
              background: 'linear-gradient(180deg, #fff, rgba(255,255,255,0.6))',
              WebkitBackgroundClip: 'text', backgroundClip: 'text',
              WebkitTextFillColor: 'transparent', color: 'transparent',
            }}>
              <Counter target={values[i].value} prefix={values[i].prefix ?? ''} suffix={values[i].suffix} decimals={values[i].decimals ?? 0} />
            </div>
            <div style={{ color: 'var(--t3)', fontSize: '11px', marginTop: '8px', letterSpacing: '0.6px', textTransform: 'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

