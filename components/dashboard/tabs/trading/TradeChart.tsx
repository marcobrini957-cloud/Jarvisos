'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createChart, ColorType,
  type IChartApi, type ISeriesApi, type UTCTimestamp,
  type SeriesMarker, type Time, type CandlestickData,
} from 'lightweight-charts'
import type { Trade } from '@/types'

// ── Trade Chart ───────────────────────────────────────────────────────────────
// Candlestick chart (free Yahoo OHLC via /api/market/candles) with the user's
// real entries + exits plotted as markers. Replaces the read-only TradingView
// embed with something that actually reflects *their* trading.

type Candle = { time: number; open: number; high: number; low: number; close: number }

const INTERVALS: { key: string; label: string; range: string }[] = [
  { key: '15m', label: '15m', range: '1mo' },
  { key: '60m', label: '1H',  range: '3mo' },
  { key: '1d',  label: '1D',  range: '1y'  },
]

// Normalise a symbol to a coarse instrument key so 'XAUUSD.r' matches 'XAUUSD'.
function baseKey(sym: string | null | undefined): string {
  const s = (sym ?? '').toUpperCase()
  if (s.includes('XAU') || s.includes('GOLD')) return 'XAU'
  if (s.includes('XAG') || s.includes('SILVER')) return 'XAG'
  if (s.includes('NAS') || s.includes('US100') || s.includes('NDX') || s.includes('USTEC')) return 'NAS'
  if (s.includes('US30') || s.includes('DJI') || s.includes('DOW')) return 'US30'
  if (s.includes('SPX') || s.includes('US500') || s.includes('SP500')) return 'SPX'
  if (s.includes('GER') || s.includes('DAX') || s.includes('DE40')) return 'DAX'
  if (s.includes('BTC')) return 'BTC'
  return s.replace(/[^A-Z0-9]/g, '')
}

const PRETTY: Record<string, string> = {
  XAU: 'XAUUSD', XAG: 'XAGUSD', NAS: 'NAS100', US30: 'US30', SPX: 'SPX500', DAX: 'GER40', BTC: 'BTCUSD',
}

function buildMarkers(trades: Trade[], symKey: string, candles: Candle[]): SeriesMarker<Time>[] {
  if (candles.length === 0) return []
  const lo = candles[0].time
  const hi = candles[candles.length - 1].time
  const times = candles.map(c => c.time)
  const snap = (t: number): number => {
    let best = times[0], bd = Infinity
    for (const ct of times) { const d = Math.abs(ct - t); if (d < bd) { bd = d; best = ct } }
    return best
  }

  const markers: SeriesMarker<Time>[] = []
  for (const t of trades) {
    if (baseKey(t.symbol) !== symKey) continue
    if (!t.open_time || !t.close_time) continue
    const oT = Math.floor(new Date(t.open_time).getTime() / 1000)
    const cT = Math.floor(new Date(t.close_time).getTime() / 1000)
    if (cT < lo || oT > hi) continue

    const isBuy = t.trade_type === 'buy'
    const win   = (t.net_profit ?? 0) >= 0

    markers.push({
      time: snap(Math.max(lo, Math.min(hi, oT))) as UTCTimestamp,
      position: isBuy ? 'belowBar' : 'aboveBar',
      color: isBuy ? '#4D8FFF' : '#F0A840',
      shape: isBuy ? 'arrowUp' : 'arrowDown',
      text: isBuy ? 'BUY' : 'SELL',
    })
    markers.push({
      time: snap(Math.max(lo, Math.min(hi, cT))) as UTCTimestamp,
      position: win ? 'aboveBar' : 'belowBar',
      color: win ? '#00E87A' : '#FF3D50',
      shape: 'circle',
      text: `${win ? '+' : '-'}€${Math.abs(t.net_profit ?? 0).toFixed(0)}`,
    })
  }
  markers.sort((a, b) => (a.time as number) - (b.time as number))
  return markers
}

