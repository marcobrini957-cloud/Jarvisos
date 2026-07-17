'use client'

import { useState, useEffect } from 'react'

// Watchlist rows for the Overview "Markets" panel — real quotes from our own
// market API (5-min server cache), replacing the TradingView MarketOverview
// iframe that rendered mostly empty.

interface StripItem { symbol: string; label: string; price: number; change1d: number; currency: string; marketState: string }

export function MarketsCard() {
  const [items, setItems] = useState<StripItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/market/strip?set=landing', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setItems(data.items ?? [])
      } catch { /* silent */ } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const t = setInterval(load, 5 * 60 * 1000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--t3)', fontSize: '12px' }}>Loading…</div>
  }
  if (items.length === 0) {
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--t3)', fontSize: '12px' }}>Market data unavailable</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {items.map((item, i) => {
        const up = item.change1d >= 0
        const color = up ? 'var(--gr2)' : 'var(--re)'
        const fmtPrice = item.price >= 1000
          ? item.price.toLocaleString('en-US', { maximumFractionDigits: 1 })
          : item.price.toFixed(item.price >= 10 ? 2 : 4)
        return (
          <div key={item.symbol} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '9px 16px',
            borderBottom: i < items.length - 1 ? '1px solid var(--bd)' : 'none',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <span style={{ color: 'var(--t1)', fontSize: '12.5px', fontWeight: 600 }}>{item.label}</span>
              {item.marketState === 'REGULAR' && (
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--gr2)', boxShadow: '0 0 5px rgba(0,232,122,0.6)', flexShrink: 0 }} />
              )}
            </span>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexShrink: 0 }}>
              <span style={{ color: 'var(--t2)', fontSize: '12.5px', fontVariantNumeric: 'tabular-nums' }}>{fmtPrice}</span>
              <span style={{
                color, fontSize: '11.5px', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                minWidth: '58px', textAlign: 'right',
              }}>
                {up ? '+' : ''}{item.change1d.toFixed(2)}%
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
