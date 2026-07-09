'use client'

import { useEffect, useState } from 'react'

interface Bar { date: string; pnl: number; wins: number; losses: number }

interface Props {
  days?:   number
  height?: number
}

export default function DailyPnLChart({ days = 30, height = 120 }: Props) {
  const [bars,    setBars]    = useState<Bar[]>([])
  const [loading, setLoading] = useState(true)
  const [hovered, setHovered] = useState<Bar | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/trades/daily-pnl?days=${days}`)
      .then(r => r.json())
      .then(d => setBars(d.bars ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [days])

  if (loading) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--t3)', fontSize: '12px' }}>Loading…</span>
      </div>
    )
  }

  if (bars.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontSize: '22px', opacity: 0.3 }}>📊</span>
        <span style={{ color: 'var(--t3)', fontSize: '12px' }}>No closed trades yet</span>
      </div>
    )
  }

  const maxAbs = Math.max(...bars.map(b => Math.abs(b.pnl)), 0.01)
  const midY   = height / 2

  // Fill sparse days — last N trading days actually in data
  const displayBars = bars.slice(-days)

  const barW    = 100 / displayBars.length
  const GAP     = 0.4  // % gap between bars

  // Running cumulative P&L for the cumulative line
  const cumPnl: number[] = []
  let running = 0
  for (const b of displayBars) { running += b.pnl; cumPnl.push(running) }

  const cumMax = Math.max(...cumPnl)
  const cumMin = Math.min(...cumPnl)
  const cumRange = (cumMax - cumMin) || 1

  const SVG_W = 1000
  const SVG_H = height
  const linePoints = cumPnl.map((v, i) => {
    const x = ((i + 0.5) / displayBars.length) * SVG_W
    const y = SVG_H - 4 - ((v - cumMin) / cumRange) * (SVG_H - 8)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  return (
    <div style={{ position: 'relative' }}>
      {/* Bars */}
      <div style={{ display: 'flex', alignItems: 'center', height, gap: '1px', position: 'relative' }}>
        {/* Zero line */}
        <div style={{
          position: 'absolute', left: 0, right: 0,
          top: '50%', height: '1px',
          background: 'var(--bd)', zIndex: 0,
        }} />

        {displayBars.map((b, i) => {
          const frac  = Math.abs(b.pnl) / maxAbs
          const barH  = frac * (midY - 4)
          const isPos = b.pnl >= 0
          const color = isPos ? 'var(--gr2)' : 'var(--re)'
          const label = new Date(b.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

          return (
            <div
              key={b.date}
              style={{ flex: 1, position: 'relative', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={() => setHovered(b)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Bar */}
              <div style={{
                position: 'absolute',
                width: '80%',
                height: `${barH}px`,
                background: hovered?.date === b.date ? color : `${color}99`,
                borderRadius: isPos ? '2px 2px 0 0' : '0 0 2px 2px',
                [isPos ? 'bottom' : 'top']: '50%',
                transition: 'background 0.1s',
              }} />
            </div>
          )
        })}
      </div>

      {/* Tooltip */}
      {hovered && (
        <div style={{
          position: 'absolute',
          top: 0, left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          background: 'var(--s2)',
          border: '1px solid var(--bd2)',
          borderRadius: '8px',
          padding: '7px 12px',
          fontSize: '11px',
          color: 'var(--t1)',
          whiteSpace: 'nowrap',
          zIndex: 10,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>
          <div style={{ color: 'var(--t3)', fontSize: '10px', marginBottom: '3px' }}>
            {new Date(hovered.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
          </div>
          <div style={{ fontWeight: 600, color: hovered.pnl >= 0 ? 'var(--gr2)' : 'var(--re)' }}>
            {hovered.pnl >= 0 ? '+' : ''}€{hovered.pnl.toFixed(2)}
          </div>
          <div style={{ color: 'var(--t3)', fontSize: '10px', marginTop: '2px' }}>
            {hovered.wins}W · {hovered.losses}L
          </div>
        </div>
      )}
    </div>
  )
}
