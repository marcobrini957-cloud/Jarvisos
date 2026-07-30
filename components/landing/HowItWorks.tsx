'use client'

import { CtaLink } from './CtaLink'
import { useLocale } from '@/hooks/useLocale'
import { Section, SectionHead, inkButton } from './Section'

/**
 * Four steps, as a ladder rather than four cards.
 *
 * The blue→purple→magenta rail that connected the step chips, the glowing
 * circular chips themselves and the blue CTA under a 24px coloured shadow are
 * all gone. The steps are numbered rows on one rule; the number carries the
 * order, which is the only thing the rail was there to say.
 */
export function HowItWorks() {
  const { t } = useLocale()
  const hw = t.howItWorks

  return (
    <Section id="how" band>
      <SectionHead
        label={hw.eyebrow}
        title={hw.h2}
        lead={hw.subtitle}
        action={<CtaLink href="/login?mode=signup" style={inkButton}>{hw.cta}</CtaLink>}
      />

      <div className="vq-steps">
        {hw.steps.map((s, i) => (
          <div key={s.title} style={{ borderTop: '1px solid var(--color-line-1)', paddingTop: '16px' }}>
            <span className="vq-num" style={{
              fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)',
              display: 'block', marginBottom: '12px',
            }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <h3 style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)',
              color: 'var(--color-ink-1)', margin: '0 0 6px',
            }}>
              {s.title}
            </h3>
            <p style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
              lineHeight: 1.6, color: 'var(--color-ink-3)', margin: '0 0 6px',
            }}>
              {s.desc}
            </p>
            <p style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)',
              lineHeight: 1.55, color: 'var(--color-ink-3)', margin: 0,
            }}>
              {s.detail}
            </p>
          </div>
        ))}
      </div>
    </Section>
  )
}
