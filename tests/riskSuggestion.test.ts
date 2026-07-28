import { describe, it, expect } from 'vitest'
import type { Trade } from '@/types'
import {
  suggestDailyLoss, dailyPnl, niceRound, MIN_PCT, MAX_PCT, FALLBACK_PCT,
} from '@/lib/trading/riskSuggestion'

function trade(net: number, close: string): Trade {
  return {
    symbol: 'XAUUSD', trade_type: 'buy', status: 'closed', lot_size: 0.1,
    net_profit: net, close_time: close,
  } as Trade
}
function balanceOp(net: number, close: string): Trade {
  return {
    symbol: 'BALANCE', trade_type: 'balance', status: 'closed', lot_size: 0,
    net_profit: net, close_time: close,
  } as unknown as Trade
}
/** n losing days of the given size, one per day from 2026-06-01. */
function losingDays(sizes: number[]): Trade[] {
  return sizes.map((s, i) => trade(-s, `2026-06-${String(i + 1).padStart(2, '0')}T12:00:00Z`))
}

describe('dailyPnl', () => {
  it('nets trades within a day and keeps days apart', () => {
    const d = dailyPnl([
      trade(100, '2026-07-01T09:00:00Z'),
      trade(-40, '2026-07-01T15:00:00Z'),
      trade(-70, '2026-07-02T09:00:00Z'),
    ])
    expect(d.get('2026-07-01')).toBe(60)
    expect(d.get('2026-07-02')).toBe(-70)
  })

  it('ignores balance operations, open trades and unpriced rows', () => {
    const d = dailyPnl([
      trade(100, '2026-07-01T09:00:00Z'),
      balanceOp(5000, '2026-07-01T10:00:00Z'),
      { ...trade(50, '2026-07-01T11:00:00Z'), status: 'open' } as Trade,
      { ...trade(0, '2026-07-01T12:00:00Z'), net_profit: null } as Trade,
    ])
    expect(d.get('2026-07-01')).toBe(100)
  })

  it("groups by the trader's clock, not UTC", () => {
    // 22:30 UTC on 30 June is 00:30 on 1 July in Vienna.
    const d = dailyPnl([trade(-50, '2026-06-30T22:30:00Z')])
    expect([...d.keys()]).toEqual(['2026-07-01'])
  })
})

describe('niceRound', () => {
  it('rounds to a number a person would type', () => {
    expect(niceRound(43)).toBe(40)
    expect(niceRound(47)).toBe(50)
    expect(niceRound(312)).toBe(300)
    expect(niceRound(1234)).toBe(1250)
    expect(niceRound(6180)).toBe(6200)
  })
  it('never rounds a positive suggestion down to zero', () => {
    expect(niceRound(3)).toBe(10)
    expect(niceRound(0)).toBe(0)
  })
})

describe('suggestDailyLoss', () => {
  it('anchors on the typical losing day, not the worst one', () => {
    // median of 40/50/60/70/500 is 60 → 1.5× = 90 → rounds to 90
    const s = suggestDailyLoss(losingDays([40, 50, 60, 70, 500]), 10000)!
    expect(s.basis).toBe('history')
    expect(s.medianLoss).toBe(60)
    expect(s.amount).toBe(90)
    // the outlier day is caught, the ordinary ones are not
    expect(s.wouldHaveStopped).toBe(1)
  })

  it('sits above an ordinary red day so it does not trip on noise', () => {
    const sizes = [80, 100, 100, 120]
    const s = suggestDailyLoss(losingDays(sizes), 20000)!
    expect(s.amount).toBeGreaterThan(median(sizes))
    expect(s.wouldHaveStopped).toBe(0)
  })

  it('falls back to a share of the account when history is too thin', () => {
    const s = suggestDailyLoss(losingDays([50, 60]), 10000)!
    expect(s.basis).toBe('account')
    expect(s.amount).toBe(10000 * FALLBACK_PCT / 100)
    expect(s.rationale).toContain('Not enough losing days')
  })

  it('caps a reckless suggestion at a share of the account', () => {
    // median 800 → 1.5× = 1200, but 3% of 10k is 300
    const s = suggestDailyLoss(losingDays([700, 800, 800, 900]), 10000)!
    expect(s.basis).toBe('cap')
    expect(s.amount).toBe(10000 * MAX_PCT / 100)
  })

  it('holds a floor rather than suggesting a stop hit by noise', () => {
    // median 8 → 1.5× = 12, but 0.5% of 50k is 250
    const s = suggestDailyLoss(losingDays([6, 8, 8, 10]), 50000)!
    expect(s.basis).toBe('floor')
    expect(s.amount).toBe(50000 * MIN_PCT / 100)
  })

  it('still suggests from history when no account is connected', () => {
    const s = suggestDailyLoss(losingDays([40, 50, 60, 70]), null)!
    expect(s.basis).toBe('history')
    expect(s.pct).toBeNull()
  })

  it('returns null when it cannot say anything honest', () => {
    expect(suggestDailyLoss([], null)).toBeNull()
    expect(suggestDailyLoss(losingDays([50]), null)).toBeNull()
    expect(suggestDailyLoss([], 0)).toBeNull()
  })

  it('reports the percentage against the balance', () => {
    const s = suggestDailyLoss(losingDays([40, 50, 60, 70, 500]), 10000)!
    expect(s.pct).toBe(0.9)
  })

  it('ignores winning days when reading the typical loss', () => {
    const ts = [
      ...losingDays([40, 50, 60, 70]),
      trade(900, '2026-06-20T12:00:00Z'),
      trade(800, '2026-06-21T12:00:00Z'),
    ]
    const s = suggestDailyLoss(ts, 10000)!
    expect(s.losingDays).toBe(4)
    expect(s.medianLoss).toBe(55)
  })
})

function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
