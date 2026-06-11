'use client'

import { useMemo, useState, useEffect } from 'react'
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
import DailyMaxLoss           from '@/components/ui/DailyMaxLoss'
import PreMarketChecklist     from '@/components/ui/PreMarketChecklist'
import ConsistencyScore       from '@/components/ui/ConsistencyScore'
import GoalTracker            from '@/components/ui/GoalTracker'
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

// ── Weekly Chart ──────────────────────────────────────────────────────────────

function WeeklyChart({ weeklyPnl }: { weeklyPnl: number[] }) {
  const maxAbs = Math.max(1, ...weeklyPnl.map(Math.abs))
  const now = new Date()
  const mon = new Date(now)
  mon.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1))
  mon.setHours(0, 0, 0, 0)
  const labels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(d.getDate() - (6 - i) * 7)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  })
  const totalPnl = weeklyPnl.reduce((s, v) => s + v, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 600 }}>Last 7 Weeks</span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: totalPnl >= 0 ? 'var(--gr2)' : 'var(--re)' }}>
          {totalPnl >= 0 ? '+' : ''}€{totalPnl.toFixed(0)}
        </span>
      </div>
      <div style={{ position: 'relative', height: '60px' }}>
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'var(--bd2)' }} />
        <div style={{ display: 'flex', gap: '4px', height: '100%' }}>
          {weeklyPnl.map((pnl, i) => {
            const h   = Math.max(4, (Math.abs(pnl) / maxAbs) * 26)
            const pos = pnl >= 0
            const cur = i === 6
            const col = pos ? 'var(--gr2)' : 'var(--re)'
            return (
              <div key={i} title={`${labels[i]}: ${pnl >= 0 ? '+' : ''}€${pnl.toFixed(2)}`}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ height: '28px', display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                  {pos && <div style={{ width: '100%', height: `${h}px`, background: col, borderRadius: '3px 3px 0 0', opacity: cur ? 1 : 0.35, boxShadow: cur ? `0 -3px 8px ${col}66` : 'none' }} />}
                </div>
                <div style={{ height: '28px', display: 'flex', alignItems: 'flex-start', width: '100%' }}>
                  {!pos && <div style={{ width: '100%', height: `${h}px`, background: col, borderRadius: '0 0 3px 3px', opacity: cur ? 1 : 0.35, boxShadow: cur ? `0 3px 8px ${col}66` : 'none' }} />}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '4px' }}>
        {labels.map((lbl, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <span style={{ fontSize: '9px', color: i === 6 ? 'var(--t2)' : 'var(--t3)', fontWeight: i === 6 ? 600 : 400, whiteSpace: 'nowrap' }}>{lbl}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Trade Calendar ────────────────────────────────────────────────────────────

function TradeCalendar({ allRows }: { allRows: Trade[] }) {
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth()
  const today = now.toISOString().split('T')[0]
  const daysInMonth    = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const startOffset    = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

  const dailyPnl = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of allRows) {
      if (!t.close_time || t.symbol === 'BALANCE') continue
      const d = new Date(t.close_time)
      if (d.getFullYear() !== year || d.getMonth() !== month) continue
      const key = t.close_time.split('T')[0]
      map.set(key, (map.get(key) ?? 0) + (t.net_profit ?? 0))
    }
    return map
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows, year, month])

  const maxAbs     = Math.max(1, ...Array.from(dailyPnl.values()).map(Math.abs))
  const totalPnl   = Array.from(dailyPnl.values()).reduce((s, v) => s + v, 0)
  const profitDays = Array.from(dailyPnl.values()).filter(v => v > 0).length
  const lossDays   = Array.from(dailyPnl.values()).filter(v => v < 0).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Summary bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(0,232,122,0.7)', display: 'inline-block', boxShadow: '0 0 6px rgba(0,232,122,0.55)' }} />
            <span style={{ fontSize: '12px', color: 'var(--t2)' }}>{profitDays} green days</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(255,61,80,0.7)', display: 'inline-block', boxShadow: '0 0 6px rgba(255,61,80,0.55)' }} />
            <span style={{ fontSize: '12px', color: 'var(--t2)' }}>{lossDays} red days</span>
          </div>
        </div>
        <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.025em', color: totalPnl >= 0 ? 'var(--gr2)' : 'var(--re)' }}>
          {totalPnl >= 0 ? '+' : ''}€{totalPnl.toFixed(2)}
        </span>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '11px', color: 'var(--t3)', fontWeight: 600, letterSpacing: '0.04em', paddingBottom: '4px' }}>{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '46px', gap: '4px' }}>
        {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const dayNum   = i + 1
          const dateStr  = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
          const pnl      = dailyPnl.get(dateStr)
          const isToday  = dateStr === today
          const isFuture = dateStr > today
          const has      = pnl !== undefined
          const intensity = has ? Math.min(1, Math.abs(pnl!) / maxAbs) : 0

          let bg: string, txtCol: string, border: string, shadow = 'none'
          if (!has) {
            bg     = isFuture ? 'transparent' : 'rgba(255,255,255,0.02)'
            txtCol = isFuture ? 'var(--bd3)' : 'var(--t3)'
            border = 'transparent'
          } else if (pnl! >= 0) {
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
            <div key={dayNum} title={has ? `${dateStr}: ${pnl! >= 0 ? '+' : ''}€${pnl!.toFixed(2)}` : dateStr}
              style={{
                borderRadius: '7px', background: bg,
                border: isToday ? '1.5px solid rgba(77,143,255,0.6)' : `1px solid ${border}`,
                boxShadow: isToday ? '0 0 0 3px rgba(77,143,255,0.1)' : shadow,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
                transition: 'all 0.12s',
              }}>
              <span style={{ fontSize: '11px', fontWeight: isToday ? 700 : 400, lineHeight: 1, color: isToday ? 'var(--ac)' : has ? txtCol : 'var(--t3)' }}>
                {dayNum}
              </span>
              {has && pnlStr && (
                <span style={{ fontSize: '10px', fontWeight: 700, color: txtCol, lineHeight: 1, letterSpacing: '-0.02em' }}>
                  {pnlStr}
                </span>
              )}
            </div>
          )
        })}
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
  const [dailyLimit, setDailyLimit] = useState(200)

  useEffect(() => {
    const stored = localStorage.getItem('jarvis-daily-limit')
    if (stored) setDailyLimit(parseFloat(stored) || 200)
    // Listen for storage changes (e.g. if DailyMaxLoss updates it)
    const handler = () => {
      const v = localStorage.getItem('jarvis-daily-limit')
      if (v) setDailyLimit(parseFloat(v) || 200)
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const { trades, allRows, stats, loading: tradesLoading } = useTrades(500)
  const { tasks }       = useTasks()
  const { snapshot }    = useAccountSnapshot()
  const { holdings, totalValueEur, totalPnlEur, totalPnlPct } = usePortfolio()
  const { entries }     = useJournalEntries()
  const { habits, isCompleted, todayCompleted, todayTotal } = useHabits()
  const { displayMode } = useDisplayMode()

  const balance  = snapshot?.balance ?? 0
  const equity   = snapshot?.equity  ?? 0
  const netWorth = balance + totalValueEur

  const todayPnl = useMemo(() =>
    allRows.filter(t => t.close_time?.startsWith(today) && t.symbol !== 'BALANCE')
      .reduce((s, t) => s + (t.net_profit ?? 0), 0),
  [allRows, today])

  const todayLossAmt = Math.max(0, -todayPnl) // positive amount if losing today

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
  const weeklyPnl      = stats?.weeklyPnl ?? Array(7).fill(0)
  const bestInstrument = (stats?.xauWinRate ?? 0) >= (stats?.nasWinRate ?? 0)
    ? { label: 'XAUUSD', wr: stats?.xauWinRate ?? 0 }
    : { label: 'NAS100', wr: stats?.nasWinRate ?? 0 }

  const todayColor = todayPnl > 0 ? 'var(--gr2)' : todayPnl < 0 ? 'var(--re)' : 'var(--t2)'
  const monthColor = monthPnl >= 0 ? 'var(--gr2)' : 'var(--re)'

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 fade-in">

      {/* ══════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════ */}
      <div style={{
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
              {journalStreak >= 1 && (
                <span style={{ fontSize: '12px', fontWeight: 700, color: journalStreak >= 7 ? 'var(--go2)' : 'var(--gr2)', textShadow: journalStreak >= 7 ? '0 0 14px rgba(255,176,48,0.55)' : '0 0 10px rgba(0,232,122,0.5)' }}>
                  {journalStreak >= 7 ? '🔥' : '✓'} {journalStreak}d streak
                </span>
              )}
            </div>
          </div>

          {/* Row 2: greeting + streak alert */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', minWidth: 0 }}>

            {/* Balance */}
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.025)', borderRadius: '12px', border: '1px solid var(--bd2)', display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 }}>
              <span style={{ fontSize: 'clamp(9px, 1.5vw, 10px)', color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>MT5 Balance</span>
              <span style={{ fontSize: 'clamp(16px, 3vw, 24px)', fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.03em', lineHeight: 1 }}>{fmtEur(balance)}</span>
              {equity > 0 && equity !== balance && <span style={{ fontSize: 'clamp(10px, 1.5vw, 11px)', color: 'var(--t3)' }}>Equity {fmtEur(equity)}</span>}
              <span style={{ fontSize: 'clamp(10px, 1.5vw, 11px)', color: 'var(--t3)', marginTop: '2px' }}>{wins}W / {losses}L · {stats?.totalTrades ?? 0} trades</span>
            </div>

            {/* Today P&L */}
            <div style={{ padding: '16px', background: todayPnl !== 0 ? `rgba(${todayPnl > 0 ? '0,232,122' : '255,61,80'},0.07)` : 'rgba(255,255,255,0.025)', borderRadius: '12px', border: `1px solid ${todayPnl !== 0 ? (todayPnl > 0 ? 'rgba(0,232,122,0.18)' : 'rgba(255,61,80,0.18)') : 'var(--bd2)'}`, borderLeft: `3px solid ${todayColor}`, display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 }}>
              <span style={{ fontSize: 'clamp(9px, 1.5vw, 10px)', color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Today P&L</span>
              <span className={todayPnl !== 0 ? (todayPnl > 0 ? 'glow-green' : 'glow-red') : ''} style={{ fontSize: 'clamp(16px, 3vw, 24px)', fontWeight: 700, color: todayColor, letterSpacing: '-0.03em', lineHeight: 1 }}>{todayPnl !== 0 ? fmtPnl(todayPnl) : '€0.00'}</span>
              <span style={{ fontSize: 'clamp(10px, 1.5vw, 11px)', color: 'var(--t3)', marginTop: '2px' }}>{todayPnl !== 0 ? `${(balance > 0 ? todayPnl / balance * 100 : 0).toFixed(2)}% of balance` : 'No closed trades today'}</span>
            </div>

            {/* Month P&L */}
            <div style={{ padding: '16px', background: `rgba(${monthPnl >= 0 ? '0,232,122' : '255,61,80'},0.06)`, borderRadius: '12px', border: `1px solid ${monthPnl >= 0 ? 'rgba(0,232,122,0.15)' : 'rgba(255,61,80,0.15)'}`, display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 }}>
              <span style={{ fontSize: 'clamp(9px, 1.5vw, 10px)', color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Month P&L</span>
              <span style={{ fontSize: 'clamp(16px, 3vw, 24px)', fontWeight: 700, color: monthColor, letterSpacing: '-0.03em', lineHeight: 1 }}>{stats ? formatValue(monthPnl, monthPnlPct, displayMode, { showSign: true }) : '—'}</span>
              <span style={{ fontSize: 'clamp(10px, 1.5vw, 11px)', color: 'var(--t3)', marginTop: '2px' }}>{monthWins}W · {monthLosses}L this month</span>
            </div>

            {/* Win Rate */}
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.025)', borderRadius: '12px', border: '1px solid var(--bd2)', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
              <span style={{ fontSize: '10px', color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Win Rate</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <WinRing wr={wr} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--t1)' }}>{wins}W / {losses}L</span>
                  <span style={{ fontSize: '11px', color: 'var(--t3)' }}>Best: {bestInstrument.label} · {bestInstrument.wr.toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* Net Worth */}
            <div style={{ padding: '16px', background: 'rgba(255,176,48,0.06)', borderRadius: '12px', border: '1px solid rgba(255,176,48,0.15)', display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 }}>
              <span style={{ fontSize: '10px', color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Net Worth</span>
              <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--go2)', letterSpacing: '-0.03em', lineHeight: 1 }}>{fmtEur(netWorth, 0)}</span>
              <span style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '2px' }}>MT5 + portfolio combined</span>
            </div>

            {/* Weekly chart */}
            <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.025)', borderRadius: '12px', border: '1px solid var(--bd2)' }}>
              <WeeklyChart weeklyPnl={weeklyPnl} />
            </div>

          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          CALENDAR + TODAY'S FOCUS
      ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <div className="lg:col-span-2">
          <Panel title={`${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} — Daily P&L`} accent="var(--gr)">
            <TradeCalendar allRows={allRows} />
          </Panel>
        </div>

        <div className="lg:col-span-1">
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
          TRADING TOOLS ROW (Daily Limit · Checklist · Consistency · Goal)
      ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <Panel title="Pre-Market & Daily Risk" accent="var(--re)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <DailyMaxLoss allRows={allRows} />
            <div style={{ height: '1px', background: 'var(--bd)' }} />
            <PreMarketChecklist />
          </div>
        </Panel>

        <Panel title="Performance & Goals" accent="var(--ac)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <GoalTracker monthPnl={stats?.monthPnl ?? 0} />
            <div style={{ height: '1px', background: 'var(--bd)' }} />
            <ConsistencyScore
              trades={trades}
              entries={entries}
              dailyLoss={todayLossAmt}
              dailyLimit={dailyLimit}
            />
          </div>
        </Panel>

      </div>

      {/* ══════════════════════════════════════════════════════════
          JARVIS INTELLIGENCE
      ══════════════════════════════════════════════════════════ */}
      <Panel
        title="Jarvis Intelligence"
        accent="var(--go2)"
        action={insights.length > 0 ? (
          <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', background: 'rgba(255,176,48,0.1)', color: 'var(--go2)', fontWeight: 600, border: '1px solid rgba(255,176,48,0.2)' }}>
            {insights.length} insight{insights.length !== 1 ? 's' : ''}
          </span>
        ) : undefined}
      >
        {insights.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {insights.slice(0, 4).map(i => <InsightCard key={i.id} insight={i} compact />)}
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
