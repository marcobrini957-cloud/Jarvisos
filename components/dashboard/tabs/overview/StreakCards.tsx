'use client'

import { useMemo } from 'react'
import { BE_THRESHOLD } from '@/hooks/useTrades'
import Icon, { type IconName } from '@/components/ui/Icon'
import type { Trade } from '@/types'

// ── Run strip ─────────────────────────────────────────────────────────────────
// The last N outcomes as tick marks, oldest → newest. A count on its own says
// "3"; the strip shows what the 3 is made of and what came before it.

type Outcome = 'win' | 'loss' | 'flat' | 'none'

const TICK_COLOR: Record<Outcome, string> = {
  win:  'var(--gr)',
  loss: 'var(--re)',
  flat: 'var(--bd3)',
  none: 'var(--bd)',
}

function RunStrip({ run }: { run: Outcome[] }) {
  return (
    <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '14px' }}>
      {run.map((o, i) => (
        <span
          key={i}
          style={{
            width: '3px',
            height: o === 'none' ? '4px' : o === 'flat' ? '6px' : '14px',
            borderRadius: '1px',
            background: TICK_COLOR[o],
            opacity: o === 'none' ? 0.5 : 1,
          }}
        />
      ))}
    </div>
  )
}

function StreakRow({ icon, label, value, unit, run, tone }: {
  icon:  IconName
  label: string
  value: number
  unit:  string
  run:   Outcome[]
  tone:  'positive' | 'negative' | 'neutral'
}) {
  const valueColor =
    tone === 'positive' ? 'var(--gr2)' :
    tone === 'negative' ? 'var(--re)'  : 'var(--t2)'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
      padding: '11px 0', borderBottom: '1px solid var(--bd)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        <span style={{ color: 'var(--t3)' }}><Icon name={icon} size={14} /></span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '12px', color: 'var(--t1)', lineHeight: 1.3, fontWeight: 500 }}>{label}</p>
          <p style={{ fontSize: '10.5px', color: 'var(--t3)', lineHeight: 1.3 }}>{unit}</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <RunStrip run={run} />
        <span className="num" style={{
          fontSize: '20px', fontWeight: 600, color: valueColor,
          minWidth: '22px', textAlign: 'right', lineHeight: 1,
        }}>
          {value}
        </span>
      </div>
    </div>
  )
}

// ── Streak Card ───────────────────────────────────────────────────────────────

export function StreakCard({ trades, journalStreak, habitStreak, journalDays, habitDays }: {
  trades:        Trade[]
  journalStreak: number
  habitStreak:   number
  journalDays?:  boolean[]   // last 7 days, oldest → newest
  habitDays?:    boolean[]
}) {
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

  // last 12 outcomes, oldest → newest
  const tradeRun = useMemo<Outcome[]>(() => {
    const recent = trades.slice(-12).map<Outcome>(t => {
      const p = t.net_profit ?? 0
      return p > BE_THRESHOLD ? 'win' : p < -BE_THRESHOLD ? 'loss' : 'flat'
    })
    return [...Array(Math.max(0, 12 - recent.length)).fill('none' as Outcome), ...recent]
  }, [trades])

  const toRun = (days?: boolean[]): Outcome[] => {
    const d = (days ?? []).slice(-7).map<Outcome>(v => (v ? 'win' : 'none'))
    return [...Array(Math.max(0, 7 - d.length)).fill('none' as Outcome), ...d]
  }

  const isLosing = lossStreak > 0 && tradeStreak === 0

  return (
    <div style={{
      borderRadius: '12px', padding: '4px 16px 6px',
      background: 'var(--s1)', border: '1px solid var(--bd2)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '13px 0 4px',
      }}>
        <span className="label-caps">Streaks</span>
        <span style={{ fontSize: '10px', color: 'var(--t3)' }}>
          {isLosing ? 'last 12 trades' : 'current run'}
        </span>
      </div>

      <StreakRow
        icon={isLosing ? 'trendDown' : 'streak'}
        label={isLosing ? 'Loss run' : 'Win streak'}
        value={isLosing ? lossStreak : tradeStreak}
        unit={isLosing ? 'losses in a row' : 'trades without a loss'}
        run={tradeRun}
        tone={isLosing ? 'negative' : tradeStreak >= 3 ? 'positive' : 'neutral'}
      />
      <StreakRow
        icon="journal"
        label="Journal streak"
        value={journalStreak}
        unit={journalStreak === 1 ? 'day in a row' : 'days in a row'}
        run={toRun(journalDays)}
        tone={journalStreak >= 3 ? 'positive' : 'neutral'}
      />
      <div style={{ borderBottom: 'none' }}>
        <StreakRow
          icon="habit"
          label="Habit streak"
          value={habitStreak}
          unit={habitStreak === 1 ? 'day in a row' : 'days in a row'}
          run={toRun(habitDays)}
          tone={habitStreak >= 3 ? 'positive' : 'neutral'}
        />
      </div>
    </div>
  )
}

// ── Streak Badge ──────────────────────────────────────────────────────────────

export function StreakBadge({ trades }: { trades: Trade[] }) {
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

  const pill: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '4px 10px', borderRadius: '6px',
    fontSize: '11.5px', fontWeight: 600, letterSpacing: '-0.01em',
  }

  if (streak.wins >= 2) return (
    <span style={{ ...pill, background: 'rgba(0,232,122,0.08)', border: '1px solid rgba(0,232,122,0.18)', color: 'var(--gr2)' }}>
      <Icon name="streak" size={12} />
      {streak.wins}-trade win streak
    </span>
  )
  if (streak.losses >= 2) return (
    <span style={{ ...pill, background: 'rgba(255,61,80,0.08)', border: '1px solid rgba(255,61,80,0.2)', color: 'var(--re)' }}>
      <Icon name="alert" size={12} />
      {streak.losses} losses in a row — consider stepping back
    </span>
  )
  return null
}
