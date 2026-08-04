'use client'

import { Num, Ring } from '@/components/ui/vq'

// ── Win Rate Ring ─────────────────────────────────────────────────────────────
// A gauge, not a light source. The neon halo it used to carry read as a game
// HUD next to a P&L figure; then it spent a while as a 56px conic ring twice as
// thick as the dials beside it. Same Ring as every other dial now.

export function WinRing({ wr }: { wr: number }) {
  const pct = Math.min(100, Math.max(0, wr))
  // A win rate is not money, so it does not get money's colours. It does not
  // get --color-key either: with the dials finally the same size, three
  // saturated blue rings in one row out-shouted the figures they annotate. The
  // arc is ink; the number is the thing you are meant to read.
  return (
    <Ring segments={[{ pct, color: 'var(--color-ink-1)' }]} size={52}>
      <Num size="base">{pct.toFixed(0)}%</Num>
    </Ring>
  )
}
