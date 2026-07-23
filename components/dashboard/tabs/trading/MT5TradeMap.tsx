'use client'

import { useMemo, useState } from 'react'
import type { Trade } from '@/types'
import { MON } from './helpers'
import { useCandles } from '@/hooks/useCandles'

// ── MT5 Trade Map ─────────────────────────────────────────────────────────────
// A price × time map built entirely from the user's real MT5 fills — no external
// price feed. Each closed trade is drawn from entry → exit (coloured by win/loss)
// with SL/TP context, live positions overlaid, hover details and click-to-view
// the EA screenshot. This is the "only VELQUOR can show this" chart.

type MapPeriod = 'today' | 'week' | 'all'

// TradingView's signature candle palette — the "very nice" teal-green / coral-red.
const TV_UP = '#26a69a'
const TV_DOWN = '#ef5350'

const screenshotOf = (t: Trade) => t.screenshot_close_url || t.screenshot_open_url || t.screenshot_user_url || null

function periodStart(p: MapPeriod): number {
  const now = new Date()
  if (p === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  if (p === 'week') {
    const dow = now.getDay()
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
    return d.getTime()
  }
  return 0
}

export function MT5TradeMap({
  trades, openPositions, onViewScreenshot,
}: {
  trades: Trade[]
  openPositions: Trade[]
  onViewScreenshot: (url: string) => void
}) {
  // Instruments the user actually trades.
  const symbols = useMemo(() => {
    const set = new Set<string>()
    for (const t of [...trades, ...openPositions]) if (t.symbol && t.symbol !== 'BALANCE') set.add(t.symbol)
    return [...set]
  }, [trades, openPositions])

  const [symbol, setSymbol] = useState(symbols[0] ?? '')
  const [period, setPeriod] = useState<MapPeriod>('today')
  const [hover,  setHover]  = useState<{ t: Trade; x: number; y: number } | null>(null)

  const sym = symbols.includes(symbol) ? symbol : (symbols[0] ?? '')
  const since = periodStart(period)

  // Real broker candles streamed from the EA (empty until that pipeline is live).
  const tf = period === 'all' ? 'H1' : 'M15'
  const { candles: rawCandles } = useCandles(sym, tf)
  const candles = useMemo(() => rawCandles.filter(c => c.time * 1000 >= since), [rawCandles, since])

  const closed = useMemo(() =>
    trades
      .filter(t => t.symbol === sym && t.open_price && t.close_price && t.open_time && t.close_time)
      .filter(t => new Date(t.close_time!).getTime() >= since)
      .sort((a, b) => new Date(a.open_time!).getTime() - new Date(b.open_time!).getTime()),
    [trades, sym, since]
  )
  const open = useMemo(() =>
    openPositions.filter(t => t.symbol === sym && t.open_price && t.open_time),
    [openPositions, sym]
  )

  // Period stats
  const realized = closed.reduce((s, t) => s + (t.net_profit ?? 0), 0)
  const wins     = closed.filter(t => (t.net_profit ?? 0) >= 0).length
  const losses   = closed.length - wins
  const floating = open.reduce((s, t) => s + (t.net_profit ?? 0), 0)

  // ── Geometry ──────────────────────────────────────────────────────────────
  const W = 800, H = 300
  // Price scale on the RIGHT, like TradingView.
  const PAD = { t: 14, r: 56, b: 24, l: 10 }
  const cW = W - PAD.l - PAD.r
  const cH = H - PAD.t - PAD.b

  const nowMs = Date.now()
  const prices: number[] = []
  const timesArr: number[] = []
  for (const t of closed) {
    prices.push(t.open_price!, t.close_price!)
    if (t.stop_loss) prices.push(t.stop_loss)
    if (t.take_profit) prices.push(t.take_profit)
    timesArr.push(new Date(t.open_time!).getTime(), new Date(t.close_time!).getTime())
  }
  for (const t of open) {
    prices.push(t.open_price!)
    timesArr.push(new Date(t.open_time!).getTime(), nowMs)
  }
  for (const c of candles) {
    prices.push(c.high, c.low)
    timesArr.push(c.time * 1000)
  }

  const hasData = prices.length > 0
  const pMinRaw = hasData ? Math.min(...prices) : 0
  const pMaxRaw = hasData ? Math.max(...prices) : 1
  const pPad    = (pMaxRaw - pMinRaw) * 0.08 || 1
  const pMin = pMinRaw - pPad, pMax = pMaxRaw + pPad
  const tMin = hasData ? Math.min(...timesArr) : since
  const tMaxRaw = hasData ? Math.max(...timesArr) : nowMs
  const tMax = tMaxRaw === tMin ? tMin + 3_600_000 : tMaxRaw

  const xOf = (ms: number) => PAD.l + ((ms - tMin) / (tMax - tMin)) * cW
  const yOf = (p: number)  => PAD.t + (1 - (p - pMin) / (pMax - pMin)) * cH

  const fmtPrice = (p: number) => p >= 1000 ? p.toFixed(1) : p.toFixed(2)
  const fmtClock = (ms: number) => {
    const d = new Date(ms)
    return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
  }

  const pillBtn = (active: boolean) => ({
    padding: '4px 11px', borderRadius: '6px', border: 'none', cursor: 'pointer',
    fontSize: '11px', fontWeight: 600,
    background: active ? 'var(--ac)' : 'var(--s3)', color: active ? '#fff' : 'var(--t3)',
    transition: 'all 0.12s',
  } as const)

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
        flexWrap: 'wrap', padding: '10px 14px', borderBottom: '1px solid var(--bd)' }}>
        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
          {symbols.map(s => (
            <button key={s} onClick={() => setSymbol(s)} style={pillBtn(sym === s)}>{s}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '3px' }}>
          {(['today', 'week', 'all'] as MapPeriod[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={pillBtn(period === p)}>
              {p === 'today' ? 'Today' : p === 'week' ? 'Week' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats header */}
      <div style={{ display: 'flex', gap: '22px', flexWrap: 'wrap', padding: '12px 14px 6px' }}>
        <div>
          <p style={{ color: 'var(--t3)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Realized</p>
          <p style={{ color: realized >= 0 ? 'var(--gr2)' : 'var(--re)', fontSize: '18px', fontWeight: 700 }}>
            {realized >= 0 ? '+' : '-'}€{Math.abs(realized).toFixed(2)}
          </p>
        </div>
        <div>
          <p style={{ color: 'var(--t3)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Trades</p>
          <p style={{ color: 'var(--t1)', fontSize: '18px', fontWeight: 700 }}>{closed.length} <span style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 500 }}>{wins}W · {losses}L</span></p>
        </div>
        {open.length > 0 && (
          <div>
            <p style={{ color: 'var(--t3)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Open · floating</p>
            <p style={{ color: floating >= 0 ? 'var(--gr2)' : 'var(--re)', fontSize: '18px', fontWeight: 700 }}>
              {open.length} · {floating >= 0 ? '+' : '-'}€{Math.abs(floating).toFixed(2)}
            </p>
          </div>
        )}
      </div>

      {/* Map */}
      {!hasData ? (
        <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--t3)', fontSize: '13px' }}>
            No {sym || 'trades'} {period === 'today' ? 'today' : period === 'week' ? 'this week' : 'yet'}.
          </p>
        </div>
      ) : (
        <div style={{ position: 'relative', padding: '4px 6px 0' }}>
          <style>{`@keyframes vqLivePulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
          {candles.length > 1 && (
            <div style={{ position: 'absolute', top: '10px', right: '14px', zIndex: 2, display: 'flex', alignItems: 'center',
              gap: '5px', padding: '3px 8px', borderRadius: '6px',
              background: 'rgba(38,166,154,0.12)', border: '1px solid rgba(38,166,154,0.32)' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: TV_UP,
                boxShadow: `0 0 6px ${TV_UP}`, animation: 'vqLivePulse 1.4s ease-in-out infinite' }} />
              <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.09em', color: '#5ad6ca' }}>LIVE</span>
            </div>
          )}
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}
            onMouseLeave={() => setHover(null)}>
            {/* Vertical gridlines (TradingView-style) */}
            {[0.25, 0.5, 0.75].map(f => {
              const x = PAD.l + f * cW
              return <line key={`v${f}`} x1={x} y1={PAD.t} x2={x} y2={H - PAD.b} stroke="rgba(255,255,255,0.035)" strokeWidth="1" />
            })}
            {/* Horizontal grid + right-side price scale */}
            {[0, 0.25, 0.5, 0.75, 1].map(f => {
              const p = pMax - f * (pMax - pMin)
              const y = PAD.t + f * cH
              return (
                <g key={f}>
                  <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="rgba(255,255,255,0.045)" strokeWidth="1" />
                  <text x={W - PAD.r + 5} y={y + 3} textAnchor="start" fontSize="9" fill="rgba(120,140,170,0.7)" fontFamily="monospace">{fmtPrice(p)}</text>
                </g>
              )
            })}

            {/* Time axis */}
            {[0, 0.5, 1].map(f => {
              const ms = tMin + f * (tMax - tMin)
              const x = PAD.l + f * cW
              return (
                <text key={f} x={x} y={H - PAD.b + 15} textAnchor={f === 0 ? 'start' : f === 1 ? 'end' : 'middle'}
                  fontSize="9" fill="var(--t3)" fontFamily="monospace">{fmtClock(ms)}</text>
              )
            })}

            {/* Real MT5 candles — TradingView-style, only when the EA is streaming them */}
            {candles.length > 1 && (() => {
              const cwd = Math.min(9, Math.max(1.5, (cW / candles.length) * 0.72))
              return candles.map(c => {
                const x  = xOf(c.time * 1000)
                const up = c.close >= c.open
                const col = up ? TV_UP : TV_DOWN
                const yO = yOf(c.open), yC = yOf(c.close)
                const bodyY = Math.min(yO, yC)
                const bodyH = Math.max(1, Math.abs(yO - yC))
                return (
                  <g key={`c-${c.time}`} opacity="0.92">
                    <line x1={x} y1={yOf(c.high)} x2={x} y2={yOf(c.low)} stroke={col} strokeWidth="1" />
                    <rect x={x - cwd / 2} y={bodyY} width={cwd} height={bodyH} fill={col} rx="0.5" />
                  </g>
                )
              })
            })()}

            {/* Live last-price line + right-axis tag + pulsing dot (TradingView signature) */}
            {candles.length > 1 && (() => {
              const last = candles[candles.length - 1]
              const up = last.close >= last.open
              const col = up ? TV_UP : TV_DOWN
              const y = yOf(last.close)
              const x = xOf(last.time * 1000)
              const tagW = PAD.r - 2, tagH = 15
              return (
                <g pointerEvents="none">
                  <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke={col} strokeWidth="1" strokeDasharray="4,3" opacity="0.55" />
                  <rect x={W - PAD.r} y={y - tagH / 2} width={tagW} height={tagH} rx="2.5" fill={col} />
                  <text x={W - PAD.r + tagW / 2} y={y + 3.5} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#fff" fontFamily="monospace">{fmtPrice(last.close)}</text>
                  <circle cx={x} cy={y} r="7" fill={col} opacity="0.22">
                    <animate attributeName="r" values="4;9;4" dur="1.6s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.3;0;0.3" dur="1.6s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={x} cy={y} r="2.6" fill={col} stroke="#000" strokeWidth="0.75" />
                </g>
              )
            })()}

            {/* Open positions — dashed entry level + pulsing dot */}
            {open.map(t => {
              const x = xOf(new Date(t.open_time!).getTime())
              const y = yOf(t.open_price!)
              const up = (t.net_profit ?? 0) >= 0
              return (
                <g key={`o-${t.id}`}>
                  <line x1={x} y1={y} x2={W - PAD.r} y2={y} stroke="var(--am2)" strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
                  <circle cx={x} cy={y} r="9" fill="var(--am2)" opacity="0.15">
                    <animate attributeName="r" values="6;11;6" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={x} cy={y} r="4.5" fill="var(--am2)" stroke="#000" strokeWidth="1.5" />
                  <text x={W - PAD.r - 5} y={y - 5} textAnchor="end" fontSize="9" fontFamily="monospace" fill="var(--am2)">
                    OPEN {up ? '+' : '-'}€{Math.abs(t.net_profit ?? 0).toFixed(0)}
                  </text>
                </g>
              )
            })}

            {/* Closed trades — entry → exit segments */}
            {closed.map(t => {
              const x1 = xOf(new Date(t.open_time!).getTime())
              const y1 = yOf(t.open_price!)
              const x2 = xOf(new Date(t.close_time!).getTime())
              const y2 = yOf(t.close_price!)
              const win = (t.net_profit ?? 0) >= 0
              const col = win ? '#00E87A' : '#FF3D50'
              const isBuy = t.trade_type === 'buy'
              const shot = screenshotOf(t)
              return (
                <g key={t.id}
                  style={{ cursor: shot ? 'pointer' : 'default' }}
                  onMouseEnter={() => setHover({ t, x: x2, y: y2 })}
                  onClick={() => { if (shot) onViewScreenshot(shot) }}
                >
                  {/* SL / TP context ticks at entry */}
                  {t.stop_loss   && <line x1={x1 - 5} y1={yOf(t.stop_loss)}   x2={x1 + 5} y2={yOf(t.stop_loss)}   stroke="#FF3D50" strokeWidth="1" opacity="0.5" />}
                  {t.take_profit && <line x1={x1 - 5} y1={yOf(t.take_profit)} x2={x1 + 5} y2={yOf(t.take_profit)} stroke="#00E87A" strokeWidth="1" opacity="0.5" />}
                  {/* entry → exit */}
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth="1.5" opacity="0.55" />
                  {/* entry marker (direction) */}
                  <path
                    d={isBuy
                      ? `M${x1},${y1 - 6} L${x1 - 4.5},${y1 + 3} L${x1 + 4.5},${y1 + 3} Z`
                      : `M${x1},${y1 + 6} L${x1 - 4.5},${y1 - 3} L${x1 + 4.5},${y1 - 3} Z`}
                    fill={isBuy ? '#4D8FFF' : '#F0A840'} stroke="#000" strokeWidth="0.75"
                  />
                  {/* exit dot */}
                  <circle cx={x2} cy={y2} r="4" fill={col} stroke="#000" strokeWidth="1.25" />
                  {shot && <circle cx={x2} cy={y2} r="7.5" fill="none" stroke={col} strokeWidth="0.75" opacity="0.4" />}
                </g>
              )
            })}

            {/* Hover tooltip */}
            {hover && (() => {
              const t = hover.t
              const win = (t.net_profit ?? 0) >= 0
              const col = win ? '#00E87A' : '#FF3D50'
              const shot = screenshotOf(t)
              const tipW = 176, tipH = shot ? 82 : 66
              const isRight = hover.x > W - PAD.r - tipW - 16
              const tx = isRight ? hover.x - tipW - 12 : hover.x + 12
              const ty = Math.max(PAD.t, Math.min(hover.y - tipH / 2, H - PAD.b - tipH))
              const mins = t.duration_minutes ?? Math.round((new Date(t.close_time!).getTime() - new Date(t.open_time!).getTime()) / 60000)
              return (
                <g pointerEvents="none">
                  <line x1={hover.x} y1={PAD.t} x2={hover.x} y2={H - PAD.b} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                  <rect x={tx} y={ty} width={tipW} height={tipH} rx="7" fill="#0c0c0c" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
                  <text x={tx + 11} y={ty + 17} fontSize="11" fontWeight="700" fill="#fff" fontFamily="monospace">
                    {t.symbol} {t.trade_type.toUpperCase()} · {t.lot_size ?? '—'} lot
                  </text>
                  <text x={tx + 11} y={ty + 33} fontSize="10" fill="rgba(140,160,190,0.85)" fontFamily="monospace">
                    {fmtPrice(t.open_price!)} → {fmtPrice(t.close_price!)}
                  </text>
                  <text x={tx + 11} y={ty + 49} fontSize="13" fontWeight="700" fill={col} fontFamily="monospace">
                    {win ? '+' : '-'}€{Math.abs(t.net_profit ?? 0).toFixed(2)} · {mins}m
                  </text>
                  {shot && (
                    <text x={tx + 11} y={ty + 68} fontSize="9" fill="var(--ac)" fontFamily="monospace">
                      ▸ click to view chart screenshot
                    </text>
                  )}
                </g>
              )
            })()}
          </svg>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', padding: '4px 14px 8px', fontSize: '10px', color: 'var(--t3)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ color: '#4D8FFF', fontSize: '12px' }}>▲</span> Buy entry</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ color: '#F0A840', fontSize: '12px' }}>▼</span> Sell entry</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ color: '#00E87A' }}>●</span> Exit win</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ color: '#FF3D50' }}>●</span> Exit loss</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ color: 'var(--am2)' }}>◉</span> Live position</span>
        <span style={{ marginLeft: 'auto', color: 'var(--t3)' }}>
          {candles.length > 1 ? `Live ${tf} candles from your MT5 · click a trade for its chart` : 'Your real MT5 fills · click a trade for its chart'}
        </span>
      </div>

      {/* Screenshot strip — the setups behind these trades */}
      {(() => {
        const withShots = closed.filter(t => screenshotOf(t)).slice(-8).reverse()
        if (withShots.length === 0) return null
        return (
          <div style={{ padding: '4px 14px 14px' }}>
            <p style={{ color: 'var(--t3)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Setups</p>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {withShots.map(t => {
                const win = (t.net_profit ?? 0) >= 0
                return (
                  <button key={t.id} onClick={() => onViewScreenshot(screenshotOf(t)!)}
                    style={{ flexShrink: 0, width: '96px', border: `1px solid ${win ? 'rgba(0,232,122,0.4)' : 'rgba(255,61,80,0.4)'}`,
                      borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', background: 'var(--s2)', padding: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={screenshotOf(t)!} alt={`${t.symbol} setup`} style={{ width: '100%', height: '54px', objectFit: 'cover', display: 'block' }} />
                    <div style={{ padding: '3px 5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '9px', color: 'var(--t3)' }}>{t.trade_type.toUpperCase()}</span>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: win ? 'var(--gr2)' : 'var(--re)' }}>{win ? '+' : '-'}€{Math.abs(t.net_profit ?? 0).toFixed(0)}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
