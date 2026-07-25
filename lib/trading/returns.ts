// Period return, calculated the way MetaTrader calculates "Growth".
//
// Pure — no React, no Supabase. Unit-tested in tests/returns.test.ts.
//
// WHY NOT net profit / balance:
//   Marco's 1–25 July 2026: +€233.22 profit, €1,875.63 starting balance, and a
//   €249.34 deposit on the 13th. Simple division says 12.43%. MT5's own report
//   says 11.38%. Neither number is a bug — they answer different questions.
//   Simple division credits the whole month's profit to the smaller starting
//   capital, ignoring that everything traded after the 13th was earned on a
//   ~€2,125 base. Chaining the per-trade returns instead gives 11.41%, which is
//   MT5's figure (the last 0.03pp is deal-level ordering inside the terminal).
//
//   This matters more as an account grows: any month with a deposit or a
//   withdrawal in it will disagree with the broker's own report, and the
//   broker's report is the number a trader trusts.

export type ReturnEventKind = 'trade' | 'funding'

export interface ReturnEvent {
  /** ISO timestamp — events are sorted by this. */
  at:     string
  /** EUR. Signed: profits and deposits positive, losses and withdrawals negative. */
  amount: number
  /** 'trade' compounds into the return; 'funding' only moves the balance. */
  kind:   ReturnEventKind
}

/**
 * Balance at the start of the period, derived by unwinding every event from the
 * closing balance. Used because snapshots only exist from the day the bridge
 * went live — there is no stored balance for older period starts.
 */
export function deriveStartBalance(endBalance: number, events: ReturnEvent[]): number {
  return events.reduce((bal, e) => bal - e.amount, endBalance)
}

/**
 * Time-weighted return over the period, in percent. Deposits and withdrawals
 * move the capital base but never count as performance.
 *
 * Returns 0 when the period cannot produce a meaningful figure (no starting
 * capital, no trades, or a balance that hits zero mid-period).
 */
export function timeWeightedReturn(startBalance: number, events: ReturnEvent[]): number {
  if (!(startBalance > 0)) return 0

  const ordered = [...events].sort((a, b) => a.at.localeCompare(b.at))
  if (!ordered.some(e => e.kind === 'trade')) return 0

  let balance = startBalance
  let factor  = 1

  for (const e of ordered) {
    if (e.kind === 'trade') {
      // A blown account can't be expressed as a percentage — bail out rather
      // than divide by zero or flip the sign of the whole chain.
      if (balance <= 0) return 0
      factor *= 1 + e.amount / balance
      if (factor <= 0) return -100
    }
    balance += e.amount
  }

  return (factor - 1) * 100
}

/**
 * Convenience wrapper for the common shape: "here is today's balance, here are
 * the trades and the funding movements in the period, what was the return?"
 */
export function periodReturnPct({ endBalance, events }: {
  endBalance: number
  events:     ReturnEvent[]
}): number {
  return timeWeightedReturn(deriveStartBalance(endBalance, events), events)
}
