'use client'

import { useMemo } from 'react'
import MobileOverviewTab from './MobileOverviewTab'
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
import EquityCurveChart       from '@/components/ui/EquityCurveChart'
import DailyPnLChart          from '@/components/ui/DailyPnLChart'
import { useIsMobile, greeting, fmtEur, fmtPnl, fullDate, MOOD_COLOR } from './overview/helpers'
import { MarketStrip } from './overview/MarketStrip'
import { WinRing } from './overview/WinRing'
import { TradeCalendar } from './overview/TradeCalendar'
import { StreakCard, StreakBadge } from './overview/StreakCards'
import { MarketOverview } from '@/components/widgets/TradingViewWidget'

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
          CHARTS — Equity Curve + Daily P&L
      ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3">
          <Panel title="Equity Curve" accent="var(--gr2)">
            <EquityCurveChart days={60} height={160} />
          </Panel>
        </div>
        <div className="lg:col-span-2">
          <Panel title="Daily P&L — 30 Days" accent="var(--ac)">
            <DailyPnLChart days={30} height={160} />
          </Panel>
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
          <Panel title="Markets" accent="var(--ac)" noPadding>
            <MarketOverview height={400} />
          </Panel>
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
