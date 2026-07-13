'use client'

import { useState, useEffect } from 'react'

// ── Market Strip ─────────────────────────────────────────────────────────────

interface StripItem { symbol: string; label: string; price: number; change1d: number; currency: string; marketState: string }

export function MarketStrip() {
  const [items, setItems] = useState<StripItem[]>([])
  const [ts,    setTs]    = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/market/strip', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) {
          setItems(data.items ?? [])
          setTs(new Date().toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' }))
        }
      } catch { /* silent */ }
    }
    load()
    const t = setInterval(load, 5 * 60 * 1000) // refresh every 5 min
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  if (items.length === 0) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0',
      background: 'var(--s1)', border: '1px solid var(--bd)',
      borderRadius: '10px', overflow: 'hidden', height: '36px',
    }}>
      {items.map((item, i) => {
        const up    = item.change1d >= 0
        const color = item.label === 'VIX'
          ? (item.change1d > 0 ? 'var(--re)' : 'var(--gr2)') // VIX up = bad
          : (up ? 'var(--gr2)' : 'var(--re)')
        const fmtPrice = item.label === 'VIX'
          ? item.price.toFixed(2)
          : item.price >= 1000
            ? item.price.toLocaleString('en-US', { maximumFractionDigits: 0 })
            : item.price.toFixed(2)
        return (
          <div key={item.symbol} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '0 16px', height: '100%',
            borderRight: i < items.length - 1 ? '1px solid var(--bd)' : 'none',
            flexShrink: 0,
          }}>
            <span style={{ color: 'var(--t3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em' }}>{item.label}</span>
            <span style={{ color: 'var(--t1)', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.01em' }}>{fmtPrice}</span>
            <span style={{ color, fontSize: '11px', fontWeight: 600 }}>{up ? '+' : ''}{item.change1d.toFixed(2)}%</span>
            {item.marketState === 'REGULAR' && (
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--gr2)', boxShadow: '0 0 5px rgba(0,232,122,0.6)', display: 'inline-block', flexShrink: 0, animation: 'pulse-dot 2s ease-in-out infinite' }} />
            )}
          </div>
        )
      })}
      {ts && (
        <div style={{ marginLeft: 'auto', padding: '0 12px', borderLeft: '1px solid var(--bd)', height: '100%', display: 'flex', alignItems: 'center' }}>
          <span style={{ color: 'var(--t3)', fontSize: '10px' }}>↻ {ts}</span>
        </div>
      )}
    </div>
  )
}
