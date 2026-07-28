import type { Trade } from '@/types'
import { BE_THRESHOLD } from './stats'

/**
 * Current streaks, and the run of recent outcomes behind them.
 *
 * These were computed inline in the Streaks card, which reversed the array it
 * was handed on the assumption that it arrived oldest-first. `useTrades` orders
 * by `close_time` **descending**, so the reverse produced oldest-first and the
 * "current" streak was counted from the beginning of the account's history —
 * a number that is frozen for ever and never reacts to a new trade.
 *
 * Order is therefore established here rather than assumed, so this stays right
 * whatever the caller passes. Pure — tested in tests/streaks.test.ts.
 */

export type Outcome = 'win' | 'loss' | 'breakeven'

export function outcomeOf(trade: Trade): Outcome {
  const pnl = trade.net_profit ?? 0
  if (pnl >  BE_THRESHOLD) return 'win'
  if (pnl < -BE_THRESHOLD) return 'loss'
  return 'breakeven'
}

/** Newest first, by close time. Trades without one sink to the bottom. */
export function newestFirst(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => (b.close_time ?? '').localeCompare(a.close_time ?? ''))
}

export interface Streaks {
  /** Consecutive wins from the most recent trade back. Zero if the last was a loss. */
  wins:   number
  /** Consecutive losses from the most recent trade back. */
  losses: number
  /**
   * Trades since the last real loss. Break-evens do not reset it — a flat
   * trade is not a mistake, and treating it as one made the card read 0 for a
   * trader who had simply scratched a position.
   */
  withoutLoss: number
}

export function currentStreaks(trades: Trade[]): Streaks {
  const ordered = newestFirst(trades)

  let withoutLoss = 0
  for (const t of ordered) {
    if (outcomeOf(t) === 'loss') break
    withoutLoss++
  }

  let losses = 0
  for (const t of ordered) {
    if (outcomeOf(t) === 'loss') losses++
    else break
  }

  // A win streak stops at the first thing that is not a win, break-evens
  // included — "3-trade win streak" should mean three wins.
  let wins = 0
  for (const t of ordered) {
    if (outcomeOf(t) === 'win') wins++
    else break
  }

  return { wins, losses, withoutLoss }
}

export type RunMark = 'up' | 'down' | 'flat' | 'none'

/**
 * The last `size` outcomes, oldest → newest for display, padded on the left so
 * a short history still occupies the full strip.
 */
export function recentRun(trades: Trade[], size = 12): RunMark[] {
  const recent = newestFirst(trades)
    .slice(0, size)
    .reverse()
    .map<RunMark>(t => {
      const o = outcomeOf(t)
      return o === 'win' ? 'up' : o === 'loss' ? 'down' : 'flat'
    })
  return [...Array(Math.max(0, size - recent.length)).fill('none' as RunMark), ...recent]
}
