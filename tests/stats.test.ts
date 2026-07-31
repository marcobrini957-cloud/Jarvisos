import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { tradeResult, computeStats, isRealTrade, isWin, isLoss, isBreakeven, BE_PIPS, PER_LOT_PER_PIP, makeClassifier } from '@/lib/trading/stats'
import type { Trade } from '@/types'

// Fixed "now" so month/week bucketing is deterministic: Monday 2026-07-13 12:00 UTC
const NOW = new Date('2026-07-13T12:00:00Z')

beforeAll(() => { vi.useFakeTimers(); vi.setSystemTime(NOW) })
afterAll(() => { vi.useRealTimers() })

let seq = 0
function trade(over: Partial<Trade>): Trade {
  seq++
  return {
    id: `t${seq}`,
    mt5_ticket: String(1000 + seq),
    symbol: 'XAUUSD',
    trade_type: 'buy',
    lot_size: 0.1,
    status: 'closed',
    open_time: '2026-07-10T09:00:00Z',
    close_time: '2026-07-10T10:00:00Z',
    net_profit: 100,
    ...over,
  } as Trade
}

describe('tradeResult — break-even is distance, not money', () => {
  it('classifies on pips, at the boundary', () => {
    expect(tradeResult(trade({ pips: BE_PIPS,        net_profit:  50 }))).toBe('win')
    expect(tradeResult(trade({ pips: BE_PIPS - 0.1,  net_profit:  50 }))).toBe('breakeven')
    expect(tradeResult(trade({ pips: 0,              net_profit:   0 }))).toBe('breakeven')
    expect(tradeResult(trade({ pips: -(BE_PIPS - 0.1), net_profit: -50 }))).toBe('breakeven')
    expect(tradeResult(trade({ pips: -BE_PIPS,       net_profit: -50 }))).toBe('loss')
  })

  it('gives the same verdict at every position size — the whole point', () => {
    // One scratch, three lot sizes, three very different euro figures.
    const scratch = [
      trade({ lot_size: 0.01, pips: -5, net_profit:  -0.45 }),
      trade({ lot_size: 0.20, pips: -5, net_profit:  -9.00 }),
      trade({ lot_size: 1.00, pips: -5, net_profit: -45.00 }),
    ]
    expect(scratch.map(t => tradeResult(t))).toEqual(['breakeven', 'breakeven', 'breakeven'])

    // And one real move, likewise.
    const real = [
      trade({ lot_size: 0.01, pips: -40, net_profit:  -3.60 }),
      trade({ lot_size: 1.00, pips: -40, net_profit: -360.00 }),
    ]
    expect(real.map(t => tradeResult(t))).toEqual(['loss', 'loss'])
  })

  it('does not call a big loss break-even just because the lot was large', () => {
    // The old ±€10 rule got this right by accident; the regression to guard is
    // the reverse — a huge euro figure that is only a few pips.
    expect(tradeResult(trade({ lot_size: 5, pips: -3, net_profit: -150 }))).toBe('breakeven')
    expect(tradeResult(trade({ lot_size: 5, pips: -60, net_profit: -3000 }))).toBe('loss')
  })

  it('past the scratch band, the money decides', () => {
    // A 40-pip move that commission turned negative is a loss, not a win.
    expect(tradeResult(trade({ pips: 40, net_profit: -0.5 }))).toBe('loss')
    expect(tradeResult(trade({ pips: 40, net_profit:  0.5 }))).toBe('win')
  })

  it('falls back to money-per-lot when a row carries no pips', () => {
    // Hand-entered and CSV-imported rows. Still size-normalised.
    const band = BE_PIPS * PER_LOT_PER_PIP        // € per full lot at the threshold
    expect(tradeResult(trade({ pips: null, lot_size: 1,   net_profit: -(band - 1) }))).toBe('breakeven')
    expect(tradeResult(trade({ pips: null, lot_size: 1,   net_profit: -(band + 1) }))).toBe('loss')
    expect(tradeResult(trade({ pips: null, lot_size: 0.1, net_profit: -3 }))).toBe('breakeven')
    expect(tradeResult(trade({ pips: null, lot_size: 0.1, net_profit: -50 }))).toBe('loss')
  })

  it('cannot be varied by a stray positional argument', () => {
    // `rows.map(tradeResult)` hands map's index in as a second argument. The
    // public signature takes one parameter precisely so that is impossible.
    const rows = [trade({ pips: -5, net_profit: -20 }), trade({ pips: -5, net_profit: -20 })]
    expect(rows.map(tradeResult)).toEqual(['breakeven', 'breakeven'])
  })

  it('honours a per-user threshold, and clamps nonsense', () => {
    const t = trade({ pips: -9, net_profit: -40 })
    expect(makeClassifier(7).tradeResult(t)).toBe('loss')        // 9 pips is decided at 7
    expect(makeClassifier(12).tradeResult(t)).toBe('breakeven')  // ...and a scratch at 12

    // Bounded, so the setting stays a calibration rather than a way to make a
    // losing month vanish into the break-even bucket.
    expect(makeClassifier(9999).bePips).toBe(25)
    expect(makeClassifier(0).bePips).toBe(1)
    expect(makeClassifier(NaN).bePips).toBe(BE_PIPS)
  })

  it('predicates agree with tradeResult', () => {
    const t = trade({ pips: 40, net_profit: 100 })
    expect([isWin(t), isLoss(t), isBreakeven(t)]).toEqual([true, false, false])
    const b = trade({ pips: 1, net_profit: 2 })
    expect([isWin(b), isLoss(b), isBreakeven(b)]).toEqual([false, false, true])
  })
})

