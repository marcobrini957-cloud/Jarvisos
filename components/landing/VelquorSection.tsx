'use client'

import { useState } from 'react'
import { LogoMark } from '@/components/ui/LogoMark'
import { useLocale } from '@/hooks/useLocale'
import { Section, SectionHead } from './Section'

/**
 * Ask VELQUOR, demonstrated.
 *
 * The chat mock used to sit inside a blue→magenta gradient border over two
 * blurred radial washes, with a blue user bubble and a green "online" dot. It
 * is the product's own surface language now: hairline, surface-1, ink. The
 * questions on the left are a list of rules rather than blue-tinted pills.
 */
export function VelquorSection() {
  const { t } = useLocale()
  const ai = t.velquorAI
  const [active, setActive] = useState(0)

  return (
    <Section>
      <SectionHead label={ai.eyebrow} title={ai.h2} lead={ai.subtitle} />

      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 'clamp(24px, 4vw, 56px)', alignItems: 'start' }}>
        <div>
          {ai.qa.map((item, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '13px 12px', border: 'none',
                borderTop: '1px solid var(--color-line-1)',
                borderLeft: `1px solid ${active === i ? 'var(--color-ink-1)' : 'transparent'}`,
                background: active === i ? 'var(--color-surface-1)' : 'transparent',
                color: active === i ? 'var(--color-ink-1)' : 'var(--color-ink-3)',
                fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
                cursor: 'pointer', transition: 'background 0.12s, color 0.12s, border-color 0.12s',
              }}
            >
              {item.q}
            </button>
          ))}
        </div>

        <div style={{
          background: 'var(--s1)', border: '1px solid var(--color-line-1)',
          borderRadius: 'var(--radius-md)', overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 14px', borderBottom: '1px solid var(--color-line-1)',
            display: 'flex', alignItems: 'center', gap: '9px',
          }}>
            <LogoMark size={22} />
            <span style={{
              fontFamily: 'var(--font-mark)', fontSize: 'var(--text-md)',
              textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--color-ink-1)',
            }}>Velquor</span>
            <span style={{
              marginLeft: 'auto',
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
              letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-ink-3)',
            }}>{ai.online}</span>
          </div>

          <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '220px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{
                background: 'var(--color-surface-2)', color: 'var(--color-ink-1)',
                padding: '9px 12px', borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', maxWidth: '82%',
              }}>
                {ai.qa[active].q}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '9px', alignItems: 'flex-start' }}>
              <LogoMark size={22} />
              <div style={{
                border: '1px solid var(--color-line-1)', padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
                color: 'var(--color-ink-2)', lineHeight: 1.65, maxWidth: '88%',
              }}>
                {ai.qa[active].a}
              </div>
            </div>
          </div>

          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--color-line-1)' }}>
            <div style={{
              display: 'flex', gap: '8px', alignItems: 'center',
              background: 'var(--s2)', border: '1px solid var(--color-line-1)',
              borderRadius: 'var(--radius-sm)', padding: '8px 11px',
            }}>
              <span style={{
                fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
                color: 'var(--color-ink-4)', flex: 1,
              }}>{ai.placeholder}</span>
              <span style={{
                fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: 'var(--color-ink-3)',
              }}>Send</span>
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}
