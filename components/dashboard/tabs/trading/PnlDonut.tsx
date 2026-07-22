'use client'

// ── Profit / Loss Donut ───────────────────────────────────────────────────────
// Mirrors the Win-Rate ring: a 56px conic donut splitting gross profit (green)
// vs gross loss (red). Center shows the profit factor so the card reads at a
// glance — >1 means the greens outweigh the reds.

export function PnlDonut({ profit, loss }: { profit: number; loss: number }) {
  const total = profit + loss
  if (total <= 0) return null

  const pShare = (profit / total) * 100
  const deg    = (pShare / 100) * 360
  const pf     = loss > 0 ? profit / loss : profit > 0 ? Infinity : 0

  const green = 'var(--gr2)'
  const red   = 'var(--re)'
  const centerCol = pf >= 1 ? green : red
  const glow  = pf >= 1 ? 'rgba(0,232,122,0.4)' : 'rgba(255,61,80,0.4)'
  const pfLabel = pf === Infinity ? '∞' : pf.toFixed(1)

  return (
    <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}
      title={`Gross profit €${profit.toFixed(0)} vs loss €${loss.toFixed(0)} · PF ${pfLabel}`}>
      <div style={{ position: 'absolute', inset: '-5px', borderRadius: '50%', background: `radial-gradient(circle, ${glow.replace('0.4','0.1')} 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `conic-gradient(${green} ${deg}deg, ${red} ${deg}deg)`, boxShadow: `0 0 14px ${glow}` }} />
      <div style={{ position: 'absolute', inset: '7px', borderRadius: '50%', background: 'var(--s1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
        <span style={{ color: centerCol, fontSize: '12px', fontWeight: 700 }}>{pfLabel}</span>
        <span style={{ color: 'var(--t3)', fontSize: '7px', letterSpacing: '0.06em', marginTop: '1px' }}>PF</span>
      </div>
    </div>
  )
}
