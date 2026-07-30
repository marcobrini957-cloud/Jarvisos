'use client'

import Link from 'next/link'
import { CtaLink } from './CtaLink'
import { useLocale } from '@/hooks/useLocale'
import { AnimatedDashboard } from './AnimatedDashboard'
import { TickerStrip } from './TickerStrip'

/**
 * The hero, on the 2.0 language.
 *
 * What went: the Aurora bars, three radial "deep space" glows, a nebula behind
 * the frame, a 54px grid texture under a radial mask, a purple→magenta gradient
 * clipped into the headline, a three-stop gradient border around the product
 * frame with 60px and 120px coloured shadows, four floating glass proof-chips
 * each with its own coloured halo, a macOS traffic-light browser chrome, a lock
 * emoji, and a centred column carrying all of it. That is nine ban-list
 * violations in one viewport (DESIGN.md §2) — and between them they were doing
 * the work the product screenshot should be doing.
 *
 * What replaced it: the pitch is set left, ranged against the same margin as
 * the nav, and hierarchy comes from ink and size rather than colour. The
 * product frame then runs full-bleed under it with one hairline above — the
 * dashboard reads as a machine that continues past the edge of the screen
 * rather than a card floating in a glow.
 */
export function Hero() {
  const { t } = useLocale()

  return (
    <section style={{ position: 'relative', background: 'var(--color-void)' }}>
      <TickerStrip />

      <div style={{
        padding: 'clamp(56px, 8vw, 104px) clamp(14px, 4vw, 32px) clamp(40px, 6vw, 72px)',
        maxWidth: '1560px',
      }}>
        {/* Eyebrow — the three capabilities, in the label voice, not a blue pill */}
        <p style={{
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: 'var(--color-ink-3)', margin: '0 0 clamp(20px, 3vw, 30px)',
        }}>
          {t.hero.badge}
        </p>

        {/* Headline. Two lines, two inks: the claim is dimmer than where the
            claim lands, which is the sentence's actual emphasis. */}
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(var(--text-d1), 7.4vw, var(--text-d4))', lineHeight: 0.98,
          letterSpacing: '-0.035em', margin: '0 0 clamp(20px, 3vw, 28px)',
          maxWidth: '15ch', textWrap: 'balance',
        }}>
          <span style={{ color: 'var(--color-ink-2)' }}>{t.hero.h1a}</span>{' '}
          <span style={{ color: 'var(--color-ink-1)' }}>{t.hero.h1b}</span>
        </h1>

        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(var(--text-md), 1.5vw, var(--text-lg))', lineHeight: 1.6,
          color: 'var(--color-ink-3)', margin: '0 0 clamp(28px, 4vw, 40px)',
          maxWidth: '52ch',
        }}>
          {t.hero.subtitle}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: 'clamp(28px, 4vw, 40px)' }}>
          <CtaLink href="/login?mode=signup" style={{
            background: 'var(--color-ink-1)', color: 'var(--color-void)',
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)',
            textDecoration: 'none', padding: '11px 22px',
            borderRadius: 'var(--radius-sm)', whiteSpace: 'nowrap',
          }}>
            {t.hero.cta}
          </CtaLink>
          <CtaLink href="/pricing" style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)',
            color: 'var(--color-ink-2)', textDecoration: 'none',
            padding: '11px 18px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-line-2)', whiteSpace: 'nowrap',
          }}>
            See pricing
          </CtaLink>
        </div>

        {/* Trust line. The green ticks are gone — green means money in this
            product, and "Any MT5 broker" is not money. */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 18px', alignItems: 'center' }}>
          {t.hero.trust.map((b, i) => (
            <div key={b} style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              {i > 0 && <span aria-hidden style={{ width: '1px', height: '11px', background: 'var(--color-line-2)' }} />}
              <span style={{
                fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)',
                letterSpacing: '0.04em', color: 'var(--color-ink-3)',
              }}>{b}</span>
            </div>
          ))}
        </div>
      </div>

      {/* The product itself, full-bleed under one hairline. */}
      <div style={{ borderTop: '1px solid var(--color-line-1)', background: 'var(--s1)' }}>
        <AnimatedDashboard />
      </div>
    </section>
  )
}
