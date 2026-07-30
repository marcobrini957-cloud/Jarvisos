'use client'

import { useLocale } from '@/hooks/useLocale'

/**
 * The proof band, on the 2.0 language.
 *
 * It was four gradient-clipped figures counting up inside a centred 1100px
 * column, over a background wash, under a blue gradient hairline. Gradient text
 * and decorative gradients are both on the ban list, and a number that counts
 * up on scroll is animation communicating nothing — the figure is the same
 * before and after.
 *
 * Now it is a band: full-bleed, hairline top and bottom, four cells divided by
 * hairlines, each ranged left on the page margin the hero uses. Figures are
 * mono and still, labels are the label voice.
 */

const FIGURES = ['50,000+', '+23%', '1.2s', '12']

export function StatsBar() {
  const { t } = useLocale()

  return (
    <div style={{
      borderTop: '1px solid var(--color-line-1)',
      borderBottom: '1px solid var(--color-line-1)',
      background: 'var(--color-void)',
    }}>
      {/* Four across, two across on a phone; the dividing hairlines follow the
          column count from CSS rather than from an index that cannot see it. */}
      <div className="vq-statband">
        {t.stats.map((s, i) => (
          <div key={s.label} style={{
            padding: 'clamp(18px, 2.6vw, 26px) clamp(14px, 4vw, 32px)',
            minWidth: 0,
          }}>
            <div className="vq-num" style={{
              fontSize: 'clamp(24px, 3.2vw, 34px)', lineHeight: 1,
              letterSpacing: '-0.03em', color: 'var(--color-ink-1)',
            }}>
              {FIGURES[i]}
            </div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
              letterSpacing: '0.16em', textTransform: 'uppercase',
              color: 'var(--color-ink-3)', marginTop: '9px',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
