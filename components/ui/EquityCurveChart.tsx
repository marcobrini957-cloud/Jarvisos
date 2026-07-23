'use client'

import { useEffect, useRef, useState } from 'react'

interface Point { date: string; balance: number; equity: number }

interface Props {
  days?:      number
  height?:    number
  showStats?: boolean       // header row: current value, period P&L, max drawdown + switcher
  portfolioValue?: number   // current portfolio holdings (EUR) — folded in as the net-worth baseline
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

const PERIODS = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '1Y', days: 365 },
] as const

// Catmull-Rom → cubic Bézier: a smooth, natural curve through every point.
function smoothLine(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  if (pts.length === 2) return `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y}`
  const t = 0.16
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) * t, c1y = p1.y + (p2.y - p0.y) * t
    const c2x = p2.x - (p3.x - p1.x) * t, c2y = p2.y - (p3.y - p1.y) * t
    d += ` C ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }
  return d
}

export default function EquityCurveChart({ days = 30, height = 160, showStats = false, portfolioValue = 0 }: Props) {
  const [period,  setPeriod]  = useState(days)
  const [points,  setPoints]  = useState<Point[]>([])
  const [netDeposits, setNetDeposits] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; value: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/account/snapshots?days=${period}`)
      .then(r => r.json())
      .then(d => { setPoints(d.points ?? []); setNetDeposits(d.netDeposits ?? 0) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period])

  const W = 800
  const H = height
  const PAD_L = 8, PAD_R = 8, PAD_T = 16, PAD_B = 28
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B

  if (loading) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--t3)', fontSize: '12px' }}>Loading…</span>
      </div>
    )
  }

  if (points.length < 2) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '6px' }}>
        <span style={{ color: 'var(--t3)', fontSize: '12px' }}>Net worth appears once your account syncs</span>
      </div>
    )
  }

  // Net worth = account equity (balance + floating) + current portfolio holdings.
  // We have no historical portfolio snapshots, so the holdings value is folded in
  // as a constant baseline — the shape tracks trading, the total is your net worth.
  const series = points.map(p => p.equity + portfolioValue)
  const n = series.length

  const minVal = Math.min(...series)
  const maxVal = Math.max(...series)
  const padding = (maxVal - minVal) * 0.12 || 50
  const lo = minVal - padding
  const hi = maxVal + padding
  const range = hi - lo || 1

  const xOf = (i: number) => PAD_L + (i / (n - 1)) * innerW
  const yOf = (v: number) => PAD_T + (1 - (v - lo) / range) * innerH
  const coords = series.map((v, i) => ({ x: xOf(i), y: yOf(v) }))

  const linePath = smoothLine(coords)
  const bottom = PAD_T + innerH
  const areaPath = linePath ? `${linePath} L ${xOf(n - 1).toFixed(1)},${bottom} L ${xOf(0).toFixed(1)},${bottom} Z` : ''

  const startVal = series[0]
  const endVal   = series[n - 1]
  const isUp     = endVal >= startVal
  const lineColor = isUp ? 'var(--gr2)' : 'var(--re)'

  // Period P&L: equity delta MINUS funding — a deposit is not a win, a withdrawal
  // not a loss. (Portfolio is a constant baseline, so it nets out of the delta.)
  const periodPnl = (points[n - 1].equity - points[0].equity) - netDeposits
  const periodPct = startVal > 0 ? (periodPnl / startVal) * 100 : 0

  let peak = series[0], maxDd = 0
  for (const v of series) { if (v > peak) peak = v; maxDd = Math.max(maxDd, peak - v) }
  const maxDdPct = peak > 0 ? (maxDd / peak) * 100 : 0

  // Y axis ticks
  const ticks = Array.from({ length: 3 }, (_, i) => lo + (i / 2) * range).reverse()

  // X axis labels — ~4 evenly
  const xLabels: { label: string; x: number }[] = []
  const step = Math.max(1, Math.floor(n / 4))
  for (let i = 0; i < n; i += step) {
    const d = new Date(points[i].date)
    xLabels.push({ label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), x: xOf(i) })
  }

  const gradId = `nw-grad-${isUp ? 'up' : 'dn'}`

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current || n < 2) return
    const rect = svgRef.current.getBoundingClientRect()
    const rawX = (e.clientX - rect.left) * (W / rect.width) - PAD_L
    const idx = clamp(Math.round((rawX / innerW) * (n - 1)), 0, n - 1)
    setTooltip({ x: xOf(idx), y: yOf(series[idx]), date: points[idx].date, value: series[idx] })
  }

  const eur2 = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {showStats && (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              €{eur2(endVal)}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: periodPnl >= 0 ? 'var(--gr2)' : 'var(--re)' }}>
              {periodPnl >= 0 ? '+' : '−'}€{eur2(Math.abs(periodPnl))}
              {' '}({periodPct >= 0 ? '+' : ''}{periodPct.toFixed(1)}%) trading
            </span>
            {portfolioValue > 0 && (
              <span style={{ fontSize: '11px', color: 'var(--t3)' }}>
                incl. €{portfolioValue.toLocaleString('en-US', { maximumFractionDigits: 0 })} portfolio
              </span>
            )}
            <span style={{ fontSize: '11px', color: 'var(--t3)' }}>
              Max DD <span style={{ color: maxDd > 0 ? 'var(--re)' : 'var(--t2)', fontWeight: 600 }}>
                −€{maxDd.toLocaleString('en-US', { maximumFractionDigits: 0 })} ({maxDdPct.toFixed(1)}%)
              </span>
            </span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {PERIODS.map(p => (
              <button
                key={p.label}
                onClick={() => setPeriod(p.days)}
                style={{
                  fontSize: '10px', fontWeight: 600, padding: '3px 9px', borderRadius: '6px',
                  background: period === p.days ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: period === p.days ? '1px solid var(--bd2)' : '1px solid transparent',
                  color: period === p.days ? 'var(--t1)' : 'var(--t3)', cursor: 'pointer',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height, display: 'block', overflow: 'visible' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={lineColor} stopOpacity="0.20" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0"    />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {ticks.map((v, i) => {
          const y = yOf(v)
          return (
            <g key={i}>
              <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y}
                stroke="var(--bd)" strokeWidth="0.5" strokeDasharray="3,3" />
              <text x={PAD_L} y={y - 4} fill="var(--t3)" fontSize="9" textAnchor="start">
                €{Math.round(v).toLocaleString()}
              </text>
            </g>
          )
        })}

        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Net worth line */}
        <path d={linePath} stroke={lineColor} strokeWidth="2" fill="none"
          strokeLinejoin="round" strokeLinecap="round" />

        {/* X axis labels */}
        {xLabels.map((l, i) => (
          <text key={i} x={l.x} y={H - 6} fill="var(--t3)" fontSize="9" textAnchor="middle">
            {l.label}
          </text>
        ))}

        {/* Tooltip crosshair */}
        {tooltip && (
          <>
            <line x1={tooltip.x} x2={tooltip.x} y1={PAD_T} y2={PAD_T + innerH}
              stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,2" />
            <circle cx={tooltip.x} cy={tooltip.y} r="3.5" fill={lineColor}
              stroke="var(--s1)" strokeWidth="1.5" />
          </>
        )}
      </svg>

      {/* Tooltip bubble */}
      {tooltip && (() => {
        const pct  = startVal > 0 ? ((tooltip.value - startVal) / startVal * 100) : 0
        const pctStr = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
        return (
          <div style={{
            position: 'absolute',
            left: `calc(${(tooltip.x / W * 100).toFixed(1)}% + 10px)`,
            top: '8px',
            pointerEvents: 'none',
            background: 'var(--s2)',
            border: '1px solid var(--bd2)',
            borderRadius: '8px',
            padding: '7px 10px',
            fontSize: '11px',
            color: 'var(--t1)',
            whiteSpace: 'nowrap',
            zIndex: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}>
            <div style={{ color: 'var(--t3)', fontSize: '10px', marginBottom: '3px' }}>
              {new Date(tooltip.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <div style={{ fontWeight: 600 }}>€{eur2(tooltip.value)}</div>
            <div style={{ color: isUp ? 'var(--gr2)' : 'var(--re)', fontSize: '10px' }}>{pctStr} from start</div>
          </div>
        )
      })()}
    </div>
  )
}
