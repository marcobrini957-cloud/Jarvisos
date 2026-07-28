'use client'

import { useMemo } from 'react'
import Icon, { type IconName } from '@/components/ui/Icon'
import { Surface, Row, RunStrip, Num, type RunMark } from '@/components/ui/vq'
import { currentStreaks, recentRun } from '@/lib/trading/streaks'
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
  // Both of these used to reverse the array on the assumption it arrived
  // oldest-first; useTrades sorts newest-first, so the "current" streak was
  // counted from the account's very first trade and never moved. Order is
  // established inside lib/trading/streaks now, not assumed here.
  const { losses: lossStreak, withoutLoss: tradeStreak } = useMemo(
    () => currentStreaks(trades), [trades])

  const tradeRun = useMemo<RunMark[]>(() => recentRun(trades, 12), [trades])

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
        unit={isLosing
          ? (lossStreak === 1 ? 'loss in a row' : 'losses in a row')
          : (tradeStreak === 1 ? 'trade without a loss' : 'trades without a loss')}
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
  const streak = useMemo(() => currentStreaks(trades), [trades])

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
