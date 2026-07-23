'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Panel from '@/components/ui/Panel'
import { MON } from './helpers'

// ── Net Worth Curve ───────────────────────────────────────────────────────────
// Absolute net worth over a calendar year = MT5 account equity (daily snapshots)
// + current portfolio holdings value. Toggle the year at the top; the axis always
// runs January → end of year (→ today for the current year). Same look as the
// Equity Curve. Portfolio has no stored history yet, so today's holdings value is
// a constant baseline (total is accurate; the shape follows the trading account).

interface SnapPoint { date: string; equity: number; ms: number }

const FIRST_YEAR = 2024   // earliest togglable year (buttons show even with no data)

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
  const currentYear = new Date().getUTCFullYear()
  const years = useMemo(() => {
    const out: number[] = []
    for (let y = FIRST_YEAR; y <= currentYear; y++) out.push(y)
    return out
  }, [currentYear])

  const [year, setYear] = useState(currentYear)
  const [raw, setRaw] = useState<{ date: string; equity: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [hover, setHover] = useState<{ x: number; y: number; idx: number } | null>(null)
  const svgRef  = useRef<SVGSVGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ w: 800, h: 260 })

  useEffect(() => {
    let cancelled = false
    setLoading(true); setHover(null)
    fetch(`/api/account/snapshots?year=${year}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setRaw(d.points ?? []) })
      .catch(() => { if (!cancelled) setRaw([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [year])

  const points: SnapPoint[] = useMemo(() =>
    raw.map(p => ({ date: p.date, equity: p.equity, ms: Date.parse(`${p.date}T00:00:00Z`) })),
    [raw]
  )
  const series = useMemo(() => points.map(p => p.equity + portfolioValue), [points, portfolioValue])
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

  const yearButtons = (
    <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
      {years.map(y => (
        <button key={y}
          onClick={() => setYear(y)}
          style={{
            padding: '3px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
            fontSize: '11px', fontWeight: 600,
            background: year === y ? 'var(--ac)' : 'var(--s3)',
            color:      year === y ? 'white'     : 'var(--t3)',
            transition: 'all 0.12s',
          }}
        >
          {y}
        </button>
      ))}
    </div>
  )

  const shell = (body: React.ReactNode) => (
    <Panel title="Net Worth" accent="var(--gr2)" fill className="h-full" action={yearButtons}>
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
      <span style={{ color: 'var(--t3)', fontSize: '13px' }}>No account data for {year}</span>
    </div>)
  }

  const startVal = series[0]
  const endVal   = series[n - 1]
  const change   = endVal - startVal
  const changePct = startVal > 0 ? (change / startVal) * 100 : 0
  const isUp = change >= 0

  let peak = series[0], maxDD = 0
  for (let i = 0; i < n; i++) { if (series[i] > peak) peak = series[i]; const dd = peak - series[i]; if (dd > maxDD) maxDD = dd }

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

  // Calendar-year x-axis: Jan 1 → Dec 31 (→ now for the current year).
  const xStart = Date.UTC(year, 0, 1)
  const xEnd   = year === currentYear ? Date.now() : Date.UTC(year, 11, 31, 23, 59, 59)
  const xSpan  = Math.max(1, xEnd - xStart)
  const xOfMs = (ms: number) => PAD.l + Math.max(0, Math.min(1, (ms - xStart) / xSpan)) * cW
  const yOf   = (v: number) => PAD.t + (1 - (v - lo) / range) * cH

  const lineColor = isUp ? '#00E87A' : '#FF3D50'
  const fillColor = isUp ? '#00CC6A' : '#FF3D50'

  const coords = points.map((p, i) => ({ x: xOfMs(p.ms), y: yOf(series[i]) }))
  const linePath = smoothPath(coords)
  const lastX = coords[n - 1].x, firstX = coords[0].x
  const areaPath = `${linePath} L${lastX.toFixed(1)},${bottom.toFixed(1)} L${firstX.toFixed(1)},${bottom.toFixed(1)} Z`

  // Month gridlines / labels across the year
  const months: { x: number; label: string }[] = []
  for (let m = 0; m < 12; m++) {
    const ms = Date.UTC(year, m, 1)
    if (ms > xEnd) break
    months.push({ x: xOfMs(ms), label: MON[m] })
  }

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg || n < 2) return
    const rect = svg.getBoundingClientRect()
    const vbX = ((e.clientX - rect.left) / rect.width) * W
    let best = 0, bestD = Infinity
    for (let i = 0; i < n; i++) { const d = Math.abs(coords[i].x - vbX); if (d < bestD) { bestD = d; best = i } }
    setHover({ idx: best, x: coords[best].x, y: coords[best].y })
  }

  const activeVal = hover !== null ? series[hover.idx] : endVal
  const aD = new Date((hover !== null ? points[hover.idx] : points[n - 1]).ms)
  const activeDateStr = `${aD.getUTCDate()} ${MON[aD.getUTCMonth()]} ${aD.getUTCFullYear()}`

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
          <p style={{ color: 'var(--t3)', fontSize: '10px', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '3px' }}>{year} change</p>
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
        key={year}
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

        {/* Month gridlines */}
        {months.map((m, i) => (
          <line key={i} x1={m.x} y1={PAD.t} x2={m.x} y2={bottom}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}

        {/* Area fill */}
        <path className="nw-area" d={areaPath} fill="url(#nwFill)" />

        {/* Line */}
        <path className="nw-line" d={linePath} pathLength={1} fill="none" stroke={lineColor}
          strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />

        {/* Final dot */}
        {(hover === null || hover.idx !== n - 1) && (
          <circle cx={lastX} cy={yOf(endVal)} r="4.5" fill={lineColor} stroke="#000" strokeWidth="2" />
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
          const d = new Date(points[hover.idx].ms)
          const dateStr = `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`
          const tipW = 168, tipH = 50
          const isRight = hover.x > W - PAD.r - tipW - 20
          const tx = isRight ? hover.x - tipW - 12 : hover.x + 12
          const ty = Math.max(PAD.t, Math.min(hover.y - tipH / 2, H - PAD.b - tipH))
          return (
            <g>
              <line x1={hover.x} y1={PAD.t} x2={hover.x} y2={bottom}
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

    {/* Month labels across the year */}
    <div style={{ position: 'relative', height: '12px', marginTop: '5px', flex: 'none' }}>
      {months.map((m, i) => (
        <span key={i} style={{ position: 'absolute', left: `${(m.x / W) * 100}%`, transform: 'translateX(-50%)',
          fontSize: '9px', color: 'var(--t3)', fontFamily: 'monospace' }}>
          {m.label}
        </span>
      ))}
    </div>
  </>)
}
