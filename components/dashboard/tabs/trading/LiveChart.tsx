'use client'

import { useMemo, useState } from 'react'
import type { Trade } from '@/types'
import { AdvancedChart } from '@/components/widgets/TradingViewWidget'

// Live Chart — the real, real-time price chart, straight from TradingView's
// data (no MT5 relay in the middle). Follows the instrument you're viewing and
// gives MT5-style timeframe buttons (M1 → H4); the TradingView toolbar stays on
// top too for drawing tools and any other interval.

// Map a broker symbol (XAUUSD, BTCUSD, NAS100, EURUSD…) to a TradingView symbol.
function tvSymbol(s: string): string {
  const u = s.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const map: Record<string, string> = {
    XAUUSD: 'OANDA:XAUUSD', XAGUSD: 'OANDA:XAGUSD',
    BTCUSD: 'BINANCE:BTCUSDT', ETHUSD: 'BINANCE:ETHUSDT', SOLUSD: 'BINANCE:SOLUSDT',
    NAS100: 'OANDA:NAS100USD', US100: 'OANDA:NAS100USD', USTEC: 'OANDA:NAS100USD', USTECH100: 'OANDA:NAS100USD',
    US30: 'OANDA:US30USD', DJI30: 'OANDA:US30USD',
    SPX500: 'OANDA:SPX500USD', US500: 'OANDA:SPX500USD',
    GER40: 'OANDA:DE30EUR', DE40: 'OANDA:DE30EUR', GER30: 'OANDA:DE30EUR',
    UK100: 'OANDA:UK100GBP', JP225: 'OANDA:JP225USD',
    USOIL: 'TVC:USOIL', WTI: 'TVC:USOIL', UKOIL: 'TVC:UKOIL',
  }
  if (map[u]) return map[u]
  if (/^[A-Z]{6}$/.test(u)) return `OANDA:${u}`   // forex pairs → OANDA
  return u                                          // let TradingView resolve it
}

const TIMEFRAMES: { label: string; interval: string }[] = [
  { label: 'M1', interval: '1' },
  { label: 'M5', interval: '5' },
  { label: 'M15', interval: '15' },
  { label: 'H1', interval: '60' },
  { label: 'H4', interval: '240' },
]

const pillBtn = (active: boolean) => ({
  padding: '4px 11px', borderRadius: '6px', border: 'none', cursor: 'pointer',
  fontSize: '11px', fontWeight: 600,
  background: active ? 'var(--ac)' : 'var(--s3)', color: active ? '#fff' : 'var(--t3)',
  transition: 'all 0.12s',
} as const)

export function LiveChart({ trades, openPositions }: { trades: Trade[]; openPositions: Trade[] }) {
  const symbols = useMemo(() => {
    const set = new Set<string>()
    for (const t of [...openPositions, ...trades]) if (t.symbol && t.symbol !== 'BALANCE') set.add(t.symbol)
    return [...set]
  }, [trades, openPositions])

  const [symbol, setSymbol] = useState(symbols[0] ?? 'XAUUSD')
  const [tf, setTf] = useState('5')   // interval in minutes; M5 default — active but readable

  const sym = symbols.includes(symbol) ? symbol : (symbols[0] ?? 'XAUUSD')

  return (
    <div>
      {/* Instrument + timeframe controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
        flexWrap: 'wrap', padding: '10px 14px', borderBottom: '1px solid var(--bd)' }}>
        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
          {symbols.map(s => (
            <button key={s} onClick={() => setSymbol(s)} style={pillBtn(sym === s)}>{s}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '3px' }}>
          {TIMEFRAMES.map(t => (
            <button key={t.interval} onClick={() => setTf(t.interval)} style={pillBtn(tf === t.interval)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* The chart. key forces a clean reload when symbol/interval changes. */}
      <div className="tv-chart-wrap">
        <AdvancedChart key={`${sym}-${tf}`} symbol={tvSymbol(sym)} interval={tf} height="100%" />
      </div>
    </div>
  )
}
