'use client'

import { useMemo } from 'react'
import { useTrades }          from '@/hooks/useTrades'
import { useTasks }           from '@/hooks/useTasks'
import { useAccountSnapshot } from '@/hooks/useAccountSnapshot'
import { usePortfolio }       from '@/hooks/usePortfolio'
import { useJournalEntries }  from '@/hooks/useJournalEntries'
import { useDisplayMode }     from '@/context/DisplayModeContext'
import { generateInsights }   from '@/lib/intelligence'
import { formatValue }        from '@/lib/utils/formatting'
import InsightCard            from '@/components/ui/InsightCard'
import Panel                  from '@/components/ui/Panel'

const MOOD_COLOR: Record<string, string> = {
  great: 'var(--gr2)', good: 'var(--gr2)', neutral: 'var(--am2)', low: 'var(--re)', bad: 'var(--re)',
}
const MOOD_DOT: Record<string, string> = {
  great: '#56d364', good: '#56d364', neutral: '#e3b341', low: '#f97583', bad: '#f97583',
}

function fmtPnl(n: number): string {
  return `${n >= 0 ? '+' : '-'}€${Math.abs(n).toFixed(2)}`
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)    return `${s}s ago`
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function OverviewTab() {
  const today = new Date().toISOString().split('T')[0]
  const { trades, allRows, stats, loading: tradesLoading } = useTrades(500)
  const { tasks }          = useTasks()
  const { snapshot }       = useAccountSnapshot()
  const { holdings, totalValueEur, totalPnlEur, totalPnlPct } = usePortfolio()
  const { entries }        = useJournalEntries()
  const { displayMode }    = useDisplayMode()

  const balance = snapshot?.balance ?? 0

  const todayPnl = useMemo(() =>
    allRows
      .filter(t => t.close_time && t.close_time.startsWith(today) && t.symbol !== 'BALANCE')
      .reduce((s, t) => s + (t.net_profit ?? 0), 0),
  [allRows, today])

  const monthStart  = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const monthTrades = trades.filter(t => t.close_time && new Date(t.close_time) >= monthStart)
  const monthWins   = monthTrades.filter(t => (t.net_profit ?? 0) > 0).length
  const monthLosses = monthTrades.length - monthWins

  const journalStreak = useMemo(() => {
    let streak = 0
    const d = new Date(today)
    for (let i = 0; i < 60; i++) {
      const key = d.toISOString().split('T')[0]
      if (entries.some(e => e.entry_date === key)) { streak++; d.setDate(d.getDate() - 1) }
      else break
    }
    return streak
  }, [entries, today])

  const openTasks    = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled')
  const overdueTasks = tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'done' && t.status !== 'cancelled')
  const todayTasks   = tasks.filter(t => t.due_date === today && t.status !== 'cancelled').slice(0, 3)

  const bestSymbol = (stats?.xauWinRate ?? 0) >= (stats?.nasWinRate ?? 0)
    ? `Gold ${stats?.xauWinRate ?? 0}%`
    : `Nasdaq ${stats?.nasWinRate ?? 0}%`

  const lastEntry = [...entries].sort((a, b) => b.entry_date.localeCompare(a.entry_date))[0] ?? null

  const insights = useMemo(() => generateInsights({
    trades:         [...trades, ...allRows.filter(t => t.symbol === 'BALANCE')],
    holdings,
    journal:        entries,
    tasks,
    accountBalance: balance,
    portfolioValue: totalValueEur,
  }), [trades, allRows, holdings, entries, tasks, balance, totalValueEur])

  const topInsight   = insights[0] ?? null
  const netWorth     = balance + totalValueEur
  const todayPnlPct  = balance > 0 ? (todayPnl / balance) * 100 : 0
  const monthPnlPct  = balance > 0 ? ((stats?.monthPnl ?? 0) / balance) * 100 : 0

  const card = {
    background: 'var(--s1)', border: '1px solid var(--bd)',
    borderRadius: '12px', padding: '16px',
    display: 'flex', flexDirection: 'column' as const, gap: '8px',
  }

  return (
    <div className="flex flex-col gap-4">

      {/* ── Section 1: Financial pillars ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        <div style={card}>
          <p style={{ fontSize: '11px', color: 'var(--t3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>MT5 Balance</p>
          <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.02em' }}>
            €{balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p style={{ fontSize: '12px', fontWeight: 500, color: todayPnl >= 0 ? 'var(--gr2)' : 'var(--re)' }}>
            {formatValue(todayPnl, todayPnlPct, displayMode, { showSign: true })} today
          </p>
          <div style={{ height: '3px', borderRadius: '2px', background: 'var(--s3)', marginTop: '4px' }}>
            <div style={{ height: '100%', width: '60%', background: 'var(--ac)', borderRadius: '2px' }} />
          </div>
        </div>

        <div style={card}>
          <p style={{ fontSize: '11px', color: 'var(--t3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Portfolio</p>
          <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.02em' }}>
            €{totalValueEur.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p style={{ fontSize: '12px', fontWeight: 500, color: totalPnlEur >= 0 ? 'var(--gr2)' : 'var(--re)' }}>
            {formatValue(totalPnlEur, totalPnlPct, displayMode, { showSign: true })} total
          </p>
          <div style={{ height: '3px', borderRadius: '2px', background: 'var(--s3)', marginTop: '4px' }}>
            <div style={{ height: '100%', width: `${Math.min(100, Math.max(4, 50 + totalPnlPct))}%`, background: 'var(--go2)', borderRadius: '2px' }} />
          </div>
        </div>

        <div style={card}>
          <p style={{ fontSize: '11px', color: 'var(--t3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Net Worth</p>
          <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.02em' }}>
            €{netWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--t3)' }}>Trading + Portfolio</p>
          <div style={{ height: '3px', borderRadius: '2px', background: 'var(--s3)', marginTop: '4px' }}>
            <div style={{ height: '100%', width: `${netWorth > 0 ? Math.min(96, (balance / netWorth) * 100) : 50}%`, background: 'var(--gr)', borderRadius: '2px' }} />
          </div>
        </div>

        <div style={card}>
          <p style={{ fontSize: '11px', color: 'var(--t3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Month P&L</p>
          <p style={{
            fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em',
            color: (stats?.monthPnl ?? 0) >= 0 ? 'var(--gr2)' : 'var(--re)',
          }}>
            {stats ? formatValue(stats.monthPnl, monthPnlPct, displayMode, { showSign: true }) : '—'}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--t3)' }}>{monthWins}W / {monthLosses}L this month</p>
          <div style={{ height: '3px', borderRadius: '2px', background: 'var(--s3)', marginTop: '4px' }}>
            <div style={{
              height: '100%',
              width: `${monthTrades.length > 0 ? (monthWins / monthTrades.length) * 100 : 0}%`,
              background: (stats?.monthPnl ?? 0) >= 0 ? 'var(--am)' : 'var(--re)',
              borderRadius: '2px',
            }} />
          </div>
        </div>
      </div>

      {/* ── Section 2: Quick chips ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { label: 'Win rate',   value: stats ? `${stats.winRate}%` : '—' },
          { label: 'Best',       value: stats ? bestSymbol : '—' },
          { label: 'Journal',    value: journalStreak > 0 ? `${journalStreak} day streak${journalStreak >= 7 ? ' 🔥' : ''}` : 'No streak' },
          { label: 'Open tasks', value: `${openTasks.length} remaining${overdueTasks.length > 0 ? ` · ${overdueTasks.length} overdue` : ''}` },
        ].map(chip => (
          <div key={chip.label} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'var(--s1)', border: '1px solid var(--bd)',
            borderRadius: '8px', padding: '5px 12px',
          }}>
            <span style={{ fontSize: '11px', color: 'var(--t3)' }}>{chip.label}</span>
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--t1)' }}>{chip.value}</span>
          </div>
        ))}
      </div>

      {/* ── Section 3 + 4: Insight + Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <div className="lg:col-span-1">
          <Panel title="Jarvis Intelligence" action={
            <span style={{ color: 'var(--go2)', fontSize: '11px', cursor: 'pointer' }}>View all →</span>
          }>
            {topInsight ? (
              <div style={{ margin: '-16px' }}>
                <div style={{ padding: '16px' }}>
                  <InsightCard insight={topInsight} />
                </div>
                {insights.length > 1 && (
                  <div style={{
                    borderTop: '1px solid var(--bd)', padding: '10px 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <span style={{ color: 'var(--t3)', fontSize: '11px' }}>
                      {insights.length - 1} more insight{insights.length > 2 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: 'var(--t3)', fontSize: '12px' }}>
                {tradesLoading ? 'Analysing…' : 'Sync MT5 to generate insights.'}
              </p>
            )}
          </Panel>
        </div>

        <div className="lg:col-span-2">
          <Panel title="Recent Activity" noPadding>
            <div className="grid grid-cols-1 lg:grid-cols-3">

              {/* Last 3 trades */}
              <div style={{ borderRight: '1px solid var(--bd)', padding: '14px' }}>
                <p style={{ fontSize: '11px', color: 'var(--t3)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '10px' }}>Recent Trades</p>
                {tradesLoading ? <p style={{ color: 'var(--t3)', fontSize: '12px' }}>Loading…</p>
                  : trades.length === 0 ? <p style={{ color: 'var(--t3)', fontSize: '12px' }}>No trades yet</p>
                  : trades.slice(0, 3).map(trade => (
                    <div key={trade.id} className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
                      <div>
                        <span style={{ color: 'var(--t1)', fontSize: '12px', fontWeight: 500 }}>{trade.symbol}</span>
                        <span style={{
                          marginLeft: '5px', fontSize: '10px', padding: '1px 5px', borderRadius: '3px',
                          background: trade.trade_type === 'buy' ? 'rgba(88,166,255,0.15)' : 'rgba(163,113,247,0.15)',
                          color: trade.trade_type === 'buy' ? 'var(--ac)' : '#a371f7',
                        }}>{trade.trade_type.toUpperCase()}</span>
                      </div>
                      <div className="text-right">
                        <p style={{ fontSize: '12px', fontWeight: 600, color: (trade.net_profit ?? 0) >= 0 ? 'var(--gr2)' : 'var(--re)' }}>
                          {fmtPnl(trade.net_profit ?? 0)}
                        </p>
                        <p style={{ fontSize: '10px', color: 'var(--t3)' }}>
                          {trade.close_time ? timeAgo(trade.close_time) : '—'}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Last journal entry */}
              <div style={{ borderRight: '1px solid var(--bd)', padding: '14px' }}>
                <p style={{ fontSize: '11px', color: 'var(--t3)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '10px' }}>Last Journal</p>
                {lastEntry ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      {lastEntry.mood && (
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: MOOD_DOT[lastEntry.mood] }} />
                      )}
                      <span style={{ fontSize: '11px', color: 'var(--t3)' }}>{lastEntry.entry_date}</span>
                      {lastEntry.mood && (
                        <span style={{ fontSize: '11px', color: MOOD_COLOR[lastEntry.mood] }}>{lastEntry.mood}</span>
                      )}
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--t2)', lineHeight: '1.5' }}>
                      {(lastEntry.body_text ?? '').slice(0, 120)}{(lastEntry.body_text ?? '').length > 120 ? '…' : ''}
                    </p>
                    {lastEntry.entry_date !== today && (
                      <p style={{ fontSize: '11px', color: 'var(--am2)' }}>No entry today</p>
                    )}
                  </div>
                ) : (
                  <p style={{ color: 'var(--t3)', fontSize: '12px', fontStyle: 'italic' }}>Start journaling.</p>
                )}
              </div>

              {/* Today's tasks */}
              <div style={{ padding: '14px' }}>
                <p style={{ fontSize: '11px', color: 'var(--t3)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '10px' }}>Today's Tasks</p>
                {todayTasks.length > 0 ? todayTasks.map(task => (
                  <div key={task.id} className="flex items-start gap-2" style={{ marginBottom: '8px' }}>
                    <div style={{
                      width: '13px', height: '13px', borderRadius: '3px', flexShrink: 0, marginTop: '2px',
                      border: `1.5px solid ${task.status === 'done' ? 'var(--gr2)' : 'var(--bd2)'}`,
                      background: task.status === 'done' ? 'var(--gr)' : 'transparent',
                    }} />
                    <span style={{
                      fontSize: '12px', lineHeight: '1.4',
                      color: task.due_date && task.due_date < today && task.status !== 'done' ? 'var(--re)' : task.status === 'done' ? 'var(--t3)' : 'var(--t2)',
                      textDecoration: task.status === 'done' ? 'line-through' : 'none',
                    }}>{task.title}</span>
                  </div>
                )) : (
                  <p style={{ color: 'var(--t3)', fontSize: '12px' }}>No tasks due today.</p>
                )}
                {openTasks.length > 3 && (
                  <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '6px' }}>+{openTasks.length - 3} more</p>
                )}
              </div>

            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
