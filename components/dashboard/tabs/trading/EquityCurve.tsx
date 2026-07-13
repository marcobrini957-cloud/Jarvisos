'use client'

import { useState, useMemo, useRef } from 'react'
import Panel from '@/components/ui/Panel'
import type { Trade } from '@/types'
import { MON } from './helpers'

// ── Equity Curve ──────────────────────────────────────────────────────────────

type EqPeriod = 'all' | '1M' | '1W' | '1D'

export function EquityCurve({ trades }: { trades: Trade[] }) {
  const [period, setPeriod] = useState<EqPeriod>('all')
  const [hover,  setHover]  = useState<{ idx: number; x: number; y: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

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
      // Current trading day: midnight local time (Vienna) today
      since = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    } else if (period === '1W') {
      // Current trading week: Monday 00:00 → Friday (Mon–Fri aligned)
      const dow = now.getDay() // 0 = Sun … 6 = Sat
      since = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      since.setDate(since.getDate() - (dow === 0 ? 6 : dow - 1))
    } else {
      // Current month: 1st of this month 00:00
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

  if (chrono.length < 1) return null

  const equity  = sampled.map(s => s.v)
  const n       = equity.length
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

  // SVG geometry
  const W = 800, H = 220
  const PAD = { t: 24, r: 24, b: 32, l: 56 }
  const cW  = W - PAD.l - PAD.r
  const cH  = H - PAD.t - PAD.b

  const xOf   = (i: number) => PAD.l + (n > 1 ? i / (n - 1) : 0.5) * cW
  const yOf   = (v: number) => PAD.t + (1 - (v - minVal) / range) * cH
  const zeroY = yOf(0)

  const lineColor = finalVal >= 0 ? '#00E87A' : '#FF3D50'
  const fillColor = finalVal >= 0 ? '#00CC6A' : '#FF3D50'

  // n=1: draw a full-width horizontal reference line so a partial day always shows
  const linePath = n === 0 ? '' : n === 1
    ? `M${PAD.l},${yOf(equity[0]).toFixed(1)} L${(W - PAD.r)},${yOf(equity[0]).toFixed(1)}`
    : equity.map((v, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ')
  const areaPath = n === 0 ? '' : n === 1
    ? `M${PAD.l},${yOf(equity[0]).toFixed(1)} L${(W - PAD.r)},${yOf(equity[0]).toFixed(1)} L${(W - PAD.r)},${zeroY.toFixed(1)} L${PAD.l},${zeroY.toFixed(1)} Z`
    : `${linePath} L${xOf(n-1).toFixed(1)},${zeroY.toFixed(1)} L${xOf(0).toFixed(1)},${zeroY.toFixed(1)} Z`

  // Mouse interaction — maps screen coords → viewBox coords
  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg || n < 2) return  // hover only meaningful with 2+ points
    const rect = svg.getBoundingClientRect()
    const vbX  = ((e.clientX - rect.left) / rect.width) * W
    const frac = Math.max(0, Math.min(1, (vbX - PAD.l) / cW))
    const idx  = Math.round(frac * (n - 1))
    setHover({ idx, x: xOf(idx), y: yOf(equity[idx]) })
  }

  // Header: when hovering show that point's value; otherwise show period total
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
      {/* Stats header — reacts live to hover */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: '12px', minHeight: '44px' }}>
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

      {/* Empty state for filtered period */}
      {n === 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', height: '160px',
          background: 'var(--s2)', borderRadius: '10px', border: '1px dashed var(--bd2)',
        }}>
          <p style={{ color: 'var(--t3)', fontSize: '13px' }}>No closed trades {periodLabel}</p>
        </div>
      )}

      {/* SVG chart */}
      {n >= 1 && (
        <svg
          ref={svgRef}
          width="100%" viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{ display: 'block', overflow: 'visible', cursor: 'crosshair' }}
          onMouseMove={onMouseMove}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={fillColor} stopOpacity="0.22" />
              <stop offset="100%" stopColor={fillColor} stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Grid */}
          {[0.25, 0.5, 0.75].map(v => (
            <line key={v}
              x1={PAD.l} y1={PAD.t + v * cH} x2={W - PAD.r} y2={PAD.t + v * cH}
              stroke="rgba(255,255,255,0.04)" strokeWidth="1"
            />
          ))}

          {/* Zero baseline */}
          <line x1={PAD.l} y1={zeroY} x2={W - PAD.r} y2={zeroY}
            stroke="rgba(255,255,255,0.10)" strokeWidth="1" />

          {/* Area fill */}
          <path d={areaPath} fill="url(#eqFill)" />

          {/* Peak reference (shown only when currently in drawdown) */}
          {maxDD > 0.01 && finalVal < peak && (
            <line
              x1={xOf(peakIdx)} y1={yOf(peak)} x2={xOf(n-1)} y2={yOf(peak)}
              stroke="#E09020" strokeWidth="1" strokeDasharray="4,3" opacity="0.4"
            />
          )}

          {/* Equity line */}
          <path d={linePath} fill="none" stroke={lineColor}
            strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

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
                {/* Vertical line */}
                <line x1={hover.x} y1={PAD.t} x2={hover.x} y2={H - PAD.b}
                  stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                {/* Horizontal line */}
                <line x1={PAD.l} y1={hover.y} x2={W - PAD.r} y2={hover.y}
                  stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

                {/* Y-axis pill label */}
                <rect x={2} y={hover.y - 9} width={PAD.l - 6} height={18} rx="4" fill="#4D8FFF" />
                <text x={PAD.l - 9} y={hover.y + 4} textAnchor="end"
                  fontSize="9" fill="white" fontWeight="700" fontFamily="monospace">
                  {val >= 0 ? '+' : ''}{val.toFixed(0)}
                </text>

                {/* Ripple + dot */}
                <circle cx={hover.x} cy={hover.y} r="10" fill={hColor} opacity="0.1" />
                <circle cx={hover.x} cy={hover.y} r="5"  fill={hColor} stroke="#000000" strokeWidth="2" />

                {/* Tooltip card */}
                <rect x={tx} y={ty} width={tipW} height={tipH}
                  rx="7" fill="#111111" stroke="rgba(255,255,255,0.15)" strokeWidth="1"
                />
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
      )}

      {/* X-axis date labels */}
      {n >= 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px',
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
