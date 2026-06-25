'use client'

import { useMemo, useState, useEffect } from 'react'
import MobileOverviewTab from './MobileOverviewTab'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 639px)').matches : false
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}
import { useTrades, BE_THRESHOLD } from '@/hooks/useTrades'
import { useTasks }           from '@/hooks/useTasks'
import { useAccountSnapshot } from '@/hooks/useAccountSnapshot'
import { usePortfolio }       from '@/hooks/usePortfolio'
import { useJournalEntries }  from '@/hooks/useJournalEntries'
import { useHabits }          from '@/hooks/useHabits'
import { useDisplayMode }     from '@/context/DisplayModeContext'
import { generateInsights }   from '@/lib/intelligence'
import { formatValue }        from '@/lib/utils/formatting'
import InsightCard            from '@/components/ui/InsightCard'
import Panel                  from '@/components/ui/Panel'
import SessionClock           from '@/components/ui/SessionClock'
import type { Trade }         from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}
function fmtEur(n: number, dec = 2) {
  return `€${n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`
}
function fmtPnl(n: number) {
  return `${n >= 0 ? '+' : '-'}€${Math.abs(n).toFixed(2)}`
}
function fullDate() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

const MOOD_COLOR: Record<string, string> = {
  great: 'var(--gr2)', good: 'var(--gr2)', neutral: 'var(--am2)', low: 'var(--re)', bad: 'var(--re)',
}

// ── Market Strip ─────────────────────────────────────────────────────────────

interface StripItem { symbol: string; label: string; price: number; change1d: number; currency: string; marketState: string }

