'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Panel from '@/components/ui/Panel'
import type { Trade } from '@/types'
import { MON } from './helpers'

// ── Equity Curve ──────────────────────────────────────────────────────────────

type EqPeriod = 'all' | '1M' | '1W' | '1D'

// Catmull-Rom → cubic-bezier smoothing for a clean, flowing equity line.
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

export function EquityCurve({ trades }: { trades: Trade[] }) {
  const [period, setPeriod] = useState<EqPeriod>('all')
  const [hover,  setHover]  = useState<{ idx: number; x: number; y: number } | null>(null)
  const svgRef  = useRef<SVGSVGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Measure the chart area so the SVG fills the box with round dots / crisp text
  // (viewBox in real pixels → uniform 1:1 scale, no distortion).
  const [dims, setDims] = useState({ w: 800, h: 260 })

  // Full sorted history
  const chrono = useMemo(() =>
    trades
      .filter(t => t.net_profit !== null && t.symbol !== 'BALANCE')
      .sort((a, b) => (a.close_time ?? '').localeCompare(b.close_time ?? '')),
    [trades]
  )

  // Filter by selected period — calendar-aligned, not rolling windows
  const filtered = useMemo(() => {
    if (period === 'all') return chrono
    const now = new Date()
    let since: Date

    if (period === '1D') {
      since = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    } else if (period === '1W') {
      const dow = now.getDay()
      since = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      since.setDate(since.getDate() - (dow === 0 ? 6 : dow - 1))
    } else {
      since = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    }

    return chrono.filter(t => t.close_time && new Date(t.close_time) >= since)
  }, [chrono, period])

  // Build sampled equity series (trade-by-trade, downsampled for "all" with many trades)
  const sampled = useMemo((): { v: number; date: string }[] => {
    if (filtered.length === 0) return []
    const step = Math.max(1, Math.ceil(filtered.length / 400))
    const out: { v: number; date: string }[] = []
    let running = 0
    for (let i = 0; i < filtered.length; i++) {
      running += filtered[i].net_profit ?? 0
      if (i % step === 0 || i === filtered.length - 1)
        out.push({ v: running, date: filtered[i].close_time ?? '' })
    }
    return out
  }, [filtered])

  const equity   = sampled.map(s => s.v)
  const n        = equity.length
  const hasChart = n >= 1

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => setDims({ w: Math.max(320, el.clientWidth), h: Math.max(180, el.clientHeight) })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [hasChart])

  if (chrono.length < 1) return null

  const finalVal = n > 0 ? equity[n - 1] : 0

  // Peak + max drawdown
  let peak = 0, maxDD = 0, peakIdx = 0
  for (let i = 0; i < n; i++) {
    if (equity[i] > peak) { peak = equity[i]; peakIdx = i }
    const dd = peak - equity[i]
    if (dd > maxDD) maxDD = dd
  }

  const minVal  = Math.min(0, ...equity)
  const maxVal  = Math.max(0, ...equity)
  const range   = (maxVal - minVal) || 1

  // SVG geometry — in real pixels so nothing distorts when the box is tall
  const W = dims.w, H = dims.h
  const PAD = { t: 18, r: 18, b: 24, l: 52 }
  const cW  = W - PAD.l - PAD.r
  const cH  = H - PAD.t - PAD.b

  const xOf   = (i: number) => PAD.l + (n > 1 ? i / (n - 1) : 0.5) * cW
  const yOf   = (v: number) => PAD.t + (1 - (v - minVal) / range) * cH
  const zeroY = yOf(0)

  const lineColor = finalVal >= 0 ? '#00E87A' : '#FF3D50'
  const fillColor = finalVal >= 0 ? '#00CC6A' : '#FF3D50'

  const points  = equity.map((v, i) => ({ x: xOf(i), y: yOf(v) }))
  const linePath = n === 0 ? '' : n === 1
    ? `M${PAD.l},${yOf(equity[0]).toFixed(1)} L${(W - PAD.r)},${yOf(equity[0]).toFixed(1)}`
    : smoothPath(points)
  const areaPath = n === 0 ? '' : n === 1
    ? `M${PAD.l},${yOf(equity[0]).toFixed(1)} L${(W - PAD.r)},${yOf(equity[0]).toFixed(1)} L${(W - PAD.r)},${zeroY.toFixed(1)} L${PAD.l},${zeroY.toFixed(1)} Z`
    : `${linePath} L${xOf(n-1).toFixed(1)},${zeroY.toFixed(1)} L${xOf(0).toFixed(1)},${zeroY.toFixed(1)} Z`

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg || n < 2) return
    const rect = svg.getBoundingClientRect()
    const vbX  = ((e.clientX - rect.left) / rect.width) * W
    const frac = Math.max(0, Math.min(1, (vbX - PAD.l) / cW))
    const idx  = Math.round(frac * (n - 1))
    setHover({ idx, x: xOf(idx), y: yOf(equity[idx]) })
  }

  const activeVal  = hover !== null ? sampled[hover.idx].v  : finalVal
  const activeDate = hover !== null ? sampled[hover.idx].date : null
  const activeD    = activeDate ? new Date(activeDate) : null
  const activeDateStr = activeD
    ? `${activeD.getUTCDate()} ${MON[activeD.getUTCMonth()]} ${activeD.getUTCFullYear()}`
    : ({ all: 'All-time', '1M': 'This month', '1W': 'This week', '1D': 'Today' } as const)[period]

  const periodLabel = ({ all: '', '1M': 'this month', '1W': 'this week', '1D': 'today' } as const)[period]

  return (
    <Panel
      title="Equity Curve"
      accent="var(--ac)"
      fill
      className="h-full"
      action={
        <div style={{ display: 'flex', gap: '3px' }}>
          {(['1D', '1W', '1M', 'all'] as EqPeriod[]).map(p => (
            <button key={p}
              onClick={() => { setPeriod(p); setHover(null) }}
              style={{
                padding: '3px 10px', borderRadius: '6px', border: 'none',
                cursor: 'pointer', fontSize: '11px', fontWeight: 600,
                background: period === p ? 'var(--ac)' : 'var(--s3)',
                color:      period === p ? 'white'     : 'var(--t3)',
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => { if (period !== p) e.currentTarget.style.color = 'var(--t2)' }}
              onMouseLeave={e => { if (period !== p) e.currentTarget.style.color = 'var(--t3)' }}
            >
              {p === 'all' ? 'All' : p}
            </button>
          ))}
        </div>
      }
    >
      <style>{`
        @keyframes eqDraw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        @keyframes eqFade { from { opacity: 0; } to { opacity: 1; } }
        .eq-line { stroke-dasharray: 1; animation: eqDraw 1s cubic-bezier(0.4,0,0.2,1) both; }
        .eq-area { animation: eqFade 1.1s ease-out both; }
      `}</style>

      {/* Stats header — reacts live to hover (fixed, sits on top) */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: '10px', minHeight: '44px', flex: 'none' }}>
        <div>
          <p style={{ color: 'var(--t3)', fontSize: '10px', letterSpacing: '0.05em',
            textTransform: 'uppercase', marginBottom: '4px' }}>
            {activeDateStr}
          </p>
          <p style={{
            color: activeVal >= 0 ? 'var(--gr2)' : 'var(--re)',
            fontSize: '28px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1,
            transition: 'color 0.1s',
          }}>
            {activeVal >= 0 ? '+' : '-'}€{Math.abs(activeVal).toFixed(2)}
          </p>
        </div>

        {n > 0 && (
          <div style={{ display: 'flex', gap: '20px', paddingBottom: '2px' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'var(--t3)', fontSize: '10px', letterSpacing: '0.05em',
                textTransform: 'uppercase', marginBottom: '3px' }}>Peak</p>
              <p style={{ color: 'var(--am2)', fontSize: '14px', fontWeight: 600 }}>
                +€{Math.max(0, ...equity).toFixed(2)}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'var(--t3)', fontSize: '10px', letterSpacing: '0.05em',
                textTransform: 'uppercase', marginBottom: '3px' }}>Max DD</p>
              <p style={{ color: maxDD > 0.01 ? 'var(--re)' : 'var(--t3)', fontSize: '14px', fontWeight: 600 }}>
                {maxDD > 0.01 ? `-€${maxDD.toFixed(2)}` : '€0.00'}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'var(--t3)', fontSize: '10px', letterSpacing: '0.05em',
                textTransform: 'uppercase', marginBottom: '3px' }}>Trades</p>
              <p style={{ color: 'var(--t2)', fontSize: '14px', fontWeight: 600 }}>{filtered.length}</p>
            </div>
          </div>
        )}
      </div>

      {/* Empty state for filtered period — fills the box */}
      {n === 0 && (
        <div style={{
          flex: 1, minHeight: '160px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--s2)', borderRadius: '10px', border: '1px dashed var(--bd2)',
        }}>
          <p style={{ color: 'var(--t3)', fontSize: '13px' }}>No closed trades {periodLabel}</p>
        </div>
      )}

      {/* SVG chart — fills remaining height */}
      {n >= 1 && (
        <div ref={wrapRef} style={{ flex: 1, minHeight: '160px', position: 'relative' }}>
          <svg
            key={period}
            ref={svgRef}
            width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, cursor: 'crosshair' }}
            onMouseMove={onMouseMove}
            onMouseLeave={() => setHover(null)}
          >
            <defs>
              <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={fillColor} stopOpacity="0.26" />
                <stop offset="100%" stopColor={fillColor} stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Grid */}
            {[0.25, 0.5, 0.75].map(v => (
              <line key={v}
                x1={PAD.l} y1={PAD.t + v * cH} x2={W - PAD.r} y2={PAD.t + v * cH}
                stroke="rgba(255,255,255,0.04)" strokeWidth="1" vectorEffect="non-scaling-stroke"
              />
            ))}

            {/* Zero baseline */}
            <line x1={PAD.l} y1={zeroY} x2={W - PAD.r} y2={zeroY}
              stroke="rgba(255,255,255,0.10)" strokeWidth="1" vectorEffect="non-scaling-stroke" />

            {/* Area fill */}
            <path className="eq-area" d={areaPath} fill="url(#eqFill)" />

            {/* Peak reference (shown only when currently in drawdown) */}
            {maxDD > 0.01 && finalVal < peak && (
              <line
                x1={xOf(peakIdx)} y1={yOf(peak)} x2={xOf(n-1)} y2={yOf(peak)}
                stroke="#E09020" strokeWidth="1" strokeDasharray="4,3" opacity="0.4"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {/* Equity line */}
            <path className="eq-line" d={linePath} pathLength={1} fill="none" stroke={lineColor}
              strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round"
              vectorEffect="non-scaling-stroke" />

            {/* Peak dot */}
            {peakIdx > 0 && peakIdx < n - 1 && (
              <circle cx={xOf(peakIdx)} cy={yOf(peak)} r="3.5"
                fill="#E09020" stroke="#000000" strokeWidth="1.5" />
            )}

            {/* Final dot (hidden when hovering over last point) */}
            {(hover === null || hover.idx !== n - 1) && (
              <circle cx={xOf(n-1)} cy={yOf(finalVal)} r="4.5"
                fill={lineColor} stroke="#000000" strokeWidth="2" />
            )}

            {/* Y-axis labels */}
            {[maxVal, 0, minVal].filter((v, i, a) => a.indexOf(v) === i).map((v, i) => (
              <text key={i} x={PAD.l - 8} y={yOf(v) + 4}
                textAnchor="end" fontSize="10" fill="rgba(104,129,168,0.55)" fontFamily="monospace">
                {v >= 0 ? `+${v.toFixed(0)}` : v.toFixed(0)}
              </text>
            ))}

            {/* ── Hover crosshair ───────────────────────────────────────────── */}
            {hover !== null && (() => {
              const val  = sampled[hover.idx].v
              const date = sampled[hover.idx].date
              const d    = date ? new Date(date) : null
              const dateStr = d
                ? `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`
                : ''
              const valStr   = `${val >= 0 ? '+' : '-'}€${Math.abs(val).toFixed(2)}`
              const hColor   = val >= 0 ? '#00E87A' : '#FF3D50'
              const tipW     = 148
              const tipH     = 50
              const isRight  = hover.x > W - PAD.r - tipW - 20
              const tx = isRight ? hover.x - tipW - 12 : hover.x + 12
              const ty = Math.max(PAD.t, Math.min(hover.y - tipH / 2, H - PAD.b - tipH))

              return (
                <g>
                  <line x1={hover.x} y1={PAD.t} x2={hover.x} y2={H - PAD.b}
                    stroke="rgba(255,255,255,0.1)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                  <line x1={PAD.l} y1={hover.y} x2={W - PAD.r} y2={hover.y}
                    stroke="rgba(255,255,255,0.05)" strokeWidth="1" vectorEffect="non-scaling-stroke" />

                  <rect x={2} y={hover.y - 9} width={PAD.l - 6} height={18} rx="4" fill="#4D8FFF" />
                  <text x={PAD.l - 9} y={hover.y + 4} textAnchor="end"
                    fontSize="9" fill="white" fontWeight="700" fontFamily="monospace">
                    {val >= 0 ? '+' : ''}{val.toFixed(0)}
                  </text>

                  <circle cx={hover.x} cy={hover.y} r="10" fill={hColor} opacity="0.1" />
                  <circle cx={hover.x} cy={hover.y} r="5"  fill={hColor} stroke="#000000" strokeWidth="2" />

                  <rect x={tx} y={ty} width={tipW} height={tipH}
                    rx="7" fill="#111111" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                  <text x={tx + 11} y={ty + 17} fontSize="10"
                    fill="rgba(104,129,168,0.8)" fontFamily="monospace">
                    {dateStr}
                  </text>
                  <text x={tx + 11} y={ty + 38} fontSize="16" fontWeight="700"
                    fill={hColor} fontFamily="monospace">
                    {valStr}
                  </text>
                </g>
              )
            })()}
          </svg>
        </div>
      )}

      {/* X-axis date labels */}
      {n >= 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', flex: 'none',
          paddingLeft: `${PAD.l}px`, paddingRight: `${PAD.r}px` }}>
          {[0, Math.floor((n - 1) / 2), n - 1].map(i => {
            const d = sampled[i]?.date ? new Date(sampled[i].date) : null
            return (
              <span key={i} style={{ fontSize: '9px', color: 'var(--t3)', fontFamily: 'monospace' }}>
                {d ? `${d.getUTCDate()} ${MON[d.getUTCMonth()]}` : ''}
              </span>
            )
          })}
        </div>
      )}
    </Panel>
  )
}
