'use client'

// ── Donut Chart ───────────────────────────────────────────────────────────────

export function DonutChart({ slices }: { slices: Array<{ pct: number; color: string }> }) {
  // SVG donut: circumference = 2π × 15.9155 ≈ 100 (convenient unit)
  // dashoffset = 25 starts at 12 o'clock; subtract accumulated pct for each segment
  let acc = 0
  const segments = slices
    .filter(s => s.pct > 1)
    .map(s => {
      const dashoffset = 25 - acc
      acc += s.pct
      return { ...s, dashoffset, dash: Math.max(0, s.pct - 0.8) }
    })

  return (
    <svg viewBox="0 0 36 36" style={{ width: '108px', height: '108px', flexShrink: 0 }}>
      {/* Track */}
      <circle cx="18" cy="18" r="15.9155" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3.8" />
      {segments.map((s, i) => (
        <circle key={i}
          cx="18" cy="18" r="15.9155"
          fill="none"
          stroke={s.color}
          strokeWidth="3.8"
          strokeLinecap="round"
          strokeDasharray={`${s.dash} ${100 - s.dash}`}
          strokeDashoffset={s.dashoffset}
        />
      ))}
    </svg>
  )
}

// ── Breakdown categories (order = donut order) ────────────────────────────────

export const BREAKDOWN_CATS: Array<{ key: string; label: string; color: string }> = [
  { key: 'etf',    label: 'ETFs',    color: '#00C46A' },
  { key: 'tech',   label: 'Tech',    color: '#FFFFFF' },
  { key: 'stock',  label: 'Stocks',  color: '#FFFFFF' },
  { key: 'metal',  label: 'Metals',  color: '#FFFFFF' },
  { key: 'crypto', label: 'Crypto',  color: '#FFFFFF' },
  { key: 'cash',   label: 'Cash',    color: '#707070' },
]
