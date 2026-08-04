'use client'

import { Num, Ring } from '@/components/ui/vq'

// ── MetricRing ────────────────────────────────────────────────────────────────
// The metric-card dial. Geometry, track and hole now come from the shared Ring
// (components/ui/vq/Ring) — this is only the metric card's arrangement of it:
// the arc, the card's own figure repeated in the hole, and a micro-caption.
//
// It used to draw its own 48px conic gradient over a solid black disc, one of
// four ring implementations on the same screen. See Ring's header.

export function MetricRing({
  pct, color, track, center, sub,
}: {
  pct: number
  color: string
  /** @deprecated The shared ring owns the track. Accepted so callers need no edit. */
  track?: string
  center?: string
  sub?: string
}) {
  const p = Math.min(100, Math.max(0, pct))
  return (
    <Ring segments={[{ pct: p, color }]} size={52} sub={sub}>
      {center && <Num size="xs" style={{ color }}>{center}</Num>}
    </Ring>
  )
}
