'use client'

import { useMemo, useState, useEffect } from 'react'
import { useTrades } from '@/hooks/useTrades'
import { useTasks }           from '@/hooks/useTasks'
import { useAccountSnapshot } from '@/hooks/useAccountSnapshot'
import { usePortfolio }       from '@/hooks/usePortfolio'
import { useJournalEntries }  from '@/hooks/useJournalEntries'
import { useHabits }          from '@/hooks/useHabits'
import { useDisplayMode }     from '@/context/DisplayModeContext'
import { useUserProfile }     from '@/context/UserProfileContext'
import { generateInsights }   from '@/lib/intelligence'
import { formatValue }        from '@/lib/utils/formatting'
import { periodReturnPct, type ReturnEvent } from '@/lib/trading/returns'
import { Surface, MetricStrip, Label, Num } from '@/components/ui/vq'
import InsightCard            from '@/components/ui/InsightCard'
import { NetWorthCurve }      from './trading/NetWorthCurve'
import { buildEdgeFacts, Fact } from './overview/EdgeReport'
import SessionClock           from '@/components/ui/SessionClock'
import DailyMaxLoss           from '@/components/ui/DailyMaxLoss'
import AdSlot                 from '@/components/dashboard/AdSlot'
import type { Trade }         from '@/types'
import Icon from '@/components/ui/Icon'
import { habitIcon } from './discipline/habitIcon'
import { useClassifier } from '@/context/UserProfileContext'

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

// ── Main ──────────────────────────────────────────────────────────────────────

