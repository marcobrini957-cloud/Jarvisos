'use client'

import { useId } from 'react'

// ── Donut Chart ───────────────────────────────────────────────────────────────

/**
 * The big allocation ring.
 *
 * It was 108px of flat `stroke-dasharray` on a single circle: one weight, one
 * colour per segment, no depth. Two things that could not be done that way and
 * are the whole reason it now draws real annular sectors —
 *
 *  · each segment carries its own gradient, so the ring catches light across
 *    its face instead of reading as printed tape;
 *  · segments are separated by a real gap in the geometry rather than by a
 *    0.8-unit hole punched in the dash pattern, which used to swallow small
 *    slices entirely.
 *
 * The gloss is three layers, in this order, and the order matters: gradient
 * fills, then a specular sweep from the upper left, then a hairline rim. A
 * single white overlay on its own looks like a sticker; light that follows the
 * form looks like an object.
 *
 * It stays a ring rather than becoming a filled pie like the reference, because
 * the card centres a live figure inside it — on a pie that label would sit on
 * top of whichever segment happened to be there.
 *
 * Small rings elsewhere (the 48px metric-card dials) are deliberately NOT this.
 * At that size gradients turn to mud, and they read as one glance, not a chart.
 */
export function DonutChart({
  slices, size = 168,
}: {
  slices: Array<{ pct: number; color: string }>
  /** Outer diameter in px. This is the "big" chart — do not shrink it below ~140. */
  size?: number
}) {
  // Gradient ids must be unique per instance or a second chart on the page
  // inherits the first one's fills.
  const uid = useId().replace(/[:]/g, '')

  const R = 50            // outer radius in viewBox units
  const r = 31            // inner radius — a ring wide enough to hold a gradient
  const GAP = 1.6         // degrees of separation between segments
  const C = 60            // viewBox centre

  const visible = slices.filter(s => s.pct > 0.6)
  const total = visible.reduce((s, x) => s + x.pct, 0) || 1

  // Start at twelve o'clock and run clockwise.
  let a = -90
  const arcs = visible.map((s, i) => {
    const sweep = (s.pct / total) * 360
    const a0 = a + GAP / 2
    const a1 = a + sweep - GAP / 2
    a += sweep
    return { ...s, a0, a1, i, full: visible.length === 1 }
  })

  const pt = (deg: number, rad: number) => {
    const t = (deg * Math.PI) / 180
    return [C + rad * Math.cos(t), C + rad * Math.sin(t)]
  }

  const sector = (a0: number, a1: number) => {
    const large = a1 - a0 > 180 ? 1 : 0
    const [x0, y0] = pt(a0, R)
    const [x1, y1] = pt(a1, R)
    const [x2, y2] = pt(a1, r)
    const [x3, y3] = pt(a0, r)
    return `M${x0.toFixed(2)},${y0.toFixed(2)} A${R},${R} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)} L${x2.toFixed(2)},${y2.toFixed(2)} A${r},${r} 0 ${large} 0 ${x3.toFixed(2)},${y3.toFixed(2)} Z`
  }

  return (
    <svg
      viewBox="0 0 120 120"
      style={{ width: `${size}px`, height: `${size}px`, flexShrink: 0, display: 'block', overflow: 'visible' }}
    >
      <defs>
        {/* One gradient per segment, all lit from the same upper-left source so
            the ring reads as a single object under one light. */}
        {arcs.map(s => (
          <linearGradient key={s.i} id={`${uid}-g${s.i}`} x1="0.12" y1="0" x2="0.88" y2="1">
            <stop offset="0%"   stopColor={s.color} stopOpacity="1" />
            <stop offset="52%"  stopColor={s.color} stopOpacity="0.82" />
            <stop offset="100%" stopColor={s.color} stopOpacity="0.58" />
          </linearGradient>
        ))}

        {/* Specular sweep — an off-centre highlight, not a centred glow. */}
        <radialGradient id={`${uid}-spec`} cx="0.33" cy="0.24" r="0.62">
          <stop offset="0%"   stopColor="#fff" stopOpacity="0.20" />
          <stop offset="45%"  stopColor="#fff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>

        {/* And the shadow side, so the lower right falls away. */}
        <radialGradient id={`${uid}-shade`} cx="0.74" cy="0.82" r="0.55">
          <stop offset="0%"   stopColor="#000" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>

        {/* Keeps both overlays inside the ring instead of over the hole. */}
        <mask id={`${uid}-ring`}>
          <circle cx={C} cy={C} r={R} fill="#fff" />
          <circle cx={C} cy={C} r={r} fill="#000" />
        </mask>

        <filter id={`${uid}-drop`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.55" />
        </filter>
      </defs>

      {/* Track, so a partly-filled ring still reads as a ring. */}
      <circle cx={C} cy={C} r={(R + r) / 2} fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth={R - r} />

      <g filter={`url(#${uid}-drop)`}>
        {arcs.map(s => (
          s.full
            // A single 100% slice cannot be drawn as an arc — the start and end
            // points coincide and the path collapses.
            ? <circle key={s.i} cx={C} cy={C} r={(R + r) / 2} fill="none"
                stroke={`url(#${uid}-g${s.i})`} strokeWidth={R - r} />
            : <path key={s.i} d={sector(s.a0, s.a1)} fill={`url(#${uid}-g${s.i})`} />
        ))}
      </g>

      <g mask={`url(#${uid}-ring)`} style={{ pointerEvents: 'none' }}>
        <rect x="0" y="0" width="120" height="120" fill={`url(#${uid}-shade)`} />
        <rect x="0" y="0" width="120" height="120" fill={`url(#${uid}-spec)`} />
      </g>

      {/* Hairline rims. The outer catches the light, the inner keeps the hole
          from bleeding into the segments. */}
      <circle cx={C} cy={C} r={R} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="0.6" />
      <circle cx={C} cy={C} r={r} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="0.8" />
      <circle cx={C} cy={C} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.4" />
    </svg>
  )
}

// ── Breakdown categories (order = donut order) ────────────────────────────────

/**
 * Allocation is not P&L, so it gets no chroma — the segments separate by
 * brightness instead. ETFs used to be profit-green and four of the six were the
 * same white, which made the donut both wrong and unreadable. Cash sits at the
 * bottom of the ramp because it is the part that is not invested.
 */
export const BREAKDOWN_CATS: Array<{ key: string; label: string; color: string }> = [
  { key: 'etf',    label: 'ETFs',    color: 'rgba(255,255,255,0.92)' },
  { key: 'tech',   label: 'Tech',    color: 'rgba(255,255,255,0.74)' },
  { key: 'stock',  label: 'Stocks',  color: 'rgba(255,255,255,0.56)' },
  { key: 'metal',  label: 'Metals',  color: 'rgba(255,255,255,0.40)' },
  { key: 'crypto', label: 'Crypto',  color: 'rgba(255,255,255,0.26)' },
  { key: 'cash',   label: 'Cash',    color: 'rgba(255,255,255,0.14)' },
]
