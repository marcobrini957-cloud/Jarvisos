'use client'

// ── Win Rate Ring ─────────────────────────────────────────────────────────────

export function WinRing({ wr }: { wr: number }) {
  const pct   = Math.min(100, Math.max(0, wr))
  const color = pct >= 65 ? 'var(--gr2)' : pct >= 50 ? 'var(--am2)' : 'var(--re)'
  const glow  = pct >= 65 ? 'rgba(0,232,122,0.45)' : pct >= 50 ? 'rgba(240,168,64,0.45)' : 'rgba(255,61,80,0.45)'
  const deg   = (pct / 100) * 360
  return (
    <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: '-5px', borderRadius: '50%', background: `radial-gradient(circle, ${glow.replace('0.45','0.1')} 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `conic-gradient(${color} ${deg}deg, var(--s3) ${deg}deg)`, boxShadow: `0 0 14px ${glow}` }} />
      <div style={{ position: 'absolute', inset: '7px', borderRadius: '50%', background: 'var(--s1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color, fontSize: '13px', fontWeight: 700 }}>{pct.toFixed(0)}%</span>
      </div>
    </div>
  )
}
