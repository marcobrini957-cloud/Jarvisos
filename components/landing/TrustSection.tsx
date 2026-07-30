'use client'

import { useLocale } from '@/hooks/useLocale'
import { Section, SectionHead } from './Section'

// Line icons by item order (no passwords / EU infra / your data / kill switch) —
// same order in every locale.
const ICONS = [
  <svg key="k" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.3-9.3M16 5l3 3M13 8l2 2"/></svg>,
  <svg key="s" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6l7-3z"/></svg>,
  <svg key="d" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11m0 0 4-4m-4 4-4-4M4 19h16"/></svg>,
  <svg key="p" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v8"/><path d="M6.3 6.5a8 8 0 1 0 11.4 0"/></svg>,
]

/**
 * The four safety promises.
 *
 * They were four cards, each with a green icon tile in a green glow that turned
 * greener on hover. None of it is money, so none of it is green now — the icons
 * are ink on the same hairline rows the rest of the page uses.
 */
export function TrustSection() {
  const { t } = useLocale()
  const tr = t.trust

  return (
    <Section>
      <SectionHead label={tr.eyebrow} title={tr.h2} />

      <div className="vq-trust-grid">
        {tr.items.map((item, i) => (
          <div key={item.title} style={{
            borderTop: '1px solid var(--color-line-1)', paddingTop: '16px', minWidth: 0,
          }}>
            <div style={{ color: 'var(--color-ink-3)', marginBottom: '12px' }}>
              {ICONS[i % ICONS.length]}
            </div>
            <h3 style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)',
              color: 'var(--color-ink-1)', margin: '0 0 6px',
            }}>
              {item.title}
            </h3>
            <p style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
              lineHeight: 1.6, color: 'var(--color-ink-3)', margin: 0,
            }}>
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </Section>
  )
}
