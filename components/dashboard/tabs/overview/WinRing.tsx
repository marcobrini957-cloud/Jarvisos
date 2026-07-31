'use client'

// ── Win Rate Ring ─────────────────────────────────────────────────────────────
// A gauge, not a light source. The neon halo it used to carry (a 14px coloured
// box-shadow plus a radial bloom) read as a game HUD next to a P&L figure.

export function WinRing({ wr }: { wr: number }) {
  const pct   = Math.min(100, Math.max(0, wr))
  // A win rate is not money, so it does not get money's colours. Green above
  // 65 / amber / red below 50 made three different judgements about the same
  // figure and put profit-green on a number that is not profit; the percentage
  // already says whether it is good.
  const color = 'var(--color-key)'
  const deg   = (pct / 100) * 360

  return (
    <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: `conic-gradient(${color} ${deg}deg, var(--s3) ${deg}deg)`,
      }} />
      <div style={{
        position: 'absolute', inset: '7px', borderRadius: '50%', background: 'var(--s1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span className="num" style={{ color: 'var(--color-ink-1)', fontSize: 'var(--text-base)', fontWeight: 600 }}>{pct.toFixed(0)}%</span>
      </div>
    </div>
  )
}
