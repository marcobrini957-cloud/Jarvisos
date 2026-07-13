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
    <div style={{ borderTop: '1px solid var(--bd)', borderBottom: '1px solid var(--bd)', background: 'var(--s1)' }}>
      <div className="grid grid-cols-2 sm:grid-cols-4" style={{
        maxWidth: '1100px', margin: '0 auto',
        padding: 'clamp(24px, 5vw, 32px) clamp(16px, 5vw, 48px)',
        gap: '24px',
      }}>
        {t.stats.map((s, i) => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(26px, 6vw, 34px)', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.03em', lineHeight: 1 }}>
              <Counter target={values[i].value} prefix={values[i].prefix ?? ''} suffix={values[i].suffix} decimals={values[i].decimals ?? 0} />
            </div>
            <div style={{ color: 'var(--t3)', fontSize: '12px', marginTop: '6px' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

