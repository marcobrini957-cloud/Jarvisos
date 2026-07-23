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
import Panel                  from '@/components/ui/Panel'
import SessionClock           from '@/components/ui/SessionClock'
import EquityCurveChart       from '@/components/ui/EquityCurveChart'
import DailyPnLChart          from '@/components/ui/DailyPnLChart'
import { useUserProfile }     from '@/context/UserProfileContext'
import { useIsMobile, greeting, fmtEur, fmtPnl, fullDate } from './overview/helpers'
import { TradeCalendar } from './overview/TradeCalendar'
import { StreakCard, StreakBadge } from './overview/StreakCards'
import { WinRateCard } from './overview/WinRateCard'
import { TodaysFocus } from './overview/TodaysFocus'
import { EdgeReport } from './overview/EdgeReport'

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
  const { profile }     = useUserProfile()
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

  const overdueTasks = tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'done' && t.status !== 'cancelled')

  const insights = useMemo(() => generateInsights({
    trades: [...trades, ...allRows.filter(t => t.symbol === 'BALANCE')],
    holdings, journal: entries, tasks, accountBalance: balance, portfolioValue: totalValueEur,
  }), [trades, allRows, holdings, entries, tasks, balance, totalValueEur])

  const monthPnl    = stats?.monthPnl ?? 0
  const monthPnlPct = balance > 0 ? (monthPnl / balance) * 100 : 0

  const bestHabitStreak = habits.length > 0 ? Math.max(...habits.map(h => calcStreak(h.id))) : 0

  const todayColor = todayPnl > 0 ? 'var(--gr2)' : todayPnl < 0 ? 'var(--re)' : 'var(--t2)'
  const monthColor = monthPnl >= 0 ? 'var(--gr2)' : 'var(--re)'

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 fade-in">

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
              {greeting()}, {profile.display_name || 'Trader'}
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

            {/* Win Rate — period-switchable */}
            <WinRateCard trades={trades} />

          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          CHARTS — Equity Curve + Daily P&L (equal-height row)
      ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-stretch">
        <div className="lg:col-span-3">
          <Panel title="Net Worth" accent="var(--gr2)" className="h-full">
            <EquityCurveChart days={30} height={130} showStats portfolioValue={totalValueEur} />
          </Panel>
        </div>
        <div className="lg:col-span-2">
          <Panel title="Daily P&L — 30 Days" accent="var(--ac)" className="h-full">
            <DailyPnLChart days={30} height={130} showStats />
          </Panel>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          CALENDAR + STREAKS/FOCUS (equal-height row)
      ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">

        <div className="lg:col-span-2">
          <Panel title="Daily P&L Calendar" accent="var(--gr)" className="h-full">
            <TradeCalendar allRows={allRows} />
          </Panel>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-5">
          <StreakCard trades={trades} journalStreak={journalStreak} habitStreak={bestHabitStreak} />
          <Panel title="Today's Focus" accent="var(--am2)" className="flex-1">
            <TodaysFocus allRows={allRows} />
          </Panel>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          EDGE REPORT — insights + hard numbers from the trade DB
      ══════════════════════════════════════════════════════════ */}
      <Panel
        title="Edge Report"
        accent="var(--go2)"
        action={insights.length > 0 ? (
          <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', background: 'rgba(255,176,48,0.1)', color: 'var(--go2)', fontWeight: 600, border: '1px solid rgba(255,176,48,0.2)' }}>
            {insights.length} insight{insights.length !== 1 ? 's' : ''}
          </span>
        ) : undefined}
      >
        <EdgeReport allRows={allRows} insights={insights} loading={tradesLoading} />
      </Panel>

    </div>
  )
}
