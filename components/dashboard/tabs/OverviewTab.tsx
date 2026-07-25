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
import { periodReturnPct, type ReturnEvent } from '@/lib/trading/returns'
import Panel                  from '@/components/ui/Panel'
import Icon                   from '@/components/ui/Icon'
import SessionClock           from '@/components/ui/SessionClock'
import { NetWorthCurve }      from './trading/NetWorthCurve'
import DailyPnLChart          from '@/components/ui/DailyPnLChart'
import { useUserProfile }     from '@/context/UserProfileContext'
import { useIsMobile, greeting, fmtEur, fmtPnl, fullDate } from './overview/helpers'
import { TradeCalendar } from './overview/TradeCalendar'
import { StreakCard, StreakBadge } from './overview/StreakCards'
import { WinRateCard } from './overview/WinRateCard'
import { TodaysFocus } from './overview/TodaysFocus'
import { EdgeReport } from './overview/EdgeReport'

// ── Metric tile ───────────────────────────────────────────────────────────────
// One shape for every hero figure: label, number, one line of context. The
// tiles used to differ in tint, border and line count, which made the row read
// as four unrelated widgets instead of one instrument cluster.

function MetricTile({ label, value, sub, aside, valueColor }: {
  label:       string
  value:       string
  sub:         string
  aside?:      string
  valueColor?: string
}) {
  return (
    <div className="metric-card" style={{
      padding: '16px', borderRadius: '12px',
      background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bd2)',
      display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0,
    }}>
      <span className="label-caps">{label}</span>
      <span className="num" style={{
        fontSize: 'clamp(16px, 3vw, 24px)', fontWeight: 600,
        color: valueColor ?? 'var(--t1)', lineHeight: 1,
      }}>
        {value}
      </span>
      <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
        {aside && <span style={{ display: 'block', fontSize: 'clamp(10px, 1.5vw, 11px)', color: 'var(--t2)' }}>{aside}</span>}
        <span style={{ display: 'block', fontSize: 'clamp(10px, 1.5vw, 11px)', color: 'var(--t3)' }}>{sub}</span>
      </div>
    </div>
  )
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
  const { profile }     = useUserProfile()
  const isMobile = useIsMobile()

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

  // Last 7 days of journal / habit activity — feeds the run strips next to each
  // streak number, so "0" still shows what the week looked like.
  const last7 = useMemo(() => {
    const out: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      out.push(d.toISOString().split('T')[0])
    }
    return out
  }, [])

  const journalDays = useMemo(
    () => last7.map(day => entries.some(e => e.entry_date === day)),
    [last7, entries])

  const habitDays = useMemo(
    () => last7.map(day => habits.length > 0 && habits.every(h => isCompleted(h.id, day))),
    [last7, habits, isCompleted])

  const insights = useMemo(() => generateInsights({
    trades: [...trades, ...allRows.filter(t => t.symbol === 'BALANCE')],
    holdings, journal: entries, tasks, accountBalance: balance, portfolioValue: totalValueEur,
  }), [trades, allRows, holdings, entries, tasks, balance, totalValueEur])

  const monthPnl = stats?.monthPnl ?? 0

  // Percent return is time-weighted, so it matches the Growth figure in
  // MetaTrader's own report. Dividing profit by a single balance disagrees with
  // the broker whenever money moved in or out mid-period. See lib/trading/returns.
  const monthPnlPct = useMemo(() => {
    const events: ReturnEvent[] = allRows
      .filter(t => t.close_time && new Date(t.close_time) >= monthStart)
      .map(t => ({
        at:     t.close_time!,
        amount: t.net_profit ?? 0,
        kind:   t.symbol === 'BALANCE' ? 'funding' : 'trade',
      }))
    return periodReturnPct({ endBalance: balance, events })
  }, [allRows, monthStart, balance])

  const bestHabitStreak = habits.length > 0 ? Math.max(...habits.map(h => calcStreak(h.id))) : 0

  const todayColor = todayPnl > 0 ? 'var(--gr2)' : todayPnl < 0 ? 'var(--re)' : 'var(--t2)'
  const monthColor = monthPnl >= 0 ? 'var(--gr2)' : 'var(--re)'

  // Must come AFTER every hook above: this used to return early on the second
  // line of the component, so crossing the 639px breakpoint changed the number
  // of hooks React saw between renders and threw.
  if (isMobile) return <MobileOverviewTab />

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 fade-in">

      {/* ══════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════ */}
      {/* No ambient colour washes behind the numbers — a terminal is read, not
          decorated. Colour is reserved for data (green/red P&L). */}
      <div className="hero-section" style={{
        position: 'relative', overflow: 'hidden',
        background: 'var(--s1)',
        border: '1px solid var(--bd2)',
        borderRadius: '16px', padding: '22px 24px 20px',
        boxShadow: 'var(--shadow-md)',
      }}>
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
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 500, color: 'var(--t2)' }}>
                  <Icon name="habit" size={12} />
                  {bestHabitStreak}d habits
                </span>
              )}
              {journalStreak >= 1 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 500, color: 'var(--t2)' }}>
                  <Icon name="journal" size={12} />
                  {journalStreak}d journal
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
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 600, color: 'var(--re)', background: 'rgba(255,61,80,0.08)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(255,61,80,0.2)' }}>
                <Icon name="alert" size={12} />
                {overdueTasks.length} overdue
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
            <MetricTile
              label="MT5 Balance"
              value={fmtEur(balance)}
              sub={`${wins}W / ${losses}L · ${stats?.totalTrades ?? 0} trades`}
              aside={equity > 0 && equity !== balance ? `Equity ${fmtEur(equity)}` : undefined}
            />

            {/* Today P&L */}
            <MetricTile
              label="Today P&L"
              value={todayPnl !== 0 ? fmtPnl(todayPnl) : '€0.00'}
              valueColor={todayColor}
              sub={todayPnl !== 0
                ? `${(balance > 0 ? todayPnl / (balance - todayPnl) * 100 : 0).toFixed(2)}% of balance`
                : 'No closed trades today'}
            />

            {/* Month P&L */}
            <MetricTile
              label="Month P&L"
              value={stats ? formatValue(monthPnl, monthPnlPct, displayMode, { showSign: true }) : '—'}
              valueColor={monthColor}
              sub={`${monthWins}W · ${monthLosses}L this month`}
            />

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
          <NetWorthCurve portfolioValue={totalValueEur} />
        </div>
        <div className="lg:col-span-2">
          <Panel title="Daily P&L" className="h-full">
            <DailyPnLChart days={30} height={130} showStats />
          </Panel>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          CALENDAR + STREAKS/FOCUS (equal-height row)
      ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">

        <div className="lg:col-span-2">
          <Panel title="Trading Calendar" className="h-full">
            <TradeCalendar allRows={allRows} />
          </Panel>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-5">
          <StreakCard
            trades={trades}
            journalStreak={journalStreak}
            habitStreak={bestHabitStreak}
            journalDays={journalDays}
            habitDays={habitDays}
          />
          <Panel title="Today's Focus" className="flex-1">
            <TodaysFocus allRows={allRows} />
          </Panel>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          EDGE REPORT — insights + hard numbers from the trade DB
      ══════════════════════════════════════════════════════════ */}
      <Panel
        title="Edge Report"
        action={insights.length > 0 ? (
          <span style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 500 }}>
            {insights.length} insight{insights.length !== 1 ? 's' : ''}
          </span>
        ) : undefined}
      >
        <EdgeReport allRows={allRows} insights={insights} loading={tradesLoading} />
      </Panel>

    </div>
  )
}
