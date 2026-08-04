import { describe, it, expect } from 'vitest'
import type { Trade } from '@/types'
import { currentStreaks, recentRun, newestFirst, outcomeOf } from '@/lib/trading/streaks'
import { BE_PIPS } from '@/lib/trading/stats'

/** `day` is the day of July, so 1 is oldest and 9 is newest. */
function t(net: number, day: number): Trade {
  return {
    symbol: 'XAUUSD', trade_type: 'buy', status: 'closed', lot_size: 0.1,
    net_profit: net, close_time: `2026-07-${String(day).padStart(2, '0')}T12:00:00Z`,
  } as Trade
}

/** Oldest → newest. The hook hands components the reverse of this. */
const OLDEST_FIRST = [t(-50, 1), t(80, 2), t(90, 3), t(70, 4)]
const NEWEST_FIRST = [...OLDEST_FIRST].reverse()

describe('outcomeOf', () => {
  // Delegates to tradeResult, so a streak counter and a win rate can never
  // disagree about the same trade. These assert that delegation holds.
  const withPips = (net: number, pips: number): Trade =>
    ({ ...t(net, 1), pips } as Trade)

  // Expressed relative to the threshold rather than in literal pips, so
  // retuning the default cannot quietly invalidate what these assert.
  const INSIDE  = BE_PIPS - 1
  const OUTSIDE = BE_PIPS + 30

  it('treats a small price move as neither a win nor a loss', () => {
    expect(outcomeOf(withPips(50, OUTSIDE))).toBe('win')
    expect(outcomeOf(withPips(-50, -OUTSIDE))).toBe('loss')
    expect(outcomeOf(withPips(9, INSIDE))).toBe('breakeven')
    expect(outcomeOf(withPips(-9, -INSIDE))).toBe('breakeven')
    expect(outcomeOf(withPips(0, 0))).toBe('breakeven')
  })

  it('does not let position size change the verdict', () => {
    const small = { ...t(-4.5, 1), lot_size: 0.05, pips: -INSIDE } as Trade
    const big   = { ...t(-90,  1), lot_size: 1.00, pips: -INSIDE } as Trade
    expect(outcomeOf(small)).toBe('breakeven')
    expect(outcomeOf(big)).toBe('breakeven')
  })
})

describe('newestFirst', () => {
  it('orders by close time regardless of how the caller sorted', () => {
    expect(newestFirst(OLDEST_FIRST)[0].close_time).toContain('07-04')
    expect(newestFirst(NEWEST_FIRST)[0].close_time).toContain('07-04')
  })
  it('does not mutate the input', () => {
    const input = [...OLDEST_FIRST]
    newestFirst(input)
    expect(input[0].close_time).toContain('07-01')
  })
})

describe('currentStreaks — the regression', () => {
  it('gives the same answer whichever order the trades arrive in', () => {
    // This is the bug: the card reversed a newest-first array and counted from
    // the oldest trade, so the streak never moved.
    expect(currentStreaks(NEWEST_FIRST)).toEqual(currentStreaks(OLDEST_FIRST))
  })

  it('counts back from the most recent trade, not the first one ever', () => {
    // Loss first, then three wins — the current streak is 3, not 0.
    expect(currentStreaks(NEWEST_FIRST).wins).toBe(3)
  })

  it('moves when a new trade lands', () => {
    const before = currentStreaks(NEWEST_FIRST).wins
    const after  = currentStreaks([t(120, 5), ...NEWEST_FIRST]).wins
    expect(before).toBe(3)
    expect(after).toBe(4)
  })

  it('resets the win streak the moment a loss is the latest trade', () => {
    const s = currentStreaks([t(-90, 5), ...NEWEST_FIRST])
    expect(s.wins).toBe(0)
    expect(s.losses).toBe(1)
    expect(s.withoutLoss).toBe(0)
  })
})

describe('currentStreaks — break-evens', () => {
  it('does not let a scratch reset the run since the last loss', () => {
    // loss, win, break-even, win → four trades, none of them a loss since the first
    const s = currentStreaks([t(-50, 1), t(80, 2), t(3, 3), t(60, 4)])
    expect(s.withoutLoss).toBe(3)
  })

  it('skips a scratch rather than ending the win streak', () => {
    // loss, win, break-even, win. The scratch is not an outcome — it is left
    // out of both sides of the win rate, and it is left out here too, so this
    // reads as two wins rather than one.
    //
    // The rule used to be the other way round ("a win streak stops at the
    // first thing that is not a win"), which meant a scratch quietly ended a
    // run the trader had not actually broken.
    const s = currentStreaks([t(-50, 1), t(80, 2), t(3, 3), t(60, 4)])
    expect(s.wins).toBe(2)
  })

  it('never counts a scratch as a win', () => {
    // Two wins, then today's trade scratches. Still two — the number must not
    // move just because a flat trade closed.
    const before = currentStreaks([t(70, 1), t(90, 2)])
    const after  = currentStreaks([t(70, 1), t(90, 2), t(2, 3)])
    expect(before.wins).toBe(2)
    expect(after.wins).toBe(2)
  })

  it('a loss ends it whatever came before', () => {
    const s = currentStreaks([t(90, 1), t(80, 2), t(3, 3), t(-70, 4)])
    expect(s.wins).toBe(0)
  })

  it('counts consecutive losses only', () => {
    const s = currentStreaks([t(90, 1), t(-40, 2), t(-60, 3)])
    expect(s.losses).toBe(2)
    expect(s.wins).toBe(0)
  })
})

describe('currentStreaks — edges', () => {
  it('handles an empty account', () => {
    expect(currentStreaks([])).toEqual({ wins: 0, losses: 0, withoutLoss: 0 })
  })
  it('handles an account whose every trade is a winner', () => {
    expect(currentStreaks([t(10.5, 1), t(20, 2)]).withoutLoss).toBe(2)
  })
})

describe('recentRun', () => {
  it('renders oldest → newest so the strip reads left to right', () => {
    expect(recentRun(NEWEST_FIRST, 4)).toEqual(['down', 'up', 'up', 'up'])
  })

  it('takes the most recent N, not the oldest N', () => {
    const many = Array.from({ length: 20 }, (_, i) => t(i < 10 ? -50 : 50, i + 1))
    // the newest ten are all wins
    expect(recentRun(many, 10).every(m => m === 'up')).toBe(true)
  })

  it('pads on the left when history is shorter than the strip', () => {
    const r = recentRun([t(50, 1)], 5)
    expect(r).toEqual(['none', 'none', 'none', 'none', 'up'])
  })

  it('marks a scratch as flat, not as a loss', () => {
    expect(recentRun([t(2, 1)], 1)).toEqual(['flat'])
  })

  it('is order-independent like the streaks', () => {
    expect(recentRun(NEWEST_FIRST, 4)).toEqual(recentRun(OLDEST_FIRST, 4))
  })
})
