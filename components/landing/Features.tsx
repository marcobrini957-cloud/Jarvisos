'use client'

import { useLocale } from '@/hooks/useLocale'
import { Section, SectionHead } from './Section'
import { mark } from './Mark'

/**
 * The capability list.
 *
 * It was six equal cards in a 3-up grid, each with a coloured gradient hairline
 * across its top, a glowing mono index, and its own accent from a six-colour
 * rotation — gold, blue, cyan, amber, green, purple. A rainbow of accents that
 * mean nothing is on the ban list twice over (§2 colour), and the green one was
 * the P&L green, which in this product is a claim about money.
 *
 * It is a spec sheet now: hairline rows, the index in mono on the left rail,
 * two columns of them on a wide screen. Nothing is coloured, because none of it
 * is money.
 */
export function Features() {
  const { t } = useLocale()
  const ft = t.features

  return (
    <Section id="features">
      <SectionHead label={ft.eyebrow} title={ft.h2} lead={ft.subtitle} />

      <div className="vq-spec-grid">
        {ft.items.map((f, i) => (
          <div key={f.title} style={{
            display: 'flex', gap: '14px', alignItems: 'flex-start',
            padding: '18px 4px',
            borderTop: '1px solid var(--color-line-1)',
          }}>
            <span className="vq-num" style={{
              fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)',
              paddingTop: '3px', flexShrink: 0,
            }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <div style={{ minWidth: 0 }}>
              <h3 style={{
                fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)',
                color: 'var(--color-ink-1)', margin: '0 0 5px', letterSpacing: '-0.01em',
              }}>
                {f.title}
              </h3>
              <p style={{
                fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
                lineHeight: 1.6, color: 'var(--color-ink-3)', margin: 0,
              }}>
                {mark(f.desc)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}
