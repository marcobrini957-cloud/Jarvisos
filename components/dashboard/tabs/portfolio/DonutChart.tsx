'use client'

import { Ring } from '@/components/ui/vq'

// ── Donut Chart ───────────────────────────────────────────────────────────────

/**
 * The big allocation ring.
 *
 * It used to draw real annular sectors with a gradient per segment, a specular
 * sweep from the upper left and a drop shadow — an object lit from its own
 * direction, sitting two cards away from three flat dials. On its own it looked
 * good; on the page it was the reason the charts read as assembled from
 * different products.
 *
 * It is the shared Ring at a large size now: same ring-to-diameter ratio, same
 * track, same 2° gaps, transparent hole. It stays a ring rather than a filled
 * pie because the card centres a live figure inside it, and on a pie that label
 * would sit on top of whichever segment happened to be underneath.
 */
export function DonutChart({
  slices, size = 168,
}: {
  slices: Array<{ pct: number; color: string; label?: string }>
  /** Outer diameter in px. This is the "big" chart — do not shrink it below ~140. */
  size?: number
}) {
  return <Ring segments={slices} size={size} />
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
