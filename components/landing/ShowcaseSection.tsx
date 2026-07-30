'use client'

import dynamic from 'next/dynamic'
import { useLocale } from '@/hooks/useLocale'
import { Section, SectionHead } from './Section'

const BeforeAfterMockup = dynamic(() => import('./BeforeAfterMockup').then(m => m.BeforeAfterMockup))

/**
 * Before and after, side by side.
 *
 * Three radial blobs sat behind this section, and the mock-up was wrapped in a
 * red→purple→green gradient border throwing a 60px red glow and a 100px green
 * one. The words BEFORE and AFTER were set 64px in P&L red and P&L green —
 * colour making a claim about money on two words that are not money. The
 * numbers inside the mock-up still carry the P&L hues, because those are money.
 */
export function ShowcaseSection() {
  const { t } = useLocale()
  const sc = t.showcase

  return (
    <Section id="showcase">
      <SectionHead
        label={sc.eyebrow}
        title={<>{sc.h2a}<br />{sc.h2b}</>}
        lead={sc.subtitle}
      />

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px',
        marginBottom: '14px', alignItems: 'end',
      }}>
        <div>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
            letterSpacing: '0.16em', textTransform: 'uppercase',
            color: 'var(--color-ink-3)', margin: '0 0 4px',
          }}>Before</p>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
            color: 'var(--color-ink-3)', margin: 0,
          }}>No structure. No patterns. Just losses.</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
            letterSpacing: '0.16em', textTransform: 'uppercase',
            color: 'var(--color-ink-1)', margin: '0 0 4px',
          }}>After</p>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
            color: 'var(--color-ink-3)', margin: 0,
          }}>Every trade tracked. AI finds your edge.</p>
        </div>
      </div>

      <div style={{
        border: '1px solid var(--color-line-1)', borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}>
        <BeforeAfterMockup />
      </div>

      <div className="vq-trust-grid" style={{ marginTop: '26px' }}>
        {sc.cards.map(c => (
          <div key={c.title} style={{ borderTop: '1px solid var(--color-line-1)', paddingTop: '14px', minWidth: 0 }}>
            <h3 style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)',
              color: 'var(--color-ink-1)', margin: '0 0 5px',
            }}>{c.title}</h3>
            <p style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
              lineHeight: 1.6, color: 'var(--color-ink-3)', margin: 0,
            }}>{c.desc}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}
