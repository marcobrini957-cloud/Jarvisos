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
      background: highlight ? 'rgba(88,166,255,0.04)' : 'transparent',
    }}>
      <span style={{ color: 'var(--t1)', fontSize: '12px', fontWeight: highlight ? 500 : 400 }}>{label}</span>
      {/* W / BE / L counts */}
      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', background: 'rgba(99,153,34,0.15)', color: 'var(--gr2)' }}>{wins}W</span>
        {breakeven > 0 && (
          <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', background: 'rgba(88,166,255,0.12)', color: 'var(--ac)' }}>{breakeven}BE</span>
        )}
        <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', background: 'rgba(226,75,74,0.15)', color: 'var(--re)' }}>{losses}L</span>
      </div>
      {/* Win rate bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <div style={{ flex: 1, height: '4px', background: 'var(--s3)', borderRadius: '2px' }}>
          <div style={{ width: `${wr}%`, height: '100%', background: winRateColor(wr), borderRadius: '2px' }} />
        </div>
        <span style={{ color: winRateColor(wr), fontSize: '11px', fontWeight: 600, minWidth: '30px' }}>{wr.toFixed(0)}%</span>
      </div>
      <span style={{ color: avgPnl >= 0 ? 'var(--gr2)' : 'var(--re)', fontSize: '11px', textAlign: 'right' }}>
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
        <span key={i} style={{ color: 'var(--t3)', fontSize: '10px', letterSpacing: '0.05em', textAlign: i > 0 ? 'right' : 'left' }}>
          {h}
        </span>
      ))}
    </div>
  )
}
