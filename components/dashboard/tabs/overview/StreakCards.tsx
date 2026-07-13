'use client'

import { useMemo } from 'react'
import { BE_THRESHOLD } from '@/hooks/useTrades'
import type { Trade } from '@/types'

// ── Streak Card ───────────────────────────────────────────────────────────────

export function StreakCard({ trades, journalStreak, habitStreak }: { trades: Trade[]; journalStreak: number; habitStreak: number }) {
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

  const isLosing = lossStreak > 0 && tradeStreak === 0

  const items = [
    {
      label:   isLosing ? 'Loss run' : 'Win streak',
      value:   isLosing ? lossStreak : tradeStreak,
      unit:    isLosing ? 'losses in a row' : 'trades without a loss',
      icon:    isLosing ? '⚠️' : tradeStreak >= 5 ? '🔥' : '📈',
      bg:      isLosing ? 'rgba(255,61,80,0.08)'      : tradeStreak >= 3 ? 'rgba(0,232,122,0.07)'     : 'rgba(255,255,255,0.03)',
      border:  isLosing ? 'rgba(255,61,80,0.2)'       : tradeStreak >= 3 ? 'rgba(0,232,122,0.18)'     : 'var(--bd2)',
      numCol:  isLosing ? 'var(--re)'                 : tradeStreak >= 3 ? 'var(--gr2)'               : 'var(--t2)',
    },
    {
      label:   'Journal streak',
      value:   journalStreak,
      unit:    journalStreak === 1 ? 'day in a row' : 'days in a row',
      icon:    journalStreak >= 7 ? '🔥' : '✍',
      bg:      journalStreak >= 7 ? 'rgba(232,201,106,0.08)' : journalStreak >= 3 ? 'rgba(0,232,122,0.06)' : 'rgba(255,255,255,0.03)',
      border:  journalStreak >= 7 ? 'rgba(232,201,106,0.25)' : journalStreak >= 3 ? 'rgba(0,232,122,0.15)' : 'var(--bd2)',
      numCol:  journalStreak >= 7 ? 'var(--go2)' : journalStreak >= 3 ? 'var(--gr2)' : 'var(--t2)',
    },
    {
      label:   'Habit streak',
      value:   habitStreak,
      unit:    habitStreak === 1 ? 'day in a row' : 'days in a row',
      icon:    habitStreak >= 7 ? '🔥' : '💪',
      bg:      habitStreak >= 7 ? 'rgba(232,201,106,0.08)' : habitStreak >= 3 ? 'rgba(160,100,255,0.07)' : 'rgba(255,255,255,0.03)',
      border:  habitStreak >= 7 ? 'rgba(232,201,106,0.25)' : habitStreak >= 3 ? 'rgba(160,100,255,0.2)'  : 'var(--bd2)',
      numCol:  habitStreak >= 7 ? 'var(--go2)' : habitStreak >= 3 ? 'var(--pu)' : 'var(--t2)',
    },
  ]

  return (
    <div style={{
      borderRadius: '12px', padding: '16px 18px',
      background: 'rgba(232,201,106,0.04)',
      border: '1px solid rgba(232,201,106,0.14)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '14px' }}>
        <span style={{ fontSize: '16px', lineHeight: 1 }}>🔥</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--go2)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Streaks</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map(item => (
          <div key={item.label} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px', borderRadius: '9px',
            background: item.bg, border: `1px solid ${item.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', lineHeight: 1 }}>{item.icon}</span>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--t3)', lineHeight: 1, marginBottom: '2px' }}>{item.label}</p>
                <p style={{ fontSize: '10px', color: 'var(--t3)', lineHeight: 1 }}>{item.unit}</p>
              </div>
            </div>
            <span style={{ fontSize: '26px', fontWeight: 800, color: item.numCol, letterSpacing: '-0.04em', lineHeight: 1 }}>
              {item.value}
            </span>
          </div>
        ))}
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

  if (streak.wins >= 2) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '8px', background: 'rgba(0,232,122,0.1)', border: '1px solid rgba(0,232,122,0.2)' }}>
      <span style={{ fontSize: '14px' }}>🔥</span>
      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gr2)' }}>{streak.wins}-trade win streak</span>
    </div>
  )
  if (streak.losses >= 2) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '8px', background: 'rgba(255,61,80,0.1)', border: '1px solid rgba(255,61,80,0.25)' }}>
      <span style={{ fontSize: '14px' }}>⚠️</span>
      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--re)' }}>{streak.losses} losses in a row — consider stepping back</span>
    </div>
  )
  return null
}
