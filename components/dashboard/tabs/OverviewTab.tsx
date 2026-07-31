'use client'

import { useMemo } from 'react'
import MobileOverviewTab from './MobileOverviewTab'
import { useTrades } from '@/hooks/useTrades'
import { useTasks }           from '@/hooks/useTasks'
import { useAccountSnapshot } from '@/hooks/useAccountSnapshot'
import { usePortfolio }       from '@/hooks/usePortfolio'
import { useJournalEntries }  from '@/hooks/useJournalEntries'
import { useHabits }          from '@/hooks/useHabits'
import { useDisplayMode }     from '@/context/DisplayModeContext'
import { generateInsights }   from '@/lib/intelligence'
import { formatValue }        from '@/lib/utils/formatting'
import { periodReturnPct, type ReturnEvent } from '@/lib/trading/returns'
import Icon                   from '@/components/ui/Icon'
import { Surface, MetricStrip, Label, Num } from '@/components/ui/vq'
import SessionClock           from '@/components/ui/SessionClock'
import DailyMaxLoss           from '@/components/ui/DailyMaxLoss'
import { NetWorthCurve }      from './trading/NetWorthCurve'
import { useUserProfile }     from '@/context/UserProfileContext'
import { useIsMobile, greeting, fmtEur, fmtPnl, fullDate } from './overview/helpers'
import { TradeCalendar } from './overview/TradeCalendar'
import { StreakCard, StreakBadge } from './overview/StreakCards'
import { TodaysFocus } from './overview/TodaysFocus'
import { EdgeReport } from './overview/EdgeReport'
import { useClassifier } from '@/context/UserProfileContext'

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
      padding: '16px', borderRadius: 'var(--radius-lg)',
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
  const { isWin, isLoss } = useClassifier()
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
  const monthWins   = monthTrades.filter(t => isWin(t)).length
  const monthLosses = monthTrades.filter(t => isLoss(t)).length

  const wins   = trades.filter(t => isWin(t)).length
  const losses = trades.filter(t => isLoss(t)).length

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
  const payoff = stats && stats.avgLoss > 0 ? stats.avgWin / stats.avgLoss : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="fade-in">

      {/* ── Status line ──────────────────────────────────────────────────────
          The old hero spent ~180px on a greeting and a date. A terminal opens
          with the account, not with a salutation — this is one 26px line. */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '16px', flexWrap: 'wrap', minHeight: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
          <Label>{fullDate()}</Label>
          <SessionClock />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {habits.length > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Label>Habits</Label>
              <Num size="xs" tone={todayCompleted === todayTotal ? 'up' : 'muted'}>
                {todayCompleted}/{todayTotal}
              </Num>
            </span>
          )}
          {journalStreak >= 1 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--color-ink-3)' }}>
              <Icon name="journal" size={11} />
              <Num size="xs" tone="muted">{journalStreak}d</Num>
            </span>
          )}
          <StreakBadge trades={trades} />
          {overdueTasks.length > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '2px 8px', borderRadius: 'var(--radius-sm)',
              background: 'var(--color-down-dim)', color: 'var(--color-down)',
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)',
            }}>
              <Icon name="alert" size={11} />
              {overdueTasks.length} overdue
            </span>
          )}
        </div>
      </div>

      {/* ── Instrument cluster ───────────────────────────────────────────────
          Five figures in the height one padded card used to take. */}
      <div data-tour="stat-strip">
      <MetricStrip metrics={[
        {
          label: 'MT5 Balance',
          value: fmtEur(balance),
          tone:  'neutral',
          meta:  equity > 0 && equity !== balance ? `Equity ${fmtEur(equity)}` : `${stats?.totalTrades ?? 0} trades`,
        },
        {
          label: 'Month',
          value: stats ? formatValue(monthPnl, monthPnlPct, displayMode, { showSign: true }) : '—',
          num:   monthPnl,
          meta:  `${monthWins}W · ${monthLosses}L`,
        },
        {
          label: 'Today',
          value: todayPnl !== 0 ? fmtPnl(todayPnl) : '€0.00',
          num:   todayPnl,
          tone:  todayPnl === 0 ? 'muted' : 'auto',
          meta:  todayPnl !== 0
            ? `${(balance > 0 ? todayPnl / (balance - todayPnl) * 100 : 0).toFixed(2)}% of balance`
            : 'No closed trades',
        },
        {
          label: 'Win rate',
          value: `${wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : '0.0'}%`,
          tone:  'neutral',
          meta:  `${wins}W / ${losses}L decided`,
        },
        {
          label: 'Payoff',
          value: payoff > 0 ? payoff.toFixed(2) : '—',
          tone:  payoff >= 1 ? 'up' : payoff > 0 ? 'down' : 'muted',
          meta:  stats ? `€${stats.avgWin.toFixed(0)} / €${stats.avgLoss.toFixed(0)} avg` : '',
        },
      ]} />
      </div>

      {/* ── Net worth ────────────────────────────────────────────────────── */}
      <NetWorthCurve portfolioValue={totalValueEur} />

      {/* ── Calendar + right rail ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '12px', alignItems: 'start' }}>
        <Surface title="Trading calendar" data-tour="calendar">
          <div style={{ padding: '12px 14px' }}>
            <TradeCalendar allRows={allRows} />
          </div>
        </Surface>

        <div data-tour="streaks" style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
          <StreakCard
            trades={trades}
            journalStreak={journalStreak}
            habitStreak={bestHabitStreak}
            journalDays={journalDays}
            habitDays={habitDays}
          />
          {/* The risk gauge was mobile-only, so the limit could not be set from
              a desktop at all. It is the same control on both. */}
          <Surface title="Daily risk">
            <div style={{ padding: '12px 14px' }}>
              <DailyMaxLoss allRows={allRows} balance={balance} />
            </div>
          </Surface>
          <Surface title="Today's focus">
            <div style={{ padding: '12px 14px' }}>
              <TodaysFocus allRows={allRows} />
            </div>
          </Surface>
        </div>
      </div>

      {/* ── Edge report ──────────────────────────────────────────────────── */}
      <Surface
        title="Edge report"
        action={insights.length > 0
          ? <Label>{insights.length} insight{insights.length !== 1 ? 's' : ''}</Label>
          : undefined}
      >
        <div style={{ padding: '12px 14px' }}>
          <EdgeReport allRows={allRows} insights={insights} loading={tradesLoading} />
        </div>
      </Surface>

    </div>
  )
}
