import type { Trade } from '@/types'
import { tradeResult } from './stats'

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
  // One definition of win/loss/scratch for the whole product — see
  // tradeResult in ./stats. Restating it here is how a streak counter and a
  // win rate end up disagreeing about the same trade.
  return tradeResult(trade)
}

/** Newest first, by close time. Trades without one sink to the bottom. */
export function newestFirst(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => (b.close_time ?? '').localeCompare(a.close_time ?? ''))
}

export interface Streaks {
  /**
   * Wins in a row from the most recent trade back. A loss ends it; a
   * break-even is skipped rather than counted or treated as a break.
   */
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

  // Wins in a row, counting back from the most recent trade. A loss ends it.
  //
  // A break-even neither counts nor ends it — it is skipped, exactly as it is
  // excluded from both sides of the win rate (see decidedStats in
  // lib/intelligence). The product's whole position on a scratch is that it is
  // not an outcome: it did not go your way, it did not go against you, and it
  // should not be able to tell you your run of wins is over. A trader who wins
  // twice, scratches one, and wins again has won three, and the card that says
  // otherwise is the one that is wrong.
  let wins = 0
  for (const t of ordered) {
    const outcome = outcomeOf(t)
    if (outcome === 'loss') break
    if (outcome === 'win') wins++
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
