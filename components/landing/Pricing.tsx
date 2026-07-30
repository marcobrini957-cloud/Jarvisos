'use client'

import { useState } from 'react'
import { CtaLink } from './CtaLink'
import { useLocale } from '@/hooks/useLocale'
import Icon from '@/components/ui/Icon'
import { Section, SectionHead } from './Section'

/**
 * The tiers, as one table rather than three floating cards.
 *
 * The Pro card used to announce itself with a blue wash, a blue border, a
 * blue→magenta gradient badge on a coloured shadow and a 50px drop shadow. A
 * price list is a comparison, and a comparison reads best on one grid: three
 * columns divided by hairlines, the recommended one lifted by a surface step
 * rather than by chroma.
 */
export function Pricing() {
  const { t } = useLocale()
  const pr = t.pricing
  const [annual, setAnnual] = useState(true)

  return (
    <Section id="pricing" band>
      <SectionHead
        label="Plans"
        title={pr.h2}
        lead={pr.subtitle}
        action={
          <div style={{ display: 'flex', gap: '1px', padding: '1px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)' }}>
            {([false, true] as const).map(isAnnual => {
              const on = annual === isAnnual
              return (
                <button
                  key={String(isAnnual)}
                  onClick={() => setAnnual(isAnnual)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    padding: '6px 14px', borderRadius: 'var(--radius-xs)', border: 'none',
                    background: on ? 'var(--color-surface-3)' : 'transparent',
                    color: on ? 'var(--color-ink-1)' : 'var(--color-ink-3)',
                    cursor: 'pointer', transition: 'background 0.12s, color 0.12s',
                  }}
                >
                  {isAnnual ? pr.toggle.annual : pr.toggle.monthly}
                  {isAnnual && (
                    <span className="vq-num" style={{ fontSize: 'var(--text-2xs)', color: on ? 'var(--color-up)' : 'var(--color-ink-4)' }}>
                      {pr.toggle.save}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        }
      />

      <div className="vq-tier-grid">
        {pr.tiers.map(tier => {
          const isPro  = !!tier.badge
          const price  = annual ? tier.annual : tier.monthly
          const isFree = tier.monthly === '€0'

          return (
            <div key={tier.name} style={{
              background: isPro ? 'var(--color-surface-1)' : 'transparent',
              padding: 'clamp(18px, 2vw, 24px)',
              minWidth: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px', marginBottom: '16px' }}>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
                  letterSpacing: '0.16em', textTransform: 'uppercase',
                  color: 'var(--color-ink-3)',
                }}>{tier.name}</span>
                {tier.badge && (
                  <span style={{
                    fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
                    letterSpacing: '0.16em', textTransform: 'uppercase',
                    color: 'var(--color-ink-1)',
                  }}>{tier.badge}</span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', marginBottom: '6px' }}>
                <span className="vq-num" style={{
                  fontSize: 'clamp(var(--text-3xl), 3.4vw, var(--text-d1))', lineHeight: 1,
                  letterSpacing: '-0.04em', color: 'var(--color-ink-1)',
                }}>{price}</span>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
                  color: 'var(--color-ink-4)', paddingBottom: '5px',
                }}>{tier.period}</span>
              </div>

              <p style={{
                margin: '0 0 4px', fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-xs)', color: 'var(--color-ink-3)',
              }}>
                {annual ? 'Annual billing' : 'Monthly billing'}
              </p>
              <p style={{
                margin: '0 0 18px', minHeight: '17px',
                fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)',
                color: 'var(--color-ink-3)',
              }}>
                {annual && tier.annualNote ? tier.annualNote : ''}
              </p>

              <CtaLink
                href={`/login?mode=signup${isFree ? '' : `&plan=${tier.name.toLowerCase()}`}`}
                style={{
                  display: 'block', textAlign: 'center', padding: '11px',
                  borderRadius: 'var(--radius-sm)', marginBottom: '18px',
                  fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)',
                  textDecoration: 'none',
                  background: isPro ? 'var(--color-ink-1)' : 'transparent',
                  color: isPro ? 'var(--color-void)' : 'var(--color-ink-1)',
                  border: isPro ? '1px solid var(--color-ink-1)' : '1px solid var(--color-line-2)',
                }}
              >
                {tier.cta}
              </CtaLink>

              <div>
                {tier.features.map((f, fi) => (
                  <div key={fi} style={{
                    display: 'flex', gap: '9px', alignItems: 'flex-start',
                    padding: '9px 0', borderTop: '1px solid var(--color-line-1)',
                  }}>
                    <span style={{
                      flexShrink: 0, marginTop: '2px', lineHeight: 1,
                      color: f.included ? 'var(--color-ink-1)' : 'var(--color-ink-4)',
                    }}>
                      {f.included
                        ? <Icon name="check" size={12} />
                        : <span aria-hidden style={{ display: 'block', width: '12px', height: '12px', textAlign: 'center' }}>–</span>}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
                      lineHeight: 1.5,
                      color: f.included ? 'var(--color-ink-2)' : 'var(--color-ink-3)',
                    }}>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <p style={{
        marginTop: '22px', fontFamily: 'var(--font-display)',
        fontSize: 'var(--text-xs)', color: 'var(--color-ink-3)', lineHeight: 1.6,
      }}>
        {pr.footer}
      </p>
    </Section>
  )
}
