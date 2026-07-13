'use client'

import { useState, useMemo } from 'react'
import { BE_THRESHOLD } from '@/hooks/useTrades'
import type { Trade } from '@/types'

// ── Trade Calendar ────────────────────────────────────────────────────────────

export function DayDetailPanel({ dateStr, trades, onClose }: {
  dateStr: string
  trades: Trade[]
  onClose: () => void
}) {
  const totalPnl = trades.reduce((s, t) => s + (t.net_profit ?? 0), 0)
  const wins     = trades.filter(t => (t.net_profit ?? 0) > BE_THRESHOLD).length
  const losses   = trades.filter(t => (t.net_profit ?? 0) < -BE_THRESHOLD).length
  const label    = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{
      marginTop: '16px',
      padding: '16px',
      background: 'var(--s1)',
      border: `1px solid ${totalPnl >= 0 ? 'rgba(0,232,122,0.2)' : 'rgba(255,61,80,0.2)'}`,
      borderRadius: '12px',
      animation: 'fadeIn 0.15s ease',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)', marginBottom: '2px' }}>{label}</p>
          <p style={{ fontSize: '11px', color: 'var(--t3)' }}>
            {trades.length} trade{trades.length !== 1 ? 's' : ''} · {wins}W {losses}L
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '20px', fontWeight: 700, color: totalPnl >= 0 ? 'var(--gr2)' : 'var(--re)', letterSpacing: '-0.03em' }}>
            {totalPnl >= 0 ? '+' : ''}€{totalPnl.toFixed(2)}
          </span>
          <button onClick={onClose} style={{
            background: 'var(--s3)', border: '1px solid var(--bd2)',
            borderRadius: '6px', width: '26px', height: '26px',
            color: 'var(--t3)', cursor: 'pointer', fontSize: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>
      </div>

      {/* Trade rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {trades.map((t, i) => {
          const pnl = t.net_profit ?? 0
          const col = pnl > BE_THRESHOLD ? 'var(--gr2)' : pnl < -BE_THRESHOLD ? 'var(--re)' : 'var(--t3)'
          const openTime  = t.open_time  ? new Date(t.open_time ).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'
          const closeTime = t.close_time ? new Date(t.close_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'
          return (
            <div key={t.id ?? i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 12px',
              background: 'rgba(255,255,255,0.025)',
              borderRadius: '8px',
              border: `1px solid ${pnl > BE_THRESHOLD ? 'rgba(0,232,122,0.1)' : pnl < -BE_THRESHOLD ? 'rgba(255,61,80,0.1)' : 'var(--bd)'}`,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)' }}>{t.symbol}</span>
                  {t.trade_type && (
                    <span style={{
                      fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em',
                      color: t.trade_type === 'buy' ? 'var(--gr2)' : 'var(--re)',
                      background: t.trade_type === 'buy' ? 'rgba(0,232,122,0.1)' : 'rgba(255,61,80,0.1)',
                      padding: '1px 6px', borderRadius: '4px',
                    }}>{t.trade_type.toUpperCase()}</span>
                  )}
                  {t.lot_size != null && (
                    <span style={{ fontSize: '11px', color: 'var(--t3)' }}>{t.lot_size} lot{t.lot_size !== 1 ? 's' : ''}</span>
                  )}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--t3)' }}>{openTime} → {closeTime}</span>
              </div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: col, letterSpacing: '-0.02em', flexShrink: 0, marginLeft: '12px' }}>
                {pnl >= 0 ? '+' : ''}€{pnl.toFixed(2)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function TradeCalendar({ allRows }: { allRows: Trade[] }) {
  const now   = new Date()
  const today = now.toISOString().split('T')[0]

  const [viewYear,  setViewYear]  = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
    setSelectedDate(null)
  }
  function nextMonth() {
    const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth()
    if (isCurrentMonth) return
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
    setSelectedDate(null)
  }

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth()

  const daysInMonth    = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()
  const startOffset    = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

  // Build daily map and per-day trade list for selected month
  const { dailyPnl, dailyTrades } = useMemo(() => {
    const pnlMap    = new Map<string, number>()
    const tradesMap = new Map<string, Trade[]>()
    for (const t of allRows) {
      if (!t.close_time || t.symbol === 'BALANCE') continue
      const d = new Date(t.close_time)
      if (d.getFullYear() !== viewYear || d.getMonth() !== viewMonth) continue
      const key = t.close_time.split('T')[0]
      pnlMap.set(key, (pnlMap.get(key) ?? 0) + (t.net_profit ?? 0))
      const arr = tradesMap.get(key) ?? []
      arr.push(t)
      tradesMap.set(key, arr)
    }
    return { dailyPnl: pnlMap, dailyTrades: tradesMap }
  }, [allRows, viewYear, viewMonth])

  const maxAbs     = Math.max(1, ...Array.from(dailyPnl.values()).map(Math.abs))
  const totalPnl   = Array.from(dailyPnl.values()).reduce((s, v) => s + v, 0)
  const profitDays = Array.from(dailyPnl.values()).filter(v => v >  BE_THRESHOLD).length
  const lossDays   = Array.from(dailyPnl.values()).filter(v => v < -BE_THRESHOLD).length
  const beDays     = Array.from(dailyPnl.values()).filter(v => v >= -BE_THRESHOLD && v <= BE_THRESHOLD).length

  const selectedTrades = selectedDate ? (dailyTrades.get(selectedDate) ?? []) : []

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={prevMonth} style={{
          background: 'var(--s3)', border: '1px solid var(--bd2)', borderRadius: '8px',
          width: '32px', height: '32px', color: 'var(--t2)', cursor: 'pointer', fontSize: '16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s',
        }}>‹</button>
        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.02em' }}>
          {monthLabel}
        </span>
        <button onClick={nextMonth} style={{
          background: isCurrentMonth ? 'transparent' : 'var(--s3)',
          border: '1px solid var(--bd2)', borderRadius: '8px',
          width: '32px', height: '32px',
          color: isCurrentMonth ? 'var(--bd3)' : 'var(--t2)',
          cursor: isCurrentMonth ? 'default' : 'pointer', fontSize: '16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s',
        }}>›</button>
      </div>

      {/* Summary bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(0,232,122,0.7)', display: 'inline-block', boxShadow: '0 0 6px rgba(0,232,122,0.55)' }} />
            <span style={{ fontSize: '11px', color: 'var(--t2)' }}>{profitDays} green</span>
          </div>
          {beDays > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(232,201,106,0.7)', display: 'inline-block', boxShadow: '0 0 6px rgba(232,201,106,0.45)' }} />
              <span style={{ fontSize: '11px', color: 'var(--go2)' }}>{beDays} BE</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(255,61,80,0.7)', display: 'inline-block', boxShadow: '0 0 6px rgba(255,61,80,0.55)' }} />
            <span style={{ fontSize: '11px', color: 'var(--t2)' }}>{lossDays} red</span>
          </div>
        </div>
        <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.025em', color: totalPnl >= 0 ? 'var(--gr2)' : 'var(--re)' }}>
          {totalPnl >= 0 ? '+' : ''}€{totalPnl.toFixed(2)}
        </span>
      </div>

      {/* Day headers */}
      <div className="calendar-header-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '11px', color: 'var(--t3)', fontWeight: 600, letterSpacing: '0.04em', paddingBottom: '4px' }}>{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="calendar-day-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '46px', gap: '4px' }}>
        {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const dayNum   = i + 1
          const dateStr  = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
          const pnl      = dailyPnl.get(dateStr)
          const isToday  = dateStr === today
          const isFuture = dateStr > today
          const isSelected = dateStr === selectedDate
          const has      = pnl !== undefined
          const intensity = has ? Math.min(1, Math.abs(pnl!) / maxAbs) : 0

          const isBreakEven = has && pnl! >= -BE_THRESHOLD && pnl! <= BE_THRESHOLD
          const isWinDay    = has && pnl! >  BE_THRESHOLD
          const isLossDay   = has && pnl! < -BE_THRESHOLD

          let bg: string, txtCol: string, border: string, shadow = 'none'
          if (!has) {
            bg     = isFuture ? 'transparent' : 'rgba(255,255,255,0.02)'
            txtCol = isFuture ? 'var(--bd3)' : 'var(--t3)'
            border = 'transparent'
          } else if (isBreakEven) {
            bg     = 'rgba(232,201,106,0.1)'
            txtCol = 'var(--go2)'
            border = 'rgba(232,201,106,0.28)'
            shadow = 'none'
          } else if (isWinDay) {
            bg     = `rgba(0,232,122,${0.08 + intensity * 0.28})`
            txtCol = 'var(--gr2)'
            border = `rgba(0,232,122,${0.15 + intensity * 0.2})`
            shadow = intensity > 0.3 ? `0 0 12px rgba(0,232,122,${0.15 + intensity * 0.3})` : 'none'
          } else {
            bg     = `rgba(255,61,80,${0.08 + intensity * 0.28})`
            txtCol = 'var(--re2)'
            border = `rgba(255,61,80,${0.15 + intensity * 0.2})`
            shadow = intensity > 0.3 ? `0 0 12px rgba(255,61,80,${0.15 + intensity * 0.3})` : 'none'
          }

          const absVal = Math.abs(pnl ?? 0)
          const pnlStr = absVal >= 1000 ? `${pnl! >= 0 ? '+' : '-'}€${(absVal / 1000).toFixed(1)}k`
                       : absVal >= 1    ? `${pnl! >= 0 ? '+' : '-'}€${Math.round(absVal)}`
                       : ''

          return (
            <div
              key={dayNum}
              onClick={() => {
                if (!has) return
                setSelectedDate(prev => prev === dateStr ? null : dateStr)
              }}
              style={{
                borderRadius: '7px', background: bg,
                border: isSelected
                  ? '2px solid rgba(77,143,255,0.8)'
                  : isToday
                    ? '1.5px solid rgba(77,143,255,0.6)'
                    : `1px solid ${border}`,
                boxShadow: isSelected
                  ? '0 0 0 3px rgba(77,143,255,0.15)'
                  : isToday
                    ? '0 0 0 3px rgba(77,143,255,0.1)'
                    : shadow,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
                transition: 'all 0.12s',
                cursor: has ? 'pointer' : 'default',
              }}>
              <span style={{ fontSize: '11px', fontWeight: isToday || isSelected ? 700 : 400, lineHeight: 1, color: isSelected ? 'var(--ac)' : isToday ? 'var(--ac)' : has ? txtCol : 'var(--t3)' }}>
                {dayNum}
              </span>
              {has && pnlStr && (
                <span className="calendar-pnl-label" style={{ fontSize: '10px', fontWeight: 700, color: txtCol, lineHeight: 1, letterSpacing: '-0.02em' }}>
                  {pnlStr}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Day detail panel */}
      {selectedDate && selectedTrades.length > 0 && (
        <DayDetailPanel
          dateStr={selectedDate}
          trades={selectedTrades.sort((a, b) => (a.open_time ?? '').localeCompare(b.open_time ?? ''))}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  )
}
