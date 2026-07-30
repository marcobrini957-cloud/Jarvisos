'use client'

import Link from 'next/link'
import { useLocale } from '@/hooks/useLocale'
import { Section, inkButton } from './Section'

const BROKERS = ['IC Markets', 'Pepperstone', 'Blueberry', 'Vantage', 'FTMO', 'Eightcap', 'BlackBull', 'Axi']

/**
 * The closing ask.
 *
 * Gone: a blue radial wash rising off the bottom edge, the 54px grid texture
 * under a radial mask, a headline clipped out of a white gradient, and a button
 * that lifted 1px under a 40px white halo on hover. The ask is the words and
 * the button; everything else was volume.
 */
export function FinalCTA() {
  const { t } = useLocale()
  const c = t.finalCta

  return (
    <Section band>
      <div style={{ maxWidth: '820px' }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(var(--text-3xl), 4.8vw, var(--text-d3))', lineHeight: 1.02,
          letterSpacing: '-0.035em', color: 'var(--color-ink-1)', margin: '0 0 16px',
        }}>
          {c.h2}
        </h2>
        <p style={{
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)',
          lineHeight: 1.7, color: 'var(--color-ink-3)', margin: '0 0 28px', maxWidth: '58ch',
        }}>
          {c.subtitle}
        </p>
        <Link href="/login?mode=signup" style={inkButton}>{c.cta}</Link>
        <p style={{
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)',
          color: 'var(--color-ink-4)', margin: '14px 0 0',
        }}>
          {c.note}
        </p>
      </div>

      {/* Broker compatibility — a list, on the rule that separates it */}
      <div style={{ marginTop: 'clamp(40px, 6vw, 64px)', borderTop: '1px solid var(--color-line-1)', paddingTop: '18px' }}>
        <p style={{
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: 'var(--color-ink-3)', margin: '0 0 14px',
        }}>
          {c.brokersLabel}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 22px' }}>
          {BROKERS.map(b => (
            <span key={b} style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
              color: 'var(--color-ink-2)',
            }}>{b}</span>
          ))}
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
            color: 'var(--color-ink-4)',
          }}>+ any MT5 broker</span>
        </div>
      </div>
    </Section>
  )
}