describe('isRealTrade', () => {
  it('excludes BALANCE sentinel rows and zero-lot rows', () => {
    expect(isRealTrade(trade({ symbol: 'BALANCE', lot_size: 0 }))).toBe(false)
    expect(isRealTrade(trade({ lot_size: 0 }))).toBe(false)
    expect(isRealTrade(trade({ symbol: '' }))).toBe(false)
    expect(isRealTrade(trade({}))).toBe(true)
  })
})

describe('computeStats', () => {
  it('computes P&L from real trades only, excluding balance ops', () => {
    const stats = computeStats([
      trade({ net_profit: 200 }),
      trade({ net_profit: -50 }),
      trade({ symbol: 'BALANCE', lot_size: 0, net_profit: 5000 }), // deposit — must not count
    ])
    expect(stats.monthPnl).toBe(150)
    expect(stats.weekPnl).toBe(150)
    expect(stats.totalTrades).toBe(2)
  })

  it('excludes break-even trades from the win-rate denominator', () => {
    const stats = computeStats([
      trade({ net_profit: 100 }),   // win
      trade({ net_profit: -100 }),  // loss
      trade({ net_profit: 5 }),     // BE
      trade({ net_profit: -5 }),    // BE
    ])
    expect(stats.winRate).toBe(50)
  })

  it('computes profit factor, expectancy, avg win/loss', () => {
    const stats = computeStats([
      trade({ net_profit: 300 }),
      trade({ net_profit: 100 }),
      trade({ net_profit: -200 }),
    ])
    // grossWins=400, grossLosses=200
    expect(stats.profitFactor).toBe(2)
    expect(stats.avgWin).toBe(200)
    expect(stats.avgLoss).toBe(200)
    // expectancy = (2/3)*200 - (1/3)*200 = 66.67
    expect(stats.expectancy).toBeCloseTo(66.67, 1)
  })

  it('uses profit factor 99 when there are no losses', () => {
    const stats = computeStats([trade({ net_profit: 100 })])
    expect(stats.profitFactor).toBe(99)
  })

  it('tracks max consecutive wins/losses in chronological order, BE preserves streaks', () => {
    const mk = (i: number, pnl: number) =>
      trade({ net_profit: pnl, close_time: `2026-07-0${i}T10:00:00Z` })
    const stats = computeStats([
      mk(1, 100), mk(2, 100), mk(3, 5), mk(4, 100),   // W W BE W → streak 3
      mk(5, -100), mk(6, -100),                        // L L → streak 2
    ])
    expect(stats.maxConsecWins).toBe(3)
    expect(stats.maxConsecLosses).toBe(2)
  })

  it('computes realized R:R from entry/SL/exit', () => {
    const stats = computeStats([
      trade({
        trade_type: 'buy',
        open_price: 100, close_price: 106, stop_loss: 98, // risk 2, realized +6 → 3R
        net_profit: 600,
      }),
    ])
    expect(stats.avgRR).toBe(3)
  })

  it('max drawdown is worst single-day P&L', () => {
    const stats = computeStats([
      trade({ net_profit: -300, close_time: '2026-07-08T09:00:00Z' }),
      trade({ net_profit: -200, close_time: '2026-07-08T15:00:00Z' }), // same day: -500
      trade({ net_profit: -400, close_time: '2026-07-09T09:00:00Z' }),
      trade({ net_profit: 1000, close_time: '2026-07-10T09:00:00Z' }),
    ])
    expect(stats.maxDrawdown).toBe(-500)
  })

  it('buckets weeklyPnl into 7 Mon–Sun calendar weeks, oldest first', () => {
    const stats = computeStats([
      // NOW is Monday 2026-07-13 → current week starts 2026-07-13 00:00
      trade({ net_profit: 111, close_time: '2026-07-13T09:00:00Z' }), // current week
      trade({ net_profit: 222, close_time: '2026-07-10T09:00:00Z' }), // previous week (Mon 7/6–Sun 7/12)
    ])
    expect(stats.weeklyPnl).toHaveLength(7)
    expect(stats.weeklyPnl[6]).toBe(111)
    expect(stats.weeklyPnl[5]).toBe(222)
  })

  it('computes per-symbol and per-session win rates', () => {
    const stats = computeStats([
      trade({ symbol: 'XAUUSD', net_profit: 100, session: 'london' }),
      trade({ symbol: 'XAUUSD', net_profit: -100, session: 'london' }),
      trade({ symbol: 'NAS100', net_profit: 100, session: 'new_york' }),
    ])
    expect(stats.xauWinRate).toBe(50)
    expect(stats.nasWinRate).toBe(100)
    expect(stats.londonWinRate).toBe(50)
    expect(stats.nyWinRate).toBe(100)
  })
})
