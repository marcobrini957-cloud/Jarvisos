/**
 * Suggesting a daily loss limit from a trader's own history.
 *
 * A limit copied off a forum ("1% a day") ignores how this person actually
 * trades. Someone whose ordinary red day is €40 needs a different number from
 * someone whose ordinary red day is €400, and setting the limit below a normal
 * losing day just means stopping every week for no reason.
 *
 * So the suggestion is anchored on the *typical* losing day, not the worst one:
 * roughly 1.5× the median. A normal red day then uses about two thirds of the
 * budget and is allowed to play out; the tail — the day that does real damage —
 * is what gets cut off. It is then clamped to a sane share of the account, so a
 * run of bad days cannot recommend something reckless.
 *
 * Pure — tested in tests/riskSuggestion.test.ts.
 */

import type { Trade } from '@/types'
import { isRealTrade } from './stats'

export const APP_TZ = 'Europe/Vienna'

/** Share-of-account guard rails. A daily stop outside this band is not risk management. */
export const MIN_PCT = 0.5
export const MAX_PCT = 3
/** Used when there is not enough history to infer anything. */
export const FALLBACK_PCT = 2

export interface RiskSuggestion {
  /** Suggested limit in account currency, already rounded to a usable number. */
  amount:   number
  /** The same limit as a share of the account, or null when the balance is unknown. */
  pct:      number | null
  /** Which rule produced it — drives the explanation shown to the user. */
  basis:    'history' | 'account' | 'floor' | 'cap'
  /** Losing days the suggestion was inferred from. */
  losingDays: number
  /** Typical (median) losing day, or null when there were none. */
  medianLoss: number | null
  /** How many past days this limit would have stopped. */
  wouldHaveStopped: number
  rationale: string
}

function dayKey(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', { timeZone })
}

/** Net P&L per calendar day, in the trader's own clock. */
export function dailyPnl(trades: Trade[], timeZone = APP_TZ): Map<string, number> {
  const days = new Map<string, number>()
  for (const t of trades) {
    if (!t.close_time || t.status !== 'closed' || t.net_profit === null) continue
    if (!isRealTrade(t)) continue
    const k = dayKey(t.close_time, timeZone)
    days.set(k, (days.get(k) ?? 0) + (t.net_profit ?? 0))
  }
  return days
}

function median(sorted: number[]): number {
  const n = sorted.length
  if (n === 0) return 0
  const mid = Math.floor(n / 2)
  return n % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** Round to a number a person would actually type. */
export function niceRound(v: number): number {
  if (v <= 0) return 0
  const step = v < 200 ? 10 : v < 1000 ? 25 : v < 5000 ? 50 : 100
  return Math.max(step, Math.round(v / step) * step)
}

/**
 * @param trades  the user's rows; filtered to real closed trades internally
 * @param balance account balance, or null when no MT5 account is connected
 */
export function suggestDailyLoss(
  trades: Trade[],
  balance: number | null,
  timeZone = APP_TZ,
): RiskSuggestion | null {
  const days = dailyPnl(trades, timeZone)
  const losses = Array.from(days.values()).filter(v => v < 0).map(v => Math.abs(v)).sort((a, b) => a - b)

  const usableBalance = balance !== null && balance > 0 ? balance : null
  // Not enough of either to say anything honest.
  if (losses.length < 4 && !usableBalance) return null

  let amount: number
  let basis: RiskSuggestion['basis']
  const med = losses.length > 0 ? median(losses) : null

  if (losses.length >= 4 && med !== null && med > 0) {
    amount = med * 1.5
    basis  = 'history'
  } else {
    amount = (usableBalance as number) * (FALLBACK_PCT / 100)
    basis  = 'account'
  }

  // Guard rails, only meaningful once we know the account size.
  if (usableBalance) {
    const floor = usableBalance * (MIN_PCT / 100)
    const cap   = usableBalance * (MAX_PCT / 100)
    if (amount < floor) { amount = floor; basis = 'floor' }
    else if (amount > cap) { amount = cap; basis = 'cap' }
  }

  amount = niceRound(amount)
  if (amount <= 0) return null

  const wouldHaveStopped = Array.from(days.values()).filter(v => Math.abs(Math.min(0, v)) >= amount).length
  const pct = usableBalance ? +(amount / usableBalance * 100).toFixed(2) : null

  const rationale =
    basis === 'history'
      ? `Your typical losing day is €${med!.toFixed(0)}. This sits about half again above that, so an ordinary red day runs its course and only the outliers stop you — ${wouldHaveStopped} of your ${days.size} trading days would have hit it.`
      : basis === 'account'
      ? `Not enough losing days to read a pattern yet, so this is ${FALLBACK_PCT}% of your balance — a common starting point you can tighten once you have more history.`
      : basis === 'cap'
      ? `Your recent losing days are large relative to the account, so this is capped at ${MAX_PCT}% of your balance rather than following them up.`
      : `Your losing days are small relative to the account, so this is held at a ${MIN_PCT}% floor rather than setting a stop you would hit on noise.`

  return { amount, pct, basis, losingDays: losses.length, medianLoss: med, wouldHaveStopped, rationale }
}
