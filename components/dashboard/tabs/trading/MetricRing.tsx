'use client'

import { Num } from '@/components/ui/vq'

// ── MetricRing ────────────────────────────────────────────────────────────────
// Shared 48px gauge so every metric card carries the same circular visual in the
// same position. `pct` fills the arc; `track` is the remainder. `center` is the
// number shown in the hole (kept identical to the card's big value so the
// figures never disagree); omit it for a plain proportion donut.
//
// The ring used to sit inside two glows — a radial halo and a 14px box-shadow.
// 2.0 has no glow: the arc is 3px of colour on a hairline groove, and the hole
// is the panel surface, not a lighter disc.

export function MetricRing({
  pct, color, glow, track = 'var(--color-surface-2)', center, sub,
}: {
  pct: number
  color: string
  /** Kept for callers; 2.0 draws no halo. */
  glow?: string
  track?: string
  center?: string
  sub?: string
}) {
  const p   = Math.min(100, Math.max(0, pct))
  const deg = (p / 100) * 360

  return (
    <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: `conic-gradient(${color} ${deg}deg, ${track} ${deg}deg)`,
      }} />
      <div style={{
        position: 'absolute', inset: '3px', borderRadius: '50%',
        background: 'var(--color-void)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        lineHeight: 1, gap: '1px',
      }}>
        {center && <Num size="xs" style={{ color }}>{center}</Num>}
        {sub && (
          <span style={{
            fontFamily: 'var(--font-display)', color: 'var(--color-ink-3)',
            fontSize: '7px', letterSpacing: '0.14em', textTransform: 'uppercase',
          }}>
            {sub}
          </span>
        )}
      </div>
    </div>
  )
}
