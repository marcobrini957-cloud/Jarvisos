'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Panel from '@/components/ui/Panel'
import { MON } from './helpers'

// ── Net Worth Curve ───────────────────────────────────────────────────────────
// Absolute net worth over time = MT5 account balance (daily snapshots) + current
// portfolio holdings value. Same look as the Equity Curve; different data — this
// tracks total money, not trading P&L. Portfolio has no stored history yet, so
// today's holdings value is used as a constant baseline (the shape follows the
// trading account; the total is your net worth).

type NwPeriod = { label: string; days: number }
const PERIODS: NwPeriod[] = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '1Y', days: 365 },
]

interface SnapPoint { date: string; balance: number }

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return ''
  if (pts.length < 3) return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }
  return d
}

const eur2 = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const eur0 = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 0 })

export function NetWorthCurve({ portfolioValue = 0 }: { portfolioValue?: number }) {
  const [periodDays, setPeriodDays] = useState(30)
  const [points, setPoints] = useState<SnapPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [hover, setHover] = useState<{ idx: number; x: number; y: number } | null>(null)
  const svgRef  = useRef<SVGSVGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ w: 800, h: 260 })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/account/snapshots?days=${periodDays}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setPoints((d.points ?? []).map((p: { date: string; balance: number }) => ({ date: p.date, balance: p.balance }))) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [periodDays])

  // Net worth series (absolute) = daily MT5 balance + current portfolio value
  const series = useMemo(() => points.map(p => p.balance + portfolioValue), [points, portfolioValue])
  const n = series.length

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => setDims({ w: Math.max(320, el.clientWidth), h: Math.max(180, el.clientHeight) })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [n])

  const periodButtons = (
    <div style={{ display: 'flex', gap: '3px' }}>
      {PERIODS.map(p => (
        <button key={p.label}
          onClick={() => { setPeriodDays(p.days); setHover(null) }}
          style={{
            padding: '3px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
            fontSize: '11px', fontWeight: 600,
            background: periodDays === p.days ? 'var(--ac)' : 'var(--s3)',
            color:      periodDays === p.days ? 'white'     : 'var(--t3)',
            transition: 'all 0.12s',
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  )

  const shell = (body: React.ReactNode) => (
    <Panel title="Net Worth" accent="var(--gr2)" fill className="h-full" action={periodButtons}>
      {body}
    </Panel>
  )

  if (loading && n === 0) {
    return shell(<div style={{ flex: 1, minHeight: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'var(--t3)', fontSize: '12px' }}>Loading…</span>
    </div>)
  }
  if (n < 2) {
    return shell(<div style={{ flex: 1, minHeight: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--s2)', borderRadius: '10px', border: '1px dashed var(--bd2)' }}>
      <span style={{ color: 'var(--t3)', fontSize: '13px' }}>Net worth appears once your account syncs</span>
    </div>)
  }

  const startVal = series[0]
  const endVal   = series[n - 1]
  const change   = endVal - startVal
  const changePct = startVal > 0 ? (change / startVal) * 100 : 0
  const isUp = change >= 0

  // Peak + max drawdown (absolute)
  let peak = series[0], maxDD = 0, peakIdx = 0
  for (let i = 0; i < n; i++) {
    if (series[i] > peak) { peak = series[i]; peakIdx = i }
    const dd = peak - series[i]
    if (dd > maxDD) maxDD = dd
  }

  const minVal = Math.min(...series)
  const maxVal = Math.max(...series)
  const pad = (maxVal - minVal) * 0.15 || 50
  const lo = minVal - pad, hi = maxVal + pad
  const range = (hi - lo) || 1

  const W = dims.w, H = dims.h
  const PAD = { t: 18, r: 18, b: 24, l: 58 }
  const cW = W - PAD.l - PAD.r
  const cH = H - PAD.t - PAD.b
  const bottom = PAD.t + cH

  const xOf = (i: number) => PAD.l + (n > 1 ? i / (n - 1) : 0.5) * cW
  const yOf = (v: number) => PAD.t + (1 - (v - lo) / range) * cH

  const lineColor = isUp ? '#00E87A' : '#FF3D50'
  const fillColor = isUp ? '#00CC6A' : '#FF3D50'

  const coords = series.map((v, i) => ({ x: xOf(i), y: yOf(v) }))
  const linePath = smoothPath(coords)
  const areaPath = `${linePath} L${xOf(n - 1).toFixed(1)},${bottom.toFixed(1)} L${xOf(0).toFixed(1)},${bottom.toFixed(1)} Z`

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg || n < 2) return
    const rect = svg.getBoundingClientRect()
    const vbX = ((e.clientX - rect.left) / rect.width) * W
    const frac = Math.max(0, Math.min(1, (vbX - PAD.l) / cW))
    const idx = Math.round(frac * (n - 1))
    setHover({ idx, x: xOf(idx), y: yOf(series[idx]) })
  }

  const activeVal = hover !== null ? series[hover.idx] : endVal
  const activeDate = hover !== null ? points[hover.idx].date : points[n - 1].date
  const aD = activeDate ? new Date(activeDate) : null
  const activeDateStr = aD ? `${aD.getUTCDate()} ${MON[aD.getUTCMonth()]} ${aD.getUTCFullYear()}` : ''

  const yTicks = [maxVal, (maxVal + minVal) / 2, minVal]

  return shell(<>
    <style>{`
      @keyframes nwDraw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
      @keyframes nwFade { from { opacity: 0; } to { opacity: 1; } }
      .nw-line { stroke-dasharray: 1; animation: nwDraw 1s cubic-bezier(0.4,0,0.2,1) both; }
      .nw-area { animation: nwFade 1.1s ease-out both; }
    `}</style>

    {/* Stats header */}
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      marginBottom: '10px', minHeight: '44px', flex: 'none' }}>
      <div>
        <p style={{ color: 'var(--t3)', fontSize: '10px', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '4px' }}>
          {activeDateStr}
        </p>
        <p style={{ color: 'var(--t1)', fontSize: '28px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
          €{eur2(activeVal)}
        </p>
      </div>
      <div style={{ display: 'flex', gap: '20px', paddingBottom: '2px' }}>
        <div style={{ textAlign: 'right' }}>
          <p style={{ color: 'var(--t3)', fontSize: '10px', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '3px' }}>Change</p>
          <p style={{ color: isUp ? 'var(--gr2)' : 'var(--re)', fontSize: '14px', fontWeight: 600 }}>
            {isUp ? '+' : '−'}€{eur0(Math.abs(change))} ({changePct >= 0 ? '+' : ''}{changePct.toFixed(1)}%)
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ color: 'var(--t3)', fontSize: '10px', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '3px' }}>Max DD</p>
          <p style={{ color: maxDD > 0.01 ? 'var(--re)' : 'var(--t3)', fontSize: '14px', fontWeight: 600 }}>
            {maxDD > 0.01 ? `−€${eur0(maxDD)}` : '€0'}
          </p>
        </div>
        {portfolioValue > 0 && (
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: 'var(--t3)', fontSize: '10px', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '3px' }}>Portfolio</p>
            <p style={{ color: 'var(--t2)', fontSize: '14px', fontWeight: 600 }}>€{eur0(portfolioValue)}</p>
          </div>
        )}
      </div>
    </div>

    {/* SVG chart */}
    <div ref={wrapRef} style={{ flex: 1, minHeight: '160px', position: 'relative' }}>
      <svg
        key={periodDays}
        ref={svgRef}
        width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, cursor: 'crosshair' }}
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={fillColor} stopOpacity="0.26" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {[0.25, 0.5, 0.75].map(v => (
          <line key={v} x1={PAD.l} y1={PAD.t + v * cH} x2={W - PAD.r} y2={PAD.t + v * cH}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}

        {/* Area fill */}
        <path className="nw-area" d={areaPath} fill="url(#nwFill)" />

        {/* Line */}
        <path className="nw-line" d={linePath} pathLength={1} fill="none" stroke={lineColor}
          strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />

        {/* Final dot */}
        {(hover === null || hover.idx !== n - 1) && (
          <circle cx={xOf(n - 1)} cy={yOf(endVal)} r="4.5" fill={lineColor} stroke="#000" strokeWidth="2" />
        )}

        {/* Y-axis labels (absolute €) */}
        {yTicks.map((v, i) => (
          <text key={i} x={PAD.l - 8} y={yOf(v) + 4} textAnchor="end" fontSize="10"
            fill="rgba(104,129,168,0.55)" fontFamily="monospace">
            €{eur0(v)}
          </text>
        ))}

        {/* Hover crosshair + tooltip */}
        {hover !== null && (() => {
          const val = series[hover.idx]
          const d = points[hover.idx].date ? new Date(points[hover.idx].date) : null
          const dateStr = d ? `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}` : ''
          const tipW = 168, tipH = 50
          const isRight = hover.x > W - PAD.r - tipW - 20
          const tx = isRight ? hover.x - tipW - 12 : hover.x + 12
          const ty = Math.max(PAD.t, Math.min(hover.y - tipH / 2, H - PAD.b - tipH))
          return (
            <g>
              <line x1={hover.x} y1={PAD.t} x2={hover.x} y2={H - PAD.b}
                stroke="rgba(255,255,255,0.1)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <circle cx={hover.x} cy={hover.y} r="10" fill={lineColor} opacity="0.1" />
              <circle cx={hover.x} cy={hover.y} r="5" fill={lineColor} stroke="#000" strokeWidth="2" />
              <rect x={tx} y={ty} width={tipW} height={tipH} rx="7" fill="#111" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <text x={tx + 11} y={ty + 17} fontSize="10" fill="rgba(104,129,168,0.8)" fontFamily="monospace">{dateStr}</text>
              <text x={tx + 11} y={ty + 38} fontSize="16" fontWeight="700" fill="var(--t1)" fontFamily="monospace">€{eur2(val)}</text>
            </g>
          )
        })()}
      </svg>
    </div>

    {/* X-axis date labels */}
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', flex: 'none',
      paddingLeft: `${PAD.l}px`, paddingRight: `${PAD.r}px` }}>
      {[0, Math.floor((n - 1) / 2), n - 1].map(i => {
        const d = points[i]?.date ? new Date(points[i].date) : null
        return (
          <span key={i} style={{ fontSize: '9px', color: 'var(--t3)', fontFamily: 'monospace' }}>
            {d ? `${d.getUTCDate()} ${MON[d.getUTCMonth()]}` : ''}
          </span>
        )
      })}
    </div>
  </>)
}
