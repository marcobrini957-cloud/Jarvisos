'use client'

import { useEffect, useState } from 'react'

// Premium market ticker — a thin, always-scrolling terminal strip under the nav.
// Bloomberg/crypto energy: monospace symbols, green/red deltas, continuous motion.
// Live prices from /api/market/strip?set=landing (Yahoo, 5-min server cache);
// the static row below renders instantly and is the fallback if the fetch fails.

type Row = { s: string; p: string; d: string; up: boolean }

const FALLBACK: Row[] = [
  { s: 'XAUUSD',  p: '2,384.10', d: '+0.62%', up: true },
  { s: 'NAS100',  p: '20,114.5', d: '+1.24%', up: true },
  { s: 'EURUSD',  p: '1.0872',   d: '-0.11%', up: false },
  { s: 'GBPUSD',  p: '1.3204',   d: '+0.28%', up: true },
  { s: 'US30',    p: '41,988',   d: '-0.34%', up: false },
  { s: 'BTCUSD',  p: '67,420',   d: '+2.01%', up: true },
  { s: 'USDJPY',  p: '156.42',   d: '+0.19%', up: true },
  { s: 'SPX500',  p: '5,634.2',  d: '+0.47%', up: true },
  { s: 'GER40',   p: '18,720',   d: '-0.22%', up: false },
  { s: 'XAGUSD',  p: '31.08',    d: '+1.63%', up: true },
]

function fmtPrice(p: number): string {
  if (p < 10)    return p.toFixed(4)   // FX majors
  if (p < 1000)  return p.toFixed(2)   // JPY pairs, silver
  return p.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

export function TickerStrip() {
  const [rows, setRows] = useState<Row[]>(FALLBACK)

  useEffect(() => {
    const ctrl = new AbortController()
    fetch('/api/market/strip?set=landing', { signal: ctrl.signal })
      .then(r => r.json())
      .then((d: { items?: Array<{ label: string; price: number; change1d: number }> }) => {
        if (!d.items || d.items.length < 6) return // partial feed — keep fallback
        setRows(d.items.map(i => ({
          s:  i.label,
          p:  fmtPrice(i.price),
          d:  `${i.change1d >= 0 ? '+' : '-'}${Math.abs(i.change1d).toFixed(2)}%`,
          up: i.change1d >= 0,
        })))
      })
      .catch(() => {})
    return () => ctrl.abort()
  }, [])

  const row = [...rows, ...rows] // duplicate for seamless loop
  return (
    <div
      aria-hidden
      style={{
        position: 'relative', zIndex: 3, width: '100%', overflow: 'hidden',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(6,8,12,0.6)', backdropFilter: 'blur(8px)',
        height: 34, display: 'flex', alignItems: 'center',
        maskImage: 'linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)',
      }}
    >
      <div style={{ display: 'flex', whiteSpace: 'nowrap', animation: 'vqTicker 40s linear infinite', willChange: 'transform' }}>
        {row.map((t, i) => (
          <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 22px', fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 11.5 }}>
            <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, letterSpacing: 0.3 }}>{t.s}</span>
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>{t.p}</span>
            <span style={{ color: t.up ? '#00FF85' : '#F87171', fontWeight: 600 }}>
              {t.up ? '▲' : '▼'} {t.d.replace('-', '').replace('+', '')}
            </span>
          </div>
        ))}
      </div>
      <style>{`@keyframes vqTicker { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  )
}