export function TradeChart({ trades }: { trades: Trade[] }) {
  // Instruments the user actually trades (fallback to gold).
  const symbolKeys = useMemo(() => {
    const set = new Set<string>()
    for (const t of trades) if (t.symbol && t.symbol !== 'BALANCE') set.add(baseKey(t.symbol))
    return set.size ? [...set] : ['XAU']
  }, [trades])

  const [symKey, setSymKey]     = useState(symbolKeys[0])
  const [interval, setInterval] = useState('60m')
  const [candles, setCandles]   = useState<Candle[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const boxRef    = useRef<HTMLDivElement>(null)
  const chartRef  = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)

  // Keep the selected symbol valid as trades load in.
  useEffect(() => { if (!symbolKeys.includes(symKey)) setSymKey(symbolKeys[0]) }, [symbolKeys, symKey])

  // Create the chart once.
  useEffect(() => {
    if (!boxRef.current) return
    const chart = createChart(boxRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(140,160,190,0.75)',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.035)' },
        horzLines: { color: 'rgba(255,255,255,0.035)' },
      },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)' },
      timeScale: { borderColor: 'rgba(255,255,255,0.08)', timeVisible: true, secondsVisible: false },
      crosshair: { mode: 1 },
      autoSize: true,
    })
    const series = chart.addCandlestickSeries({
      upColor: '#00E87A', downColor: '#FF3D50',
      wickUpColor: '#00E87A', wickDownColor: '#FF3D50',
      borderVisible: false,
    })
    chartRef.current = chart
    seriesRef.current = series
    return () => { chart.remove(); chartRef.current = null; seriesRef.current = null }
  }, [])

  // Fetch candles when symbol/interval changes.
  useEffect(() => {
    const cfg = INTERVALS.find(i => i.key === interval) ?? INTERVALS[1]
    const sym = PRETTY[symKey] ?? symKey
    let cancelled = false
    setLoading(true); setError(null)
    fetch(`/api/market/candles?symbol=${encodeURIComponent(sym)}&interval=${interval}&range=${cfg.range}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        if (d.error || !Array.isArray(d.candles) || d.candles.length === 0) {
          setCandles([]); setError('No price data available for this instrument.')
        } else {
          setCandles(d.candles)
        }
      })
      .catch(() => { if (!cancelled) setError('Failed to load price data.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [symKey, interval])

  // Push data + markers whenever they change.
  useEffect(() => {
    const series = seriesRef.current
    if (!series || candles.length === 0) return
    series.setData(candles as CandlestickData<Time>[])
    series.setMarkers(buildMarkers(trades, symKey, candles))
    chartRef.current?.timeScale().fitContent()
  }, [candles, trades, symKey])

  const tradeCount = useMemo(
    () => trades.filter(t => baseKey(t.symbol) === symKey && t.close_time).length,
    [trades, symKey],
  )

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
        flexWrap: 'wrap', padding: '10px 14px', borderBottom: '1px solid var(--bd)' }}>
        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
          {symbolKeys.map(k => (
            <button key={k} onClick={() => setSymKey(k)}
              style={{
                padding: '4px 11px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                fontSize: '11px', fontWeight: 600,
                background: symKey === k ? 'var(--ac)' : 'var(--s3)',
                color: symKey === k ? '#fff' : 'var(--t3)', transition: 'all 0.12s',
              }}>
              {PRETTY[k] ?? k}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '3px' }}>
          {INTERVALS.map(i => (
            <button key={i.key} onClick={() => setInterval(i.key)}
              style={{
                padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                fontSize: '11px', fontWeight: 600,
                background: interval === i.key ? 'var(--ac)' : 'var(--s3)',
                color: interval === i.key ? '#fff' : 'var(--t3)', transition: 'all 0.12s',
              }}>
              {i.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', padding: '8px 14px 6px',
        fontSize: '10px', color: 'var(--t3)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ color: '#4D8FFF', fontSize: '13px' }}>▲</span> Buy entry</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ color: '#F0A840', fontSize: '13px' }}>▼</span> Sell entry</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ color: '#00E87A' }}>●</span> Exit (win)</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ color: '#FF3D50' }}>●</span> Exit (loss)</span>
        <span style={{ marginLeft: 'auto' }}>{tradeCount} trade{tradeCount !== 1 ? 's' : ''} on {PRETTY[symKey] ?? symKey}</span>
      </div>

      {/* Chart */}
      <div style={{ position: 'relative' }}>
        <div ref={boxRef} style={{ height: '420px', width: '100%' }} />
        {(loading || error) && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', pointerEvents: 'none' }}>
            <p style={{ color: 'var(--t3)', fontSize: '13px' }}>
              {error ?? 'Loading price data…'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
