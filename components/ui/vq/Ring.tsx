'use client'

import type { ReactNode } from 'react'

/**
 * Every ring in the product.
 *
 * There were four, and on the Trading tab you could see three of them at once:
 * a 48px green/red conic donut, a 56px blue one with a ring twice as thick, and
 * two more 48px dials — plus the Portfolio allocation ring, drawn as annular
 * sectors with per-segment gradients, a specular sweep and a drop shadow. Five
 * charts, four techniques, three ring weights. That is what "out of place"
 * looks like, and no amount of tidying the panels around them fixes it.
 *
 * One geometry, expressed as ratios of the diameter so a 44px dial and a 168px
 * allocation ring are the same object at two sizes:
 *
 *   ring width   11.5% of the diameter
 *   track        white at 7%, always present, so a part-filled ring still reads
 *                as a ring rather than a floating arc
 *   gap          2° between segments, cut from the geometry — a dash-pattern
 *                hole swallows small slices whole
 *   hole         transparent. The old ones punched a solid black disc, which
 *                over a translucent panel on a lit background is a hole in the
 *                screen.
 *
 * Colour is the caller's, because the colour rule already decides it: green and
 * red for money, --color-key for a figure that matters and is not money, ink
 * for everything else. What was never decided was the geometry, which is why
 * they all drifted.
 *
 * Flat, deliberately. The allocation ring's gloss made it the one object on the
 * dashboard lit from a different direction than everything else.
 */

export interface RingSegment {
  pct:   number
  color: string
  /** Optional label for the title attribute — hover tells you what a slice is. */
  label?: string
}

const WIDTH_RATIO = 0.115
const GAP_DEG     = 2
const VB          = 100

export function Ring({
  segments, size = 48, children, sub, title, track = 'rgba(255,255,255,0.07)',
}: {
  segments: RingSegment[]
  /** Outer diameter in px. */
  size?:    number
  /** Centre content — a figure, normally. */
  children?: ReactNode
  /** Micro-caption under the centre figure. */
  sub?:     string
  title?:   string
  track?:   string
}) {
  const w = VB * WIDTH_RATIO
  const R = (VB - w) / 2          // radius of the stroke's centre line
  const C = VB / 2
  const circumference = 2 * Math.PI * R

  const visible = segments.filter(s => s.pct > 0.4)
  const total   = visible.reduce((s, x) => s + x.pct, 0) || 1
  const single  = visible.length === 1

  // Degrees → dash lengths. A single segment gets no gap: with one slice the
  // start and end coincide and a gap would show as a nick in a full ring.
  let offset = 0
  const arcs = visible.map((s, i) => {
    const sweep = (s.pct / total) * 360
    const gap   = single ? 0 : GAP_DEG
    const len   = Math.max(0, ((sweep - gap) / 360) * circumference)
    const dash  = `${len} ${circumference - len}`
    const shift = ((offset + gap / 2) / 360) * circumference
    offset += sweep
    return { key: i, color: s.color, label: s.label, dash, shift }
  })

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }} title={title}>
      <svg viewBox={`0 0 ${VB} ${VB}`} width={size} height={size} style={{ display: 'block', transform: 'rotate(-90deg)' }}>
        <circle cx={C} cy={C} r={R} fill="none" stroke={track} strokeWidth={w} />
        {arcs.map(a => (
          <circle
            key={a.key}
            cx={C} cy={C} r={R}
            fill="none"
            stroke={a.color}
            strokeWidth={w}
            strokeDasharray={a.dash}
            strokeDashoffset={-a.shift}
            strokeLinecap={single ? 'round' : 'butt'}
          >
            {a.label && <title>{a.label}</title>}
          </circle>
        ))}
      </svg>

      {(children || sub) && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1, gap: '2px', pointerEvents: 'none',
        }}>
          {children}
          {sub && (
            <span style={{
              fontFamily: 'var(--font-display)', color: 'var(--color-ink-3)',
              fontSize: 'var(--text-2xs)', letterSpacing: '0.14em', textTransform: 'uppercase',
            }}>
              {sub}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
