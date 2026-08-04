'use client'

import { Num, Ring } from '@/components/ui/vq'

// ── Profit / Loss Donut ───────────────────────────────────────────────────────
// Gross profit against gross loss, with the profit factor in the hole — >1 means
// the greens outweigh the reds. The one ring on the dashboard whose colours are
// money, so the one that keeps green and red.

export function PnlDonut({ profit, loss }: { profit: number; loss: number }) {
  const total = profit + loss
  if (total <= 0) return null

  const pf      = loss > 0 ? profit / loss : profit > 0 ? Infinity : 0
  const pfLabel = pf === Infinity ? '∞' : pf.toFixed(2)

  return (
    <Ring
      size={52}
      sub="PF"
      title={`Gross profit €${profit.toFixed(0)} vs loss €${loss.toFixed(0)} · PF ${pfLabel}`}
      segments={[
        { pct: (profit / total) * 100, color: 'var(--color-up)',   label: `Profit €${profit.toFixed(0)}` },
        { pct: (loss   / total) * 100, color: 'var(--color-down)', label: `Loss €${loss.toFixed(0)}` },
      ]}
    >
      <Num size="xs" tone={pf >= 1 ? 'up' : 'down'}>{pfLabel}</Num>
    </Ring>
  )
}
