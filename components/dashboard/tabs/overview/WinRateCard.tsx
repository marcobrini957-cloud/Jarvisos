'use client'

import { useMemo, useState } from 'react'
import { BE_THRESHOLD } from '@/hooks/useTrades'
import { WinRing } from './WinRing'

interface TradeLike {
  close_time: string | null
  net_profit: number | null
}

type PeriodKey = 'month' | 'q1' | 'q2' | 'q3' | 'q4' | 'year' | 'all'

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'month', label: 'This Month' },
  { key: 'q1',    label: 'Q1' },
  { key: 'q2',    label: 'Q2' },
  { key: 'q3',    label: 'Q3' },
  { key: 'q4',    label: 'Q4' },
  { key: 'year',  label: 'Year' },
  { key: 'all',   label: 'All Time' },
]

function periodRange(key: PeriodKey): { from: Date; to: Date } | null {
  const y = new Date().getFullYear()
  switch (key) {
    case 'month': {
      const now = new Date()
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 1) }
    }
    case 'q1': return { from: new Date(y, 0, 1), to: new Date(y, 3, 1) }
    case 'q2': return { from: new Date(y, 3, 1), to: new Date(y, 6, 1) }
    case 'q3': return { from: new Date(y, 6, 1), to: new Date(y, 9, 1) }
    case 'q4': return { from: new Date(y, 9, 1), to: new Date(y + 1, 0, 1) }
    case 'year': return { from: new Date(y, 0, 1), to: new Date(y + 1, 0, 1) }
    case 'all': return null
  }
}

// Win-rate metric card with a period switcher (month / quarters / year / all).
export function WinRateCard({ trades }: { trades: TradeLike[] }) {
  const [period, setPeriod] = useState<PeriodKey>('month')

  const { wr, wins, losses, count } = useMemo(() => {
    const range = periodRange(period)
    const inRange = range
      ? trades.filter(t => {
          if (!t.close_time) return false
          const d = new Date(t.close_time)
          return d >= range.from && d < range.to
        })
      : trades
    const wins   = inRange.filter(t => (t.net_profit ?? 0) >  BE_THRESHOLD).length
    const losses = inRange.filter(t => (t.net_profit ?? 0) < -BE_THRESHOLD).length
    const dec = wins + losses
    return { wr: dec > 0 ? (wins / dec) * 100 : 0, wins, losses, count: inRange.length }
  }, [trades, period])

  return (
    <div className="metric-card" style={{
      padding: '16px', background: 'rgba(255,255,255,0.025)', borderRadius: '12px',
      border: '1px solid var(--bd2)', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
        <span style={{ fontSize: '10px', color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Win Rate</span>
        <select
          value={period}
          onChange={e => setPeriod(e.target.value as PeriodKey)}
          style={{
            fontSize: '10px', fontWeight: 600, color: 'var(--t2)',
            background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: '6px',
            padding: '2px 4px', cursor: 'pointer', outline: 'none', maxWidth: '92px',
          }}
        >
          {PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <WinRing wr={wr} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--t1)' }}>{wins}W / {losses}L</span>
          <span style={{ fontSize: '11px', color: 'var(--t3)' }}>
            {count > 0 ? `${count} trades` : 'No trades in period'}
          </span>
        </div>
      </div>
    </div>
  )
}
