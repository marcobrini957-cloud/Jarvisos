'use client'

// ── MetricRing ────────────────────────────────────────────────────────────────
// Shared 56px conic ring so every metric card carries the same circular visual in
// the same position. `pct` fills the coloured arc; `track` is the remainder (a
// dark groove for a gauge, or a second colour for a two-slice donut). `center`
// is the number shown in the hole (kept identical to the card's big value so the
// figures never disagree); omit it for a plain proportion donut.

export function MetricRing({
  pct, color, glow, track = 'var(--s3)', center, sub,
}: {
  pct: number
  color: string
  glow: string
  track?: string
  center?: string
  sub?: string
}) {
  const p   = Math.min(100, Math.max(0, pct))
  const deg = (p / 100) * 360
  const centerFont = center && center.length >= 4 ? '11px' : '13px'

  return (
    <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: '-5px', borderRadius: '50%', background: `radial-gradient(circle, ${glow.replace(/0\.\d+\)/, '0.1)')} 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `conic-gradient(${color} ${deg}deg, ${track} ${deg}deg)`, boxShadow: `0 0 14px ${glow}` }} />
      <div style={{ position: 'absolute', inset: '7px', borderRadius: '50%', background: 'var(--s1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
        {center && <span style={{ color, fontSize: centerFont, fontWeight: 700 }}>{center}</span>}
        {sub && <span style={{ color: 'var(--t3)', fontSize: '7px', letterSpacing: '0.06em', marginTop: '1px' }}>{sub}</span>}
      </div>
    </div>
  )
}