export default function MobileOverviewTab() {
  const { isWin, isLoss } = useClassifier()
  const today = new Date().toISOString().split('T')[0]
  const [dailyLimit, setDailyLimit] = useState(200)

  useEffect(() => {
    const stored = localStorage.getItem('velquor-daily-limit')
    if (stored) setDailyLimit(parseFloat(stored) || 200)
    const handler = () => {
      const v = localStorage.getItem('velquor-daily-limit')
      if (v) setDailyLimit(parseFloat(v) || 200)
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const { profile } = useUserProfile()
  const { trades, allRows, stats, loading: tradesLoading } = useTrades(500)
  const { tasks }       = useTasks()
  const { snapshot }    = useAccountSnapshot()
  const { holdings, totalValueEur } = usePortfolio()
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

  const todayLossAmt = Math.max(0, -todayPnl)

  const monthStart  = useMemo(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1), [])
  const monthTrades = useMemo(() => trades.filter(t => t.close_time && new Date(t.close_time) >= monthStart), [trades, monthStart])
  const monthWins   = monthTrades.filter(t => isWin(t)).length
  const monthLosses = monthTrades.filter(t => isLoss(t)).length

  const wins   = trades.filter(t => isWin(t)).length
  const losses = trades.filter(t => isLoss(t)).length
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
  const todayTasks   = tasks.filter(t => t.due_date === today && t.status !== 'cancelled').slice(0, 4)
  const highPriTasks = openTasks.filter(t => t.priority === 'high').slice(0, 4)
  const focusTasks   = todayTasks.length > 0 ? todayTasks : highPriTasks

  const insights = useMemo(() => generateInsights({
    trades: [...trades, ...allRows.filter(t => t.symbol === 'BALANCE')],
    holdings, journal: entries, tasks, accountBalance: balance, portfolioValue: totalValueEur,
  }), [trades, allRows, holdings, entries, tasks, balance, totalValueEur])

  // Edge Report is day-trading only — portfolio/journal/task insights live in their tabs
  const edgeInsights = useMemo(() => insights.filter(i => i.source === 'trades'), [insights])
  const edgeFacts    = useMemo(() => buildEdgeFacts(allRows), [allRows])

  const monthPnl    = stats?.monthPnl ?? 0
  // Time-weighted, so it matches MetaTrader's Growth — see lib/trading/returns
  const monthPnlPct = useMemo(() => {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const events: ReturnEvent[] = allRows
      .filter(t => t.close_time && new Date(t.close_time) >= monthStart)
      .map(t => ({
        at:     t.close_time!,
        amount: t.net_profit ?? 0,
        kind:   t.symbol === 'BALANCE' ? 'funding' : 'trade',
      }))
    return periodReturnPct({ endBalance: balance, events })
  }, [allRows, balance])

  const todayColor = todayPnl > 0 ? 'var(--gr2)' : todayPnl < 0 ? 'var(--re)' : 'var(--t2)'
  const monthColor = monthPnl >= 0 ? 'var(--gr2)' : 'var(--re)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '80px' }}>

      {/* ── Status line ────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <Label>{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</Label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {habits.length > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Label>Habits</Label>
              <Num size="xs" tone={todayCompleted === todayTotal ? 'up' : 'muted'}>{todayCompleted}/{todayTotal}</Num>
            </span>
          )}
          {journalStreak >= 1 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--color-ink-3)' }}>
              <Icon name="journal" size={11} />
              <Num size="xs" tone="muted">{journalStreak}d</Num>
            </span>
          )}
          {overdueTasks.length > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '2px 7px', borderRadius: 'var(--radius-sm)',
              background: 'var(--color-down-dim)', color: 'var(--color-down)',
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)',
            }}>
              <Icon name="alert" size={11} /> {overdueTasks.length}
            </span>
          )}
        </div>
      </div>

      <Surface><div style={{ padding: '9px 12px' }}><SessionClock /></div></Surface>

      {/* Free-tier house ad (mobile has no side rail) — hidden for paid users */}
      <AdSlot seed={2} />

      {/* ── Instrument cluster ─────────────────────────────────────
          Two bands of three instead of four tinted tiles: same figures,
          roughly half the vertical space, one surface treatment. */}
      <div data-tour="stat-strip">
      <MetricStrip metrics={[
        { label: 'MT5 Balance', value: fmtEur(balance, 0), tone: 'neutral',
          meta: equity > 0 && equity !== balance ? `Eq ${fmtEur(equity, 0)}` : `${wins}W/${losses}L` },
        { label: 'Month', value: stats ? formatValue(monthPnl, monthPnlPct, displayMode, { showSign: true }) : '—',
          num: monthPnl, meta: `${monthWins}W · ${monthLosses}L` },
        { label: 'Today', value: todayPnl !== 0 ? fmtPnl(todayPnl) : '€0',
          num: todayPnl, tone: todayPnl === 0 ? 'muted' : 'auto',
          meta: todayPnl !== 0 ? `${(balance > 0 ? todayPnl / (balance - todayPnl) * 100 : 0).toFixed(2)}%` : 'No trades' },
      ]} />
      </div>

      <MetricStrip metrics={[
        { label: 'Net worth', value: fmtEur(netWorth, 0), tone: 'neutral', meta: 'MT5 + portfolio' },
        { label: 'Win rate', value: `${wr.toFixed(1)}%`, tone: 'neutral', meta: `${wins}W / ${losses}L` },
        { label: 'Trades', value: String(stats?.totalTrades ?? 0), tone: 'muted', meta: 'all time' },
      ]} />

      {/* ── Net Worth (MT5 balance + portfolio, over time) ── */}
      <NetWorthCurve portfolioValue={totalValueEur} />

      {/* ── Daily Max Loss ─────────────────────────────────────── */}
      <div style={{ padding: '14px 16px', background: 'var(--s1)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(240,80,75,0.15)' }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '10px' }}>Daily Risk</span>
        <DailyMaxLoss allRows={allRows} balance={balance} />
      </div>

      {/* ── Today's Focus ──────────────────────────────────────── */}
      {(habits.length > 0 || focusTasks.length > 0) && (
        <div style={{ padding: '14px 16px', background: 'var(--s1)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--bd2)' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--am2)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '12px' }}>Today's Focus</span>

          {habits.length > 0 && (
            <>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>
                Habits · {todayCompleted}/{todayTotal}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: focusTasks.length > 0 ? '14px' : '0' }}>
                {habits.slice(0, 5).map(h => {
                  const done = isCompleted(h.id, today)
                  return (
                    <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                        background: done ? 'var(--gr)' : 'transparent',
                        border: `2px solid ${done ? 'var(--gr2)' : 'var(--bd2)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {done && <Icon name="check" size={10} style={{ color: 'var(--color-void)' }} strokeWidth={2.5} />}
                      </div>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: 'var(--text-base)', color: done ? 'var(--t3)' : 'var(--t2)', textDecoration: done ? 'line-through' : 'none' }}>
                        <Icon name={habitIcon(h.icon)} size={12} />
                        {h.name}
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {habits.length > 0 && focusTasks.length > 0 && (
            <div style={{ height: '1px', background: 'var(--bd)', marginBottom: '14px' }} />
          )}

          {focusTasks.length > 0 && (
            <>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>
                {todayTasks.length > 0 ? 'Due Today' : 'High Priority'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {focusTasks.map(task => {
                  const overdue = task.due_date && task.due_date < today && task.status !== 'done'
                  return (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px' }}>
                      <div style={{
                        width: '16px', height: '16px', borderRadius: 'var(--radius-sm)', flexShrink: 0, marginTop: '2px',
                        background: task.status === 'done' ? 'var(--gr)' : 'transparent',
                        border: `2px solid ${task.status === 'done' ? 'var(--gr2)' : overdue ? 'var(--re)' : 'var(--bd2)'}`,
                      }} />
                      <span style={{ fontSize: 'var(--text-base)', lineHeight: 1.45, color: overdue ? 'var(--re)' : 'var(--t2)', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
                        {task.title}
                      </span>
                    </div>
                  )
                })}
              </div>
              {openTasks.length > focusTasks.length && (
                <p className="vq-num" style={{ fontSize: 'var(--text-base)', color: 'var(--t3)', marginTop: '8px' }}>+{openTasks.length - focusTasks.length} more open</p>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Edge Report — day-trading insights + hard numbers ───── */}
      {(edgeInsights.length > 0 || edgeFacts.length > 0) && (
        <div style={{ padding: '14px 16px', background: 'var(--s1)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.15)' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--go2)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '10px' }}>
            Edge Report
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {edgeInsights.slice(0, 3).map(i => <InsightCard key={i.id} insight={i} compact />)}
          </div>
          {edgeFacts.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: edgeInsights.length > 0 ? '10px' : 0 }}>
              {edgeFacts.slice(0, 6).map((f, i) => <Fact key={i} {...f} />)}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
