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

      {/* The pitch is centred over the full-bleed product frame below it. It was
          ranged left against the nav margin, which on a wide screen left the
          headline pinned to one edge with a third of the viewport empty beside
          it — the sentence read as a caption rather than the claim. Centred, the
          column and the frame share one axis. */}
      <div style={{
        padding: 'clamp(56px, 8vw, 104px) clamp(14px, 4vw, 32px) clamp(40px, 6vw, 72px)',
        maxWidth: '1560px', margin: '0 auto', textAlign: 'center',
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
            claim lands, which is the sentence's actual emphasis.
            Tops out at --text-d5, a step added for this one line: the old
            ceiling of d4 was already reached at ~1190px, so every wider screen
            rendered it at exactly the same size. */}
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(var(--text-d1), 8.2vw, var(--text-d5))', lineHeight: 0.98,
          letterSpacing: '-0.035em', margin: '0 auto clamp(20px, 3vw, 28px)',
          maxWidth: '16ch', textWrap: 'balance',
        }}>
          <span style={{ color: 'var(--color-ink-2)' }}>{t.hero.h1a}</span>{' '}
          <span style={{ color: 'var(--color-ink-1)' }}>{t.hero.h1b}</span>
        </h1>

        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(var(--text-md), 1.5vw, var(--text-lg))', lineHeight: 1.6,
          color: 'var(--color-ink-3)', margin: '0 auto clamp(28px, 4vw, 40px)',
          maxWidth: '52ch',
        }}>
          {t.hero.subtitle}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: 'clamp(28px, 4vw, 40px)' }}>
          {/* The one commercial click on the page, so it takes the action blue
              rather than the ink-on-void the rest of the site uses. Same token
              the affiliate CTAs carry — deliberately outside the P&L hues, and
              the only chroma in this viewport. Not --color-key: that blue is
              tuned to sit quietly under white text (2.8:1) and would fail as a
              button; --color-action clears AA at 4.5:1. */}
          <CtaLink href="/login?mode=signup" where="hero" style={{
            background: 'var(--color-action)', color: 'var(--color-action-ink)',
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)',
            textDecoration: 'none', padding: '11px 22px',
            borderRadius: 'var(--radius-sm)', whiteSpace: 'nowrap',
          }}>
            {t.hero.cta}
          </CtaLink>
          <CtaLink href="/pricing" where="hero-pricing" style={{
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
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px 18px', alignItems: 'center' }}>
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
