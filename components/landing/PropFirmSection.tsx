'use client'

import { useLocale } from '@/hooks/useLocale'
import { Section } from './Section'

/**
 * Prop-firm rule tracking.
 *
 * The section was one big 20px-radius card on a green→blue gradient wash with a
 * green border, a green pill, green ticks and a green-glowing rule panel. Only
 * one of those figures is money — the profit target — so only that one keeps
 * the P&L green. The other three limits are state, and state is ink.
 */
export function PropFirmSection() {
  const { t } = useLocale()
  const pf = t.propFirm

  const rules = [
    { label: 'Profit Target',  current: 6.8, max: 10, unit: '%',     money: true  },
    { label: 'Max Daily Loss', current: 1.2, max: 5,  unit: '%',     money: false },
    { label: 'Max Drawdown',   current: 2.1, max: 10, unit: '%',     money: false },
    { label: 'Trading Days',   current: 7,   max: 10, unit: ' days', money: false },
  ]

  return (
    <Section band>
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 'clamp(28px, 4vw, 56px)', alignItems: 'center' }}>
        <div>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
            letterSpacing: '0.16em', textTransform: 'uppercase',
            color: 'var(--color-ink-3)', margin: '0 0 14px',
          }}>
            {pf.badge}
          </p>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(23px, 3vw, 34px)',
            lineHeight: 1.1, letterSpacing: '-0.03em',
            color: 'var(--color-ink-1)', margin: '0 0 14px',
          }}>
            {pf.h2}
          </h2>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)',
            lineHeight: 1.7, color: 'var(--color-ink-3)', margin: '0 0 20px', maxWidth: '54ch',
          }}>
            {pf.subtitle}
          </p>
          <div>
            {pf.firms.map(f => (
              <p key={f} style={{
                fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
                color: 'var(--color-ink-3)', margin: 0, padding: '9px 0',
                borderTop: '1px solid var(--color-line-1)',
              }}>
                {f}
              </p>
            ))}
          </div>
        </div>

        <div style={{
          background: 'var(--color-void)', border: '1px solid var(--color-line-1)',
          borderRadius: 'var(--radius-md)', padding: '18px',
        }}>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
            letterSpacing: '0.16em', textTransform: 'uppercase',
            color: 'var(--color-ink-3)', margin: '0 0 16px',
          }}>
            FTMO Challenge — Phase 1
          </p>
          {rules.map(r => (
            <div key={r.label} style={{ marginBottom: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)',
                  color: 'var(--color-ink-3)',
                }}>{r.label}</span>
                <span className="vq-num" style={{
                  fontSize: 'var(--text-xs)',
                  color: r.money ? 'var(--color-up)' : 'var(--color-ink-1)',
                }}>{r.current}{r.unit} / {r.max}{r.unit}</span>
              </div>
              <div style={{ height: '3px', background: 'var(--color-line-1)', borderRadius: 'var(--radius-xs)' }}>
                <div style={{
                  height: '100%', width: `${(r.current / r.max) * 100}%`,
                  borderRadius: 'var(--radius-xs)',
                  background: r.money ? 'var(--color-up)' : 'var(--color-ink-2)',
                }} />
              </div>
            </div>
          ))}
          <p style={{
            marginTop: '16px', paddingTop: '12px',
            borderTop: '1px solid var(--color-line-1)',
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)',
            color: 'var(--color-ink-3)',
          }}>
            {pf.trackNote}
          </p>
        </div>
      </div>
    </Section>
  )
}
