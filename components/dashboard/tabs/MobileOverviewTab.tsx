'use client'

import { useMemo, useState, useEffect } from 'react'
import { useTrades, BE_THRESHOLD } from '@/hooks/useTrades'
import { useTasks }           from '@/hooks/useTasks'
import { useAccountSnapshot } from '@/hooks/useAccountSnapshot'
import { usePortfolio }       from '@/hooks/usePortfolio'
import { useJournalEntries }  from '@/hooks/useJournalEntries'
import { useHabits }          from '@/hooks/useHabits'
import { useDisplayMode }     from '@/context/DisplayModeContext'
import { useUserProfile }     from '@/context/UserProfileContext'
import { generateInsights }   from '@/lib/intelligence'
import { formatValue }        from '@/lib/utils/formatting'
import InsightCard            from '@/components/ui/InsightCard'
import { EquityCurve }        from './trading/EquityCurve'
import DailyPnLChart          from '@/components/ui/DailyPnLChart'
import { buildEdgeFacts, Fact } from './overview/EdgeReport'
import SessionClock           from '@/components/ui/SessionClock'
import DailyMaxLoss           from '@/components/ui/DailyMaxLoss'
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

// ── Win Rate Ring ─────────────────────────────────────────────────────────────

function WinRing({ wr }: { wr: number }) {
  const pct   = Math.min(100, Math.max(0, wr))
  const color = pct >= 65 ? 'var(--gr2)' : pct >= 50 ? 'var(--am2)' : 'var(--re)'
  const glow  = pct >= 65 ? 'rgba(0,232,122,0.45)' : pct >= 50 ? 'rgba(240,168,64,0.45)' : 'rgba(255,61,80,0.45)'
  const deg   = (pct / 100) * 360
  return (
    <div style={{ position: 'relative', width: '52px', height: '52px', flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `conic-gradient(${color} ${deg}deg, var(--s3) ${deg}deg)`, boxShadow: `0 0 12px ${glow}` }} />
      <div style={{ position: 'absolute', inset: '7px', borderRadius: '50%', background: 'var(--s1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color, fontSize: '12px', fontWeight: 700 }}>{pct.toFixed(0)}%</span>
      </div>
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = 'var(--t1)', bg = 'rgba(255,255,255,0.03)', border = 'var(--bd2)', accent }: {
  label: string; value: string; sub?: string; color?: string; bg?: string; border?: string; accent?: string
}) {
  return (
    <div style={{
      padding: '14px', background: bg, borderRadius: '14px',
      border: `1px solid ${border}`,
      borderLeft: accent ? `3px solid ${accent}` : undefined,
      display: 'flex', flexDirection: 'column', gap: '4px',
    }}>
      <span style={{ fontSize: '10px', color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: '22px', fontWeight: 700, color, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</span>
      {sub && <span style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '2px' }}>{sub}</span>}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function MobileOverviewTab() {
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
  const monthPnlPct = balance > 0 ? (monthPnl / balance) * 100 : 0

  const todayColor = todayPnl > 0 ? 'var(--gr2)' : todayPnl < 0 ? 'var(--re)' : 'var(--t2)'
  const monthColor = monthPnl >= 0 ? 'var(--gr2)' : 'var(--re)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '80px' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--s1)', border: '1px solid var(--bd2)',
        borderRadius: '16px', padding: '18px 16px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div className="ambient-blue" style={{ width: '200px', height: '200px', top: '-80px', right: '-20px', opacity: 0.3 }} />
        <div style={{ position: 'relative' }}>

          {/* Date + habits + streak */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', color: 'var(--t3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {habits.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--t3)' }}>{todayCompleted}/{todayTotal}</span>
                  {habits.slice(0, 5).map(h => {
                    const done = isCompleted(h.id, today)
                    return <div key={h.id} style={{ width: '7px', height: '7px', borderRadius: '50%', background: done ? 'var(--gr2)' : 'var(--s3)', border: `1px solid ${done ? 'var(--gr)' : 'var(--bd2)'}` }} />
                  })}
                </div>
              )}
              {journalStreak >= 1 && (
                <span style={{ fontSize: '12px', fontWeight: 700, color: journalStreak >= 7 ? 'var(--go2)' : 'var(--gr2)' }}>
                  {journalStreak >= 7 ? '🔥' : '✓'} {journalStreak}d
                </span>
              )}
            </div>
          </div>

          {/* Greeting */}
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '6px' }}>
            {greeting()}, {profile.display_name || 'Trader'}
          </h1>

          {/* Alert badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
            {overdueTasks.length > 0 && (
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--re)', background: 'rgba(255,61,80,0.1)', padding: '3px 9px', borderRadius: '6px', border: '1px solid rgba(255,61,80,0.2)' }}>
                ⚠ {overdueTasks.length} overdue
              </span>
            )}
          </div>

          {/* Session clock */}
          <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.025)', borderRadius: '10px', border: '1px solid var(--bd2)' }}>
            <SessionClock />
          </div>
        </div>
      </div>

      {/* ── Balance + Today P&L (2 col) ────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <StatCard
          label="MT5 Balance"
          value={fmtEur(balance, 0)}
          sub={equity > 0 && equity !== balance ? `Eq ${fmtEur(equity, 0)}` : `${wins}W / ${losses}L`}
        />
        <StatCard
          label="Today P&L"
          value={todayPnl !== 0 ? fmtPnl(todayPnl) : '€0'}
          sub={todayPnl !== 0 ? `${(balance > 0 ? todayPnl / balance * 100 : 0).toFixed(2)}%` : 'No trades today'}
          color={todayColor}
          bg={todayPnl !== 0 ? `rgba(${todayPnl > 0 ? '0,232,122' : '255,61,80'},0.07)` : 'rgba(255,255,255,0.03)'}
          border={todayPnl !== 0 ? (todayPnl > 0 ? 'rgba(0,232,122,0.18)' : 'rgba(255,61,80,0.18)') : 'var(--bd2)'}
          accent={todayColor}
        />
      </div>

      {/* ── Month P&L + Net Worth (2 col) ──────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <StatCard
          label="Month P&L"
          value={stats ? formatValue(monthPnl, monthPnlPct, displayMode, { showSign: true }) : '—'}
          sub={`${monthWins}W · ${monthLosses}L`}
          color={monthColor}
          bg={`rgba(${monthPnl >= 0 ? '0,232,122' : '255,61,80'},0.06)`}
          border={monthPnl >= 0 ? 'rgba(0,232,122,0.15)' : 'rgba(255,61,80,0.15)'}
        />
        <StatCard
          label="Net Worth"
          value={fmtEur(netWorth, 0)}
          sub="MT5 + portfolio"
          color="var(--go2)"
          bg="rgba(255,176,48,0.06)"
          border="rgba(255,176,48,0.15)"
        />
      </div>

      {/* ── Win Rate ───────────────────────────────────────────── */}
      <div style={{
        padding: '14px 16px', background: 'rgba(255,255,255,0.025)',
        borderRadius: '14px', border: '1px solid var(--bd2)',
        display: 'flex', alignItems: 'center', gap: '16px',
      }}>
        <WinRing wr={wr} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '10px', color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Win Rate</span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--t1)' }}>{wins}W / {losses}L</span>
          <span style={{ fontSize: '11px', color: 'var(--t3)', display: 'block' }}>{stats?.totalTrades ?? 0} total trades</span>
        </div>
      </div>

      {/* ── Equity Curve (same component as desktop / Trading tab) ── */}
      <EquityCurve trades={trades} />

      {/* ── Daily P&L — 30 days ────────────────────────────────── */}
      <div style={{ padding: '14px 16px', background: 'var(--s1)', borderRadius: '14px', border: '1px solid var(--bd2)' }}>
        <span style={{ fontSize: '10px', color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '10px' }}>Daily P&L — 30 Days</span>
        <DailyPnLChart days={30} height={130} showStats />
      </div>

      {/* ── Daily Max Loss ─────────────────────────────────────── */}
      <div style={{ padding: '14px 16px', background: 'var(--s1)', borderRadius: '14px', border: '1px solid rgba(255,61,80,0.15)' }}>
        <span style={{ fontSize: '10px', color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '10px' }}>Daily Risk</span>
        <DailyMaxLoss allRows={allRows} />
      </div>

      {/* ── Today's Focus ──────────────────────────────────────── */}
      {(habits.length > 0 || focusTasks.length > 0) && (
        <div style={{ padding: '14px 16px', background: 'var(--s1)', borderRadius: '14px', border: '1px solid var(--bd2)' }}>
          <span style={{ fontSize: '10px', color: 'var(--am2)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '12px' }}>Today's Focus</span>

          {habits.length > 0 && (
            <>
              <p style={{ fontSize: '11px', color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>
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
                        boxShadow: done ? '0 0 7px rgba(0,232,122,0.4)' : 'none',
                      }}>
                        {done && <span style={{ fontSize: '9px', color: 'white', fontWeight: 700 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: '13px', color: done ? 'var(--t3)' : 'var(--t2)', textDecoration: done ? 'line-through' : 'none' }}>
                        {h.icon} {h.name}
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
              <p style={{ fontSize: '11px', color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>
                {todayTasks.length > 0 ? 'Due Today' : 'High Priority'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {focusTasks.map(task => {
                  const overdue = task.due_date && task.due_date < today && task.status !== 'done'
                  return (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px' }}>
                      <div style={{
                        width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0, marginTop: '2px',
                        background: task.status === 'done' ? 'var(--gr)' : 'transparent',
                        border: `2px solid ${task.status === 'done' ? 'var(--gr2)' : overdue ? 'var(--re)' : 'var(--bd2)'}`,
                      }} />
                      <span style={{ fontSize: '13px', lineHeight: 1.45, color: overdue ? 'var(--re)' : 'var(--t2)', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
                        {task.title}
                      </span>
                    </div>
                  )
                })}
              </div>
              {openTasks.length > focusTasks.length && (
                <p style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '8px' }}>+{openTasks.length - focusTasks.length} more open</p>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Edge Report — day-trading insights + hard numbers ───── */}
      {(edgeInsights.length > 0 || edgeFacts.length > 0) && (
        <div style={{ padding: '14px 16px', background: 'var(--s1)', borderRadius: '14px', border: '1px solid rgba(255,176,48,0.15)' }}>
          <span style={{ fontSize: '10px', color: 'var(--go2)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '10px' }}>
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
