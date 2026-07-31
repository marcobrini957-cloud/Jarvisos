/**
 * The Analyst's truth layer.
 *
 * The model is never asked to work a rate out for itself — it is handed
 * finished figures and told to quote them. This module builds those figures,
 * and it is pure so they can be tested (tests/chatFacts.test.ts).
 *
 * Three things went wrong in the version this replaces, all of which made the
 * Analyst quote a win rate that did not match the dashboard:
 *
 *   1. It divided wins by *every* trade, so each break-even counted as a loss.
 *      The standing rule is wins / (wins + losses) — see decidedStats() in
 *      lib/intelligence.ts and computeStats() in lib/trading/stats.ts.
 *   2. It never filtered out balance operations, so a deposit was a "win" and
 *      a withdrawal a "loss" — both large, both fictional.
 *   3. It only ever built one 30-day window, so a question about a named month
 *      was answered with the last-30-days number wearing that month's name.
 */

import type { Trade } from '@/types'
import { isRealTrade, isWin, isLoss } from '@/lib/trading/stats'

export interface Decided {
  trades:   number
  wins:     number
  losses:   number
  /** wins + losses — the only legitimate denominator for a win rate */
  decided:  number
  /** trades that landed inside the pip-based scratch band; excluded from both sides */
  breakEven: number
  winRate:  number
  netPnl:   number
}

/** The one place a win rate is worked out. Everything else calls this. */
export function decided(trades: Trade[]): Decided {
  const wins   = trades.filter(t => isWin(t))
  const losses = trades.filter(t => isLoss(t))
  const dec    = wins.length + losses.length
  return {
    trades:    trades.length,
    wins:      wins.length,
    losses:    losses.length,
    decided:   dec,
    breakEven: trades.length - dec,
    winRate:   dec > 0 ? +(wins.length / dec * 100).toFixed(1) : 0,
    netPnl:    +trades.reduce((s, t) => s + (t.net_profit ?? 0), 0).toFixed(2),
  }
}

/** Closed, real, priced trades. Balance operations are not trades. */
export function realClosedTrades(rows: Trade[]): Trade[] {
  return rows.filter(t => t.status === 'closed' && t.net_profit !== null && isRealTrade(t))
}

/**
 * The dashboard buckets a month in the trader's own clock, so this has to as
 * well — the route runs on a UTC server, and a fill closed at 00:30 Vienna on
 * the 1st would otherwise be filed under the previous month, putting the
 * Analyst and the screen one trade apart at every boundary.
 */
export const APP_TZ = 'Europe/Vienna'

function monthKey(iso: string, timeZone: string): string {
  // en-CA gives YYYY-MM-DD, so the first seven characters are the month key.
  return new Date(iso).toLocaleDateString('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone,
  }).slice(0, 7)
}

const MONTH_NAME = (key: string) =>
  new Date(`${key}-01T12:00:00Z`).toLocaleDateString('en-GB', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  })

export interface MonthFacts extends Decided { key: string; label: string }

/**
 * Calendar months, newest first. Calendar — not a rolling window — because
 * "how was my July" is a question about July, and answering it with the last
 * thirty days is how the Analyst came to call a 3W/0L month a losing one.
 */
export function monthlyFacts(trades: Trade[], limit = 6, timeZone = APP_TZ): MonthFacts[] {
  const buckets = new Map<string, Trade[]>()
  for (const t of trades) {
    if (!t.close_time) continue
    const key = monthKey(t.close_time, timeZone)
    const arr = buckets.get(key)
    if (arr) arr.push(t)
    else buckets.set(key, [t])
  }
  return Array.from(buckets.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, limit)
    .map(([key, ts]) => ({ key, label: MONTH_NAME(key), ...decided(ts) }))
}

/** One line per segment, each carrying its own decided denominator. */
export function segmentLine(name: string, d: Decided): string {
  if (d.decided === 0) return `${name}: no decided trades (${d.trades} break-even)`
  const be = d.breakEven > 0 ? `, ${d.breakEven} BE excluded` : ''
  return `${name}: ${d.winRate}% WR (${d.wins}W/${d.losses}L${be}), €${d.netPnl >= 0 ? '+' : ''}${d.netPnl}`
}

export function groupBy(trades: Trade[], key: (t: Trade) => string | null | undefined) {
  const m = new Map<string, Trade[]>()
  for (const t of trades) {
    const k = key(t)
    if (!k) continue
    const arr = m.get(k)
    if (arr) arr.push(t)
    else m.set(k, [t])
  }
  return m
}

export function describeWindow(d: Decided, label: string): string {
  if (d.trades === 0) return `${label}: no trades`
  const be = d.breakEven > 0
    ? ` · ${d.breakEven} break-even trade${d.breakEven > 1 ? 's' : ''} excluded from the win rate`
    : ''
  return `${label}: ${d.trades} trades · ${d.winRate}% win rate (${d.wins}W/${d.losses}L)`
       + ` · net €${d.netPnl >= 0 ? '+' : ''}${d.netPnl}${be}`
}
