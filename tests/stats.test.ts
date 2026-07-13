import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { tradeResult, computeStats, isRealTrade, BE_THRESHOLD } from '@/lib/trading/stats'
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

describe('tradeResult', () => {
  it('classifies wins, losses and break-evens around ±BE_THRESHOLD', () => {
    expect(tradeResult(BE_THRESHOLD + 0.01)).toBe('win')
    expect(tradeResult(BE_THRESHOLD)).toBe('breakeven')
    expect(tradeResult(0)).toBe('breakeven')
    expect(tradeResult(-BE_THRESHOLD)).toBe('breakeven')
    expect(tradeResult(-BE_THRESHOLD - 0.01)).toBe('loss')
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
