'use client'

import { Num } from '@/components/ui/vq'

// ── Profit / Loss Donut ───────────────────────────────────────────────────────
// Mirrors MetricRing: a 48px conic donut splitting gross profit vs gross loss.
// Center shows the profit factor so the card reads at a glance — >1 means the
// greens outweigh the reds.

export function PnlDonut({ profit, loss }: { profit: number; loss: number }) {
  const total = profit + loss
  if (total <= 0) return null

  const pShare = (profit / total) * 100
  const deg    = (pShare / 100) * 360
  const pf     = loss > 0 ? profit / loss : profit > 0 ? Infinity : 0

  const pfLabel = pf === Infinity ? '∞' : pf.toFixed(2)

  return (
    <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}
      title={`Gross profit €${profit.toFixed(0)} vs loss €${loss.toFixed(0)} · PF ${pfLabel}`}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: `conic-gradient(var(--color-up) ${deg}deg, var(--color-down) ${deg}deg)`,
      }} />
      <div style={{
        position: 'absolute', inset: '3px', borderRadius: '50%',
        background: 'var(--color-void)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        lineHeight: 1, gap: '1px',
      }}>
        <Num size="xs" tone={pf >= 1 ? 'up' : 'down'}>{pfLabel}</Num>
        <span style={{
          fontFamily: 'var(--font-display)', color: 'var(--color-ink-3)',
          fontSize: '7px', letterSpacing: '0.14em', textTransform: 'uppercase',
        }}>
          PF
        </span>
      </div>
    </div>
  )
}
