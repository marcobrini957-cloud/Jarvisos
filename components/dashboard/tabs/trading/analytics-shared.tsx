'use client'

import { BE_THRESHOLD } from '@/hooks/useTrades'
import type { Trade } from '@/types'

// ── Analytics helpers ─────────────────────────────────────────────────────────

function winRateColor(wr: number) {
  if (wr >= 65) return 'var(--gr2)'
  if (wr >= 50) return 'var(--am2)'
  return 'var(--re)'
}

export function StatRow({ label, trades: rowTrades, avgPnl, highlight }: {
  label: string
  trades: Trade[]
  avgPnl: number
  highlight?: boolean
}) {
  const total     = rowTrades.length
  if (total === 0) return null
  const wins      = rowTrades.filter(t => (t.net_profit ?? 0) >  BE_THRESHOLD).length
  const losses    = rowTrades.filter(t => (t.net_profit ?? 0) < -BE_THRESHOLD).length
  const breakeven = rowTrades.filter(t => Math.abs(t.net_profit ?? 0) <= BE_THRESHOLD).length
  const decisive  = wins + losses
  const wr        = decisive > 0 ? (wins / decisive) * 100 : 0
  return (
    <div className="stat-row-grid" style={{
      display: 'grid', gridTemplateColumns: '1fr 90px 60px 80px',
      alignItems: 'center', gap: '8px',
      padding: '8px 0',
      borderBottom: '1px solid var(--bd)',
      background: highlight ? 'rgba(255,255,255,0.04)' : 'transparent',
    }}>
      <span style={{ color: 'var(--t1)', fontSize: 'var(--text-base)', fontWeight: highlight ? 500 : 400 }}>{label}</span>
      {/* W / BE / L counts */}
      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 'var(--text-xs)', padding: '1px 5px', borderRadius: 'var(--radius-xs)', background: 'rgba(0,196,106,0.15)', color: 'var(--gr2)' }}>{wins}W</span>
        {breakeven > 0 && (
          <span style={{ fontSize: 'var(--text-xs)', padding: '1px 5px', borderRadius: 'var(--radius-xs)', background: 'rgba(255,255,255,0.12)', color: 'var(--color-ink-1)' }}>{breakeven}BE</span>
        )}
        <span style={{ fontSize: 'var(--text-xs)', padding: '1px 5px', borderRadius: 'var(--radius-xs)', background: 'rgba(240,80,75,0.15)', color: 'var(--re)' }}>{losses}L</span>
      </div>
      {/* Win rate bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <div style={{ flex: 1, height: '4px', background: 'var(--s3)', borderRadius: 'var(--radius-xs)' }}>
          <div style={{ width: `${wr}%`, height: '100%', background: winRateColor(wr), borderRadius: 'var(--radius-xs)' }} />
        </div>
        <span className="vq-num" style={{ color: winRateColor(wr), fontSize: 'var(--text-sm)', fontWeight: 600, minWidth: '30px' }}>{wr.toFixed(0)}%</span>
      </div>
      <span className="vq-num" style={{ color: avgPnl >= 0 ? 'var(--gr2)' : 'var(--re)', fontSize: 'var(--text-sm)', textAlign: 'right' }}>
        avg {avgPnl >= 0 ? '+' : ''}€{avgPnl.toFixed(2)}
      </span>
    </div>
  )
}

export function TableHeader() {
  return (
    <div className="stat-table-header" style={{
      display: 'grid', gridTemplateColumns: '1fr 90px 60px 80px',
      gap: '8px', padding: '0 0 6px 0',
      borderBottom: '1px solid var(--bd2)',
    }}>
      {['', 'W / BE / L', 'Win rate', 'Avg P&L'].map((h, i) => (
        <span key={i} style={{ color: 'var(--t3)', fontSize: 'var(--text-xs)', letterSpacing: '0.05em', textAlign: i > 0 ? 'right' : 'left' }}>
          {h}
        </span>
      ))}
    </div>
  )
}
