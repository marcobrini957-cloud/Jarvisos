'use client'

import { useMemo } from 'react'
import { BE_THRESHOLD } from '@/hooks/useTrades'
import Icon, { type IconName } from '@/components/ui/Icon'
import { Surface, Row, RunStrip, Num, type RunMark } from '@/components/ui/vq'
import type { Trade } from '@/types'

// ── Streak Card ───────────────────────────────────────────────────────────────
// Each row carries a run strip: a count says "3", the strip shows what the 3 is
// made of and what came before it — so a zero still shows the week.

function StreakRow({ icon, label, unit, value, run, tone, last }: {
  icon:  IconName
  label: string
  unit:  string
  value: number
  run:   RunMark[]
  tone:  'up' | 'down' | 'muted'
  last?: boolean
}) {
  return (
    <Row
      label={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '9px' }}>
          <span style={{ color: 'var(--color-ink-3)', display: 'inline-flex' }}>
            <Icon name={icon} size={13} />
          </span>
          {label}
        </span>
      }
      sub={unit}
      last={last}
    >
      <RunStrip run={run} />
      <Num size="lg" tone={tone} style={{ minWidth: '24px', textAlign: 'right' }}>{value}</Num>
    </Row>
  )
}

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
  const tradeRun = useMemo<RunMark[]>(() => {
    const recent = trades.slice(-12).map<RunMark>(t => {
      const p = t.net_profit ?? 0
      return p > BE_THRESHOLD ? 'up' : p < -BE_THRESHOLD ? 'down' : 'flat'
    })
    return [...Array(Math.max(0, 12 - recent.length)).fill('none' as RunMark), ...recent]
  }, [trades])

  const toRun = (days?: boolean[]): RunMark[] => {
    const d = (days ?? []).slice(-7).map<RunMark>(v => (v ? 'up' : 'none'))
    return [...Array(Math.max(0, 7 - d.length)).fill('none' as RunMark), ...d]
  }

  const isLosing = lossStreak > 0 && tradeStreak === 0

  return (
    <Surface title="Streaks" action={
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', color: 'var(--color-ink-3)' }}>
        {isLosing ? 'last 12 trades' : 'current run'}
      </span>
    }>
      <StreakRow
        icon={isLosing ? 'trendDown' : 'streak'}
        label={isLosing ? 'Loss run' : 'Win streak'}
        unit={isLosing ? 'losses in a row' : 'trades without a loss'}
        value={isLosing ? lossStreak : tradeStreak}
        run={tradeRun}
        tone={isLosing ? 'down' : tradeStreak >= 3 ? 'up' : 'muted'}
      />
      <StreakRow
        icon="journal"
        label="Journal"
        unit={journalStreak === 1 ? 'day in a row' : 'days in a row'}
        value={journalStreak}
        run={toRun(journalDays)}
        tone={journalStreak >= 3 ? 'up' : 'muted'}
      />
      <StreakRow
        icon="habit"
        label="Habits"
        unit={habitStreak === 1 ? 'day in a row' : 'days in a row'}
        value={habitStreak}
        run={toRun(habitDays)}
        tone={habitStreak >= 3 ? 'up' : 'muted'}
        last
      />
    </Surface>
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
    padding: '2px 8px', borderRadius: 'var(--radius-sm)',
    fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)',
  }

  if (streak.wins >= 2) return (
    <span style={{ ...pill, background: 'var(--color-up-dim)', color: 'var(--color-up)' }}>
      <Icon name="streak" size={11} />
      {streak.wins}-trade win streak
    </span>
  )
  if (streak.losses >= 2) return (
    <span style={{ ...pill, background: 'var(--color-down-dim)', color: 'var(--color-down)' }}>
      <Icon name="alert" size={11} />
      {streak.losses} losses in a row
    </span>
  )
  return null
}
