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

// €-money helpers — full number with thousands separators, matching the mock.
const fmtMoney  = (v: number) => `€${Math.round(Math.abs(v)).toLocaleString('en-US')}`
const fmtSigned = (v: number) => `${v >= 0 ? '+' : '-'}€${Math.round(Math.abs(v)).toLocaleString('en-US')}`

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
  // Sunday-first layout (matches the mock: Sun … Sat).
  const startOffset    = new Date(viewYear, viewMonth, 1).getDay()

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

  const selectedTrades = selectedDate ? (dailyTrades.get(selectedDate) ?? []) : []

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  // Chunk the month into calendar weeks (each a 7-slot row, null = padding day).
  const cells: (number | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const dateOf = (dayNum: number) => `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '28px', padding: '2px 0 6px' }}>
        <button onClick={prevMonth} aria-label="Previous month" style={{
          background: 'transparent', border: 'none', color: 'var(--t1)', cursor: 'pointer',
          fontSize: '22px', lineHeight: 1, padding: '4px 8px',
        }}>←</button>
        <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.01em', minWidth: '150px', textAlign: 'center' }}>
          {monthLabel}
        </span>
        <button onClick={nextMonth} aria-label="Next month" disabled={isCurrentMonth} style={{
          background: 'transparent', border: 'none',
          color: isCurrentMonth ? 'var(--bd3)' : 'var(--t1)',
          cursor: isCurrentMonth ? 'default' : 'pointer',
          fontSize: '22px', lineHeight: 1, padding: '4px 8px',
        }}>→</button>
      </div>

      {/* Day headers — Sunday first */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '12px', color: 'var(--t3)', fontWeight: 500, paddingBottom: '6px' }}>{d}</div>
        ))}
      </div>

      {/* Weeks — each row of days followed by its Week total bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {weeks.map((week, wi) => {
          const weekPnl = week.reduce<number>((s, dn) => s + (dn != null ? (dailyPnl.get(dateOf(dn)) ?? 0) : 0), 0)
          const weekHasData = week.some(dn => dn != null && dailyPnl.has(dateOf(dn)))

          return (
            <div key={wi}>
              {/* Row of 7 day cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {week.map((dayNum, di) => {
                  if (dayNum == null) {
                    return <div key={`e${di}`} style={{ minHeight: '78px', border: '1px solid rgba(255,255,255,0.05)' }} />
                  }
                  const dateStr    = dateOf(dayNum)
                  const pnl        = dailyPnl.get(dateStr)
                  const list       = dailyTrades.get(dateStr) ?? []
                  const isToday    = dateStr === today
                  const isSelected = dateStr === selectedDate
                  const has        = pnl !== undefined

                  const isWinDay  = has && pnl! >  BE_THRESHOLD
                  const isLossDay = has && pnl! < -BE_THRESHOLD

                  // Per-day win rate over decisive trades (wins vs losses).
                  const decisive = list.filter(t => Math.abs(t.net_profit ?? 0) > BE_THRESHOLD)
                  const wins     = decisive.filter(t => (t.net_profit ?? 0) > BE_THRESHOLD).length
                  const winPct   = decisive.length > 0 ? Math.round((wins / decisive.length) * 100) : null

                  const bg = isWinDay  ? 'rgba(0,232,122,0.09)'
                           : isLossDay ? 'rgba(255,61,80,0.10)'
                           : has       ? 'rgba(232,201,106,0.08)'  // break-even day
                           : 'transparent'

                  return (
                    <div
                      key={dayNum}
                      onClick={() => { if (has) setSelectedDate(prev => prev === dateStr ? null : dateStr) }}
                      style={{
                        minHeight: '78px', padding: '8px 9px', background: bg,
                        border: isSelected
                          ? '1.5px solid rgba(77,143,255,0.8)'
                          : isToday
                            ? '1.5px solid rgba(77,143,255,0.55)'
                            : '1px solid rgba(255,255,255,0.05)',
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px',
                        cursor: has ? 'pointer' : 'default', transition: 'background 0.12s',
                      }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, lineHeight: 1, color: has ? 'var(--t1)' : 'var(--t3)' }}>
                        {dayNum}
                      </span>
                      {has && (
                        <>
                          <span style={{ fontSize: '14px', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.01em', color: 'var(--t1)' }}>
                            {fmtMoney(pnl!)}
                          </span>
                          {winPct != null && (
                            <span style={{ fontSize: '12px', color: 'var(--t3)', lineHeight: 1 }}>{winPct}%</span>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Week total bar — only for weeks that contain trading days */}
              {weekHasData && (
                <div style={{
                  marginTop: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 18px', borderRadius: '10px',
                  background: weekPnl >= 0 ? 'rgba(0,232,122,0.045)' : 'rgba(255,61,80,0.05)',
                  border: `1px solid ${weekPnl >= 0 ? 'rgba(0,232,122,0.12)' : 'rgba(255,61,80,0.14)'}`,
                }}>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--t3)' }}>Week total</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em', color: weekPnl >= 0 ? 'var(--gr2)' : 'var(--re)' }}>
                      {fmtSigned(weekPnl)}
                    </span>
                    <span style={{ fontSize: '16px', color: 'var(--t3)', lineHeight: 1 }}>›</span>
                  </div>
                </div>
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
