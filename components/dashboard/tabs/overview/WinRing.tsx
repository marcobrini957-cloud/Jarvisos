'use client'

// ── Win Rate Ring ─────────────────────────────────────────────────────────────
// A gauge, not a light source. The neon halo it used to carry (a 14px coloured
// box-shadow plus a radial bloom) read as a game HUD next to a P&L figure.

export function WinRing({ wr }: { wr: number }) {
  const pct   = Math.min(100, Math.max(0, wr))
  const color = pct >= 65 ? 'var(--gr2)' : pct >= 50 ? 'var(--am2)' : 'var(--re)'
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
        <span className="num" style={{ color, fontSize: '13px', fontWeight: 600 }}>{pct.toFixed(0)}%</span>
      </div>
    </div>
  )
}
