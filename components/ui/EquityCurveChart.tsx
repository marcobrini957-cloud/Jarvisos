'use client'

import { useEffect, useRef, useState } from 'react'

interface Point { date: string; balance: number; equity: number }

interface Props {
  days?:   number
  height?: number
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

export default function EquityCurveChart({ days = 60, height = 160 }: Props) {
  const [points,  setPoints]  = useState<Point[]>([])
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; p: Point } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/account/snapshots?days=${days}`)
      .then(r => r.json())
      .then(d => setPoints(d.points ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [days])

  const W = 800
  const H = height
  const PAD_L = 8
  const PAD_R = 8
  const PAD_T = 16
  const PAD_B = 28

  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B

  function buildPath(pts: Point[], key: 'balance' | 'equity', minVal: number, maxVal: number) {
    if (pts.length < 2) return ''
    const range = maxVal - minVal || 1
    return pts.map((p, i) => {
      const x = PAD_L + (i / (pts.length - 1)) * innerW
      const y = PAD_T + (1 - (p[key] - minVal) / range) * innerH
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    }).join(' ')
  }

  function buildArea(pts: Point[], key: 'balance' | 'equity', minVal: number, maxVal: number) {
    if (pts.length < 2) return ''
    const range = maxVal - minVal || 1
    const line = pts.map((p, i) => {
      const x = PAD_L + (i / (pts.length - 1)) * innerW
      const y = PAD_T + (1 - (p[key] - minVal) / range) * innerH
      return `${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' L ')
    const lastX = PAD_L + innerW
    const firstX = PAD_L
    const bottom = PAD_T + innerH
    return `M ${firstX},${bottom} L ${line} L ${lastX},${bottom} Z`
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current || points.length < 2) return
    const rect = svgRef.current.getBoundingClientRect()
    const rawX = (e.clientX - rect.left) * (W / rect.width) - PAD_L
    const idx = clamp(Math.round((rawX / innerW) * (points.length - 1)), 0, points.length - 1)
    const p = points[idx]
    const x = PAD_L + (idx / (points.length - 1)) * innerW
    const range = maxVal - minVal || 1
    const y = PAD_T + (1 - (p.balance - minVal) / range) * innerH
    setTooltip({ x, y, p })
  }

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
        <span style={{ fontSize: '22px', opacity: 0.3 }}>📈</span>
        <span style={{ color: 'var(--t3)', fontSize: '12px' }}>Equity curve appears once your account syncs</span>
      </div>
    )
  }

  const allValues = points.flatMap(p => [p.balance, p.equity])
  const minVal = Math.min(...allValues)
  const maxVal = Math.max(...allValues)
  const padding = (maxVal - minVal) * 0.08 || 50
  const lo = minVal - padding
  const hi = maxVal + padding
  const range = hi - lo

  const balancePath = buildPath(points, 'balance', lo, hi)
  const equityPath  = buildPath(points, 'equity',  lo, hi)
  const areaPath    = buildArea(points, 'balance', lo, hi)

  // First vs last for colour
  const startBal = points[0].balance
  const endBal   = points[points.length - 1].balance
  const isUp     = endBal >= startBal
  const lineColor = isUp ? 'var(--gr2)' : 'var(--re)'

  // Y axis tick values
  const tickCount = 3
  const ticks = Array.from({ length: tickCount }, (_, i) =>
    lo + (i / (tickCount - 1)) * range
  ).reverse()

  // X axis labels — sample ~4 evenly
  const xLabels: { label: string; x: number }[] = []
  const step = Math.max(1, Math.floor(points.length / 4))
  for (let i = 0; i < points.length; i += step) {
    const p = points[i]
    const x = PAD_L + (i / (points.length - 1)) * innerW
    const d = new Date(p.date)
    xLabels.push({ label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), x })
  }

  const gradId = `eq-grad-${isUp ? 'up' : 'dn'}`

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height, display: 'block', overflow: 'visible' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={lineColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0"    />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {ticks.map((v, i) => {
          const y = PAD_T + (1 - (v - lo) / range) * innerH
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

        {/* Equity line (dotted, subtle) */}
        <path d={equityPath} stroke="rgba(255,255,255,0.12)" strokeWidth="1"
          fill="none" strokeDasharray="3,3" />

        {/* Balance line */}
        <path d={balancePath} stroke={lineColor} strokeWidth="1.5" fill="none"
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
            <circle cx={tooltip.x} cy={tooltip.y} r="3" fill={lineColor}
              stroke="var(--s1)" strokeWidth="1.5" />
          </>
        )}
      </svg>

      {/* Tooltip bubble */}
      {tooltip && (() => {
        const pct  = ((tooltip.p.balance - startBal) / startBal * 100)
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
              {new Date(tooltip.p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <div style={{ fontWeight: 600 }}>€{tooltip.p.balance.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div style={{ color: isUp ? 'var(--gr2)' : 'var(--re)', fontSize: '10px' }}>{pctStr} from start</div>
            {tooltip.p.equity !== tooltip.p.balance && (
              <div style={{ color: 'var(--t3)', fontSize: '10px', marginTop: '2px' }}>
                Equity €{tooltip.p.equity.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