function MarketStrip() {
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

// ── Win Rate Ring ─────────────────────────────────────────────────────────────

function WinRing({ wr }: { wr: number }) {
  const pct   = Math.min(100, Math.max(0, wr))
  const color = pct >= 65 ? 'var(--gr2)' : pct >= 50 ? 'var(--am2)' : 'var(--re)'
  const glow  = pct >= 65 ? 'rgba(0,232,122,0.45)' : pct >= 50 ? 'rgba(240,168,64,0.45)' : 'rgba(255,61,80,0.45)'
  const deg   = (pct / 100) * 360
  return (
    <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: '-5px', borderRadius: '50%', background: `radial-gradient(circle, ${glow.replace('0.45','0.1')} 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `conic-gradient(${color} ${deg}deg, var(--s3) ${deg}deg)`, boxShadow: `0 0 14px ${glow}` }} />
      <div style={{ position: 'absolute', inset: '7px', borderRadius: '50%', background: 'var(--s1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color, fontSize: '13px', fontWeight: 700 }}>{pct.toFixed(0)}%</span>
      </div>
    </div>
  )
}

// ── Trade Calendar ────────────────────────────────────────────────────────────

function DayDetailPanel({ dateStr, trades, onClose }: {
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

function TradeCalendar({ allRows }: { allRows: Trade[] }) {
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

// ── Streak Card ───────────────────────────────────────────────────────────────

function StreakCard({ trades, journalStreak, habitStreak }: { trades: Trade[]; journalStreak: number; habitStreak: number }) {
  // Wins + break-evens in a row — only a real loss (< -BE_THRESHOLD) resets
  const tradeStreak = useMemo(() => {
    let streak = 0
    for (const t of [...trades].reverse()) {
      if ((t.net_profit ?? 0) < -BE_THRESHOLD) break
      streak++
    }
    return streak
  }, [trades])

  const lossStreak = useMemo(() => {
    let streak = 0
    for (const t of [...trades].reverse()) {
      if ((t.net_profit ?? 0) < -BE_THRESHOLD) streak++
      else break
    }
    return streak
  }, [trades])

  const isLosing = lossStreak > 0 && tradeStreak === 0

  const items = [
    {
      label:   isLosing ? 'Loss run' : 'Win streak',
      value:   isLosing ? lossStreak : tradeStreak,
      unit:    isLosing ? 'losses in a row' : 'trades without a loss',
      icon:    isLosing ? '⚠️' : tradeStreak >= 5 ? '🔥' : '📈',
      bg:      isLosing ? 'rgba(255,61,80,0.08)'      : tradeStreak >= 3 ? 'rgba(0,232,122,0.07)'     : 'rgba(255,255,255,0.03)',
      border:  isLosing ? 'rgba(255,61,80,0.2)'       : tradeStreak >= 3 ? 'rgba(0,232,122,0.18)'     : 'var(--bd2)',
      numCol:  isLosing ? 'var(--re)'                 : tradeStreak >= 3 ? 'var(--gr2)'               : 'var(--t2)',
    },
    {
      label:   'Journal streak',
      value:   journalStreak,
      unit:    journalStreak === 1 ? 'day in a row' : 'days in a row',
      icon:    journalStreak >= 7 ? '🔥' : '✍',
      bg:      journalStreak >= 7 ? 'rgba(232,201,106,0.08)' : journalStreak >= 3 ? 'rgba(0,232,122,0.06)' : 'rgba(255,255,255,0.03)',
      border:  journalStreak >= 7 ? 'rgba(232,201,106,0.25)' : journalStreak >= 3 ? 'rgba(0,232,122,0.15)' : 'var(--bd2)',
      numCol:  journalStreak >= 7 ? 'var(--go2)' : journalStreak >= 3 ? 'var(--gr2)' : 'var(--t2)',
    },
    {
      label:   'Habit streak',
      value:   habitStreak,
      unit:    habitStreak === 1 ? 'day in a row' : 'days in a row',
      icon:    habitStreak >= 7 ? '🔥' : '💪',
      bg:      habitStreak >= 7 ? 'rgba(232,201,106,0.08)' : habitStreak >= 3 ? 'rgba(160,100,255,0.07)' : 'rgba(255,255,255,0.03)',
      border:  habitStreak >= 7 ? 'rgba(232,201,106,0.25)' : habitStreak >= 3 ? 'rgba(160,100,255,0.2)'  : 'var(--bd2)',
      numCol:  habitStreak >= 7 ? 'var(--go2)' : habitStreak >= 3 ? 'var(--pu)' : 'var(--t2)',
    },
  ]

  return (
    <div style={{
      borderRadius: '12px', padding: '16px 18px',
      background: 'rgba(232,201,106,0.04)',
      border: '1px solid rgba(232,201,106,0.14)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '14px' }}>
        <span style={{ fontSize: '16px', lineHeight: 1 }}>🔥</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--go2)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Streaks</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map(item => (
          <div key={item.label} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px', borderRadius: '9px',
            background: item.bg, border: `1px solid ${item.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', lineHeight: 1 }}>{item.icon}</span>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--t3)', lineHeight: 1, marginBottom: '2px' }}>{item.label}</p>
                <p style={{ fontSize: '10px', color: 'var(--t3)', lineHeight: 1 }}>{item.unit}</p>
              </div>
            </div>
            <span style={{ fontSize: '26px', fontWeight: 800, color: item.numCol, letterSpacing: '-0.04em', lineHeight: 1 }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Streak Badge ──────────────────────────────────────────────────────────────

function StreakBadge({ trades }: { trades: Trade[] }) {
  const streak = useMemo(() => {
    let wins = 0, losses = 0
    for (const t of [...trades].reverse()) {
      const pnl = t.net_profit ?? 0
      if (pnl > BE_THRESHOLD) {
        if (losses > 0) break
        wins++
      } else if (pnl < -BE_THRESHOLD) {
        if (wins > 0) break
        losses++
      }
    }
    return { wins, losses }
  }, [trades])

  if (streak.wins >= 2) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '8px', background: 'rgba(0,232,122,0.1)', border: '1px solid rgba(0,232,122,0.2)' }}>
      <span style={{ fontSize: '14px' }}>🔥</span>
      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gr2)' }}>{streak.wins}-trade win streak</span>
    </div>
  )
  if (streak.losses >= 2) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '8px', background: 'rgba(255,61,80,0.1)', border: '1px solid rgba(255,61,80,0.25)' }}>
      <span style={{ fontSize: '14px' }}>⚠️</span>
      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--re)' }}>{streak.losses} losses in a row — consider stepping back</span>
    </div>
  )
  return null
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function OverviewTab() {
  const today = new Date().toISOString().split('T')[0]
  const { trades, allRows, stats, loading: tradesLoading } = useTrades(500)
  const { tasks }       = useTasks()
  const { snapshot }    = useAccountSnapshot()
  const { holdings, totalValueEur } = usePortfolio()
  const { entries }     = useJournalEntries()
  const { habits, isCompleted, todayCompleted, todayTotal, calcStreak } = useHabits()
  const { displayMode } = useDisplayMode()
  const isMobile = useIsMobile()

  if (isMobile) return <MobileOverviewTab />

  const balance = snapshot?.balance ?? 0
  const equity  = snapshot?.equity  ?? 0

  const todayPnl = useMemo(() =>
    allRows.filter(t => t.close_time?.startsWith(today) && t.symbol !== 'BALANCE')
      .reduce((s, t) => s + (t.net_profit ?? 0), 0),
  [allRows, today])

  const monthStart  = useMemo(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1), [])
  const monthTrades = useMemo(() => trades.filter(t => t.close_time && new Date(t.close_time) >= monthStart), [trades, monthStart])
  const monthWins   = monthTrades.filter(t => (t.net_profit ?? 0) >  BE_THRESHOLD).length
  const monthLosses = monthTrades.filter(t => (t.net_profit ?? 0) < -BE_THRESHOLD).length

  const wins   = trades.filter(t => (t.net_profit ?? 0) >  BE_THRESHOLD).length
  const losses = trades.filter(t => (t.net_profit ?? 0) < -BE_THRESHOLD).length
  const wr     = stats?.winRate ?? 0

  const journalStreak = useMemo(() => {
    let streak = 0
    const d = new Date()
    for (let i = 0; i < 60; i++) {
      const key = d.toISOString().split('T')[0]
      if (entries.some(e => e.entry_date === key)) { streak++; d.setDate(d.getDate() - 1) }
      else break
    }
    return streak
  }, [entries])

  const openTasks    = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled')
  const overdueTasks = tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'done' && t.status !== 'cancelled')
  const todayTasks   = tasks.filter(t => t.due_date === today && t.status !== 'cancelled').slice(0, 5)
  const highPriTasks = openTasks.filter(t => t.priority === 'high').slice(0, 5)
  const focusTasks   = todayTasks.length > 0 ? todayTasks : highPriTasks

  const lastEntry = useMemo(() =>
    [...entries].sort((a, b) => b.entry_date.localeCompare(a.entry_date))[0] ?? null,
  [entries])

  const insights = useMemo(() => generateInsights({
    trades: [...trades, ...allRows.filter(t => t.symbol === 'BALANCE')],
    holdings, journal: entries, tasks, accountBalance: balance, portfolioValue: totalValueEur,
  }), [trades, allRows, holdings, entries, tasks, balance, totalValueEur])

  const journaledToday = entries.some(e => e.entry_date === today)
  const monthPnl       = stats?.monthPnl ?? 0
  const monthPnlPct    = balance > 0 ? (monthPnl / balance) * 100 : 0
  const bestInstrument = (stats?.xauWinRate ?? 0) >= (stats?.nasWinRate ?? 0)
    ? { label: 'XAUUSD', wr: stats?.xauWinRate ?? 0 }
    : { label: 'NAS100', wr: stats?.nasWinRate ?? 0 }

  const bestHabitStreak = habits.length > 0 ? Math.max(...habits.map(h => calcStreak(h.id))) : 0

  const todayColor = todayPnl > 0 ? 'var(--gr2)' : todayPnl < 0 ? 'var(--re)' : 'var(--t2)'
  const monthColor = monthPnl >= 0 ? 'var(--gr2)' : 'var(--re)'

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 fade-in">

      {/* Market Strip */}
      <MarketStrip />

      {/* ══════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════ */}
      <div className="hero-section" style={{
        position: 'relative', overflow: 'hidden',
        background: 'var(--s1)',
        border: '1px solid var(--bd2)',
        borderRadius: '16px', padding: '22px 24px 20px',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 8px 40px rgba(0,0,0,0.8)',
      }}>
        {/* Ambient glows */}
        <div className="ambient-blue"  style={{ width: '300px', height: '300px', top: '-120px', right: '50px',  opacity: 0.4 }} />
        <div className="ambient-gold"  style={{ width: '200px', height: '200px', top: '-60px',  right: '280px', opacity: 0.25 }} />
        <div className="ambient-green" style={{ width: '160px', height: '160px', bottom: '-60px', left: '60px', opacity: 0.2 }} />

        <div style={{ position: 'relative' }}>
          {/* Row 1: date + habits + streak */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
            <p style={{ fontSize: '11px', color: 'var(--t3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {fullDate()}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {habits.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--t3)' }}>{todayCompleted}/{todayTotal}</span>
                  {habits.map(h => {
                    const done = isCompleted(h.id, today)
                    return <div key={h.id} title={h.name} style={{ width: '8px', height: '8px', borderRadius: '50%', background: done ? 'var(--gr2)' : 'var(--s3)', border: `1px solid ${done ? 'var(--gr)' : 'var(--bd2)'}`, boxShadow: done ? '0 0 5px rgba(0,232,122,0.55)' : 'none' }} />
                  })}
                </div>
              )}
              {bestHabitStreak >= 3 && (
                <span style={{ fontSize: '12px', fontWeight: 700, color: bestHabitStreak >= 7 ? 'var(--go2)' : 'var(--pu)', textShadow: bestHabitStreak >= 7 ? '0 0 14px rgba(255,176,48,0.4)' : 'none' }}>
                  🔥 {bestHabitStreak}d habit streak
                </span>
              )}
              {journalStreak >= 1 && (
                <span style={{ fontSize: '12px', fontWeight: 700, color: journalStreak >= 7 ? 'var(--go2)' : 'var(--gr2)', textShadow: journalStreak >= 7 ? '0 0 14px rgba(255,176,48,0.55)' : '0 0 10px rgba(0,232,122,0.5)' }}>
                  {journalStreak >= 7 ? '🔥' : '✓'} {journalStreak}d journal
                </span>
              )}
            </div>
          </div>

          {/* Row 2: greeting + streak alert */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px', flexWrap: 'wrap' }}>
            <h1 className="greeting-heading" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              {greeting()}, Marco
            </h1>
            <StreakBadge trades={trades} />
            {overdueTasks.length > 0 && (
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--re)', background: 'rgba(255,61,80,0.1)', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(255,61,80,0.2)' }}>
                ⚠ {overdueTasks.length} overdue
              </span>
            )}
          </div>

          {/* Row 3: Session clock */}
          <div style={{ marginBottom: '20px', padding: '10px 14px', background: 'rgba(255,255,255,0.025)', borderRadius: '10px', border: '1px solid var(--bd2)' }}>
            <SessionClock />
          </div>

          {/* Row 4: Metric grid */}
          <div className="metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', minWidth: 0 }}>

            {/* Balance */}
            <div className="metric-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.025)', borderRadius: '12px', border: '1px solid var(--bd2)', display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 }}>
              <span style={{ fontSize: 'clamp(9px, 1.5vw, 10px)', color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>MT5 Balance</span>
              <span style={{ fontSize: 'clamp(16px, 3vw, 24px)', fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.03em', lineHeight: 1 }}>{fmtEur(balance)}</span>
              {equity > 0 && equity !== balance && <span style={{ fontSize: 'clamp(10px, 1.5vw, 11px)', color: 'var(--t3)' }}>Equity {fmtEur(equity)}</span>}
              <span style={{ fontSize: 'clamp(10px, 1.5vw, 11px)', color: 'var(--t3)', marginTop: '2px' }}>{wins}W / {losses}L · {stats?.totalTrades ?? 0} trades</span>
            </div>

            {/* Today P&L */}
            <div className="metric-card" style={{ padding: '16px', background: todayPnl !== 0 ? `rgba(${todayPnl > 0 ? '0,232,122' : '255,61,80'},0.07)` : 'rgba(255,255,255,0.025)', borderRadius: '12px', border: `1px solid ${todayPnl !== 0 ? (todayPnl > 0 ? 'rgba(0,232,122,0.18)' : 'rgba(255,61,80,0.18)') : 'var(--bd2)'}`, borderLeft: `3px solid ${todayColor}`, display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 }}>
              <span style={{ fontSize: 'clamp(9px, 1.5vw, 10px)', color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Today P&L</span>
              <span className={todayPnl !== 0 ? (todayPnl > 0 ? 'glow-green' : 'glow-red') : ''} style={{ fontSize: 'clamp(16px, 3vw, 24px)', fontWeight: 700, color: todayColor, letterSpacing: '-0.03em', lineHeight: 1 }}>{todayPnl !== 0 ? fmtPnl(todayPnl) : '€0.00'}</span>
              <span style={{ fontSize: 'clamp(10px, 1.5vw, 11px)', color: 'var(--t3)', marginTop: '2px' }}>{todayPnl !== 0 ? `${(balance > 0 ? todayPnl / balance * 100 : 0).toFixed(2)}% of balance` : 'No closed trades today'}</span>
            </div>

            {/* Month P&L */}
            <div className="metric-card" style={{ padding: '16px', background: `rgba(${monthPnl >= 0 ? '0,232,122' : '255,61,80'},0.06)`, borderRadius: '12px', border: `1px solid ${monthPnl >= 0 ? 'rgba(0,232,122,0.15)' : 'rgba(255,61,80,0.15)'}`, display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 }}>
              <span style={{ fontSize: 'clamp(9px, 1.5vw, 10px)', color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Month P&L</span>
              <span style={{ fontSize: 'clamp(16px, 3vw, 24px)', fontWeight: 700, color: monthColor, letterSpacing: '-0.03em', lineHeight: 1 }}>{stats ? formatValue(monthPnl, monthPnlPct, displayMode, { showSign: true }) : '—'}</span>
              <span style={{ fontSize: 'clamp(10px, 1.5vw, 11px)', color: 'var(--t3)', marginTop: '2px' }}>{monthWins}W · {monthLosses}L this month</span>
            </div>

            {/* Win Rate */}
            <div className="metric-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.025)', borderRadius: '12px', border: '1px solid var(--bd2)', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
              <span style={{ fontSize: '10px', color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Win Rate</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <WinRing wr={wr} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--t1)' }}>{wins}W / {losses}L</span>
                  <span style={{ fontSize: '11px', color: 'var(--t3)' }}>Best: {bestInstrument.label} · {bestInstrument.wr.toFixed(0)}%</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          CALENDAR + TODAY'S FOCUS
      ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <div className="lg:col-span-2">
          <Panel title="Daily P&L Calendar" accent="var(--gr)">
            <TradeCalendar allRows={allRows} />
          </Panel>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-5">
          <StreakCard trades={trades} journalStreak={journalStreak} habitStreak={bestHabitStreak} />
          <Panel title="Today's Focus" accent="var(--am2)">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {habits.length > 0 && (
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '10px', fontWeight: 600 }}>
                    Habits · {todayCompleted}/{todayTotal} done
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {habits.slice(0, 5).map(h => {
                      const done = isCompleted(h.id, today)
                      return (
                        <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0, background: done ? 'var(--gr)' : 'transparent', border: `2px solid ${done ? 'var(--gr2)' : 'var(--bd2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: done ? '0 0 8px rgba(0,232,122,0.45)' : 'none' }}>
                            {done && <span style={{ fontSize: '9px', color: 'white', fontWeight: 700 }}>✓</span>}
                          </div>
                          <span style={{ fontSize: '13px', color: done ? 'var(--t3)' : 'var(--t2)', textDecoration: done ? 'line-through' : 'none' }}>
                            {h.icon} {h.name}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {habits.length > 0 && focusTasks.length > 0 && <div style={{ height: '1px', background: 'var(--bd)' }} />}

              {focusTasks.length > 0 && (
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '10px', fontWeight: 600 }}>
                    {todayTasks.length > 0 ? 'Due Today' : 'High Priority'}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {focusTasks.map(task => {
                      const overdue = task.due_date && task.due_date < today && task.status !== 'done'
                      return (
                        <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0, marginTop: '1px', background: task.status === 'done' ? 'var(--gr)' : 'transparent', border: `2px solid ${task.status === 'done' ? 'var(--gr2)' : overdue ? 'var(--re)' : 'var(--bd2)'}`, boxShadow: task.status === 'done' ? '0 0 6px rgba(0,232,122,0.4)' : 'none' }} />
                          <span style={{ fontSize: '13px', lineHeight: 1.45, color: task.status === 'done' ? 'var(--t3)' : overdue ? 'var(--re)' : 'var(--t2)', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
                            {task.title}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  {openTasks.length > focusTasks.length && (
                    <p style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '8px' }}>+{openTasks.length - focusTasks.length} more open</p>
                  )}
                </div>
              )}

              {habits.length === 0 && focusTasks.length === 0 && (
                <p style={{ color: 'var(--t3)', fontSize: '13px' }}>Add habits and tasks to fill this panel.</p>
              )}

              {lastEntry && (
                <>
                  <div style={{ height: '1px', background: 'var(--bd)' }} />
                  <div>
                    <p style={{ fontSize: '11px', color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '7px', fontWeight: 600 }}>
                      Last Journal · {lastEntry.entry_date}
                    </p>
                    {lastEntry.mood && (
                      <p style={{ fontSize: '13px', fontWeight: 600, color: MOOD_COLOR[lastEntry.mood] ?? 'var(--t2)', marginBottom: '5px' }}>● {lastEntry.mood}</p>
                    )}
                    {lastEntry.body_text && (
                      <p style={{ fontSize: '12px', color: 'var(--t3)', lineHeight: 1.6 }}>
                        {lastEntry.body_text.slice(0, 130)}{lastEntry.body_text.length > 130 ? '…' : ''}
                      </p>
                    )}
                    {!journaledToday && <p style={{ fontSize: '12px', color: 'var(--am2)', marginTop: '6px' }}>⚠ No entry today yet</p>}
                  </div>
                </>
              )}
            </div>
          </Panel>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          VELQUOR INTELLIGENCE
      ══════════════════════════════════════════════════════════ */}
      <Panel
        title="VELQUOR Intelligence"
        accent="var(--go2)"
        action={insights.length > 0 ? (
          <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', background: 'rgba(255,176,48,0.1)', color: 'var(--go2)', fontWeight: 600, border: '1px solid rgba(255,176,48,0.2)' }}>
            {insights.length} insight{insights.length !== 1 ? 's' : ''}
          </span>
        ) : undefined}
      >
        {insights.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {insights.slice(0, 3).map(i => <InsightCard key={i.id} insight={i} compact />)}
          </div>
        ) : (
          <p style={{ color: 'var(--t3)', fontSize: '13px' }}>
            {tradesLoading ? 'Analysing your trades…' : 'Sync MT5 and add trades to generate insights.'}
          </p>
        )}
      </Panel>

    </div>
  )
}
