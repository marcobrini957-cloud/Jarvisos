'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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

function PeriodMenu({ value, onChange }: { value: PeriodKey; onChange: (k: PeriodKey) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const current = PERIODS.find(p => p.key === value)?.label ?? ''

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.02em',
          color: open ? 'var(--t1)' : 'var(--t2)',
          background: 'var(--s2)', border: '1px solid var(--bd2)',
          borderRadius: 'var(--radius-md)', padding: '3px 7px', cursor: 'pointer',
          transition: 'color 0.12s, border-color 0.12s',
        }}
      >
        {current}
        <span style={{
          fontSize: '7px', lineHeight: 1, color: 'var(--t3)',
          transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s',
        }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 5px)', right: 0, zIndex: 20,
          background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: 'var(--radius-md)',
          padding: '4px', minWidth: '104px',
          animation: 'fade-in 0.12s ease',
        }}>
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => { onChange(p.key); setOpen(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '5px 8px', borderRadius: 'var(--radius-sm)', border: 'none',
                background: p.key === value ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: p.key === value ? 'var(--t1)' : 'var(--t2)',
                fontSize: 'var(--text-sm)', fontWeight: p.key === value ? 600 : 400, cursor: 'pointer',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
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
      padding: '16px', background: 'rgba(255,255,255,0.025)', borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--bd2)', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
        <span className="label-caps">Win Rate</span>
        {/* A native <select> drops the OS control (and its chevron) into the
            middle of the instrument cluster. This is a menu we draw ourselves. */}
        <PeriodMenu value={period} onChange={setPeriod} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <WinRing wr={wr} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <span className="num" style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--t1)' }}>{wins}W / {losses}L</span>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--t3)' }}>
            {count > 0 ? `${count} trades` : 'No trades in period'}
          </span>
        </div>
      </div>
    </div>
  )
}
