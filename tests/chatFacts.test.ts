import { describe, it, expect } from 'vitest'
import type { Trade } from '@/types'
import {
  decided, realClosedTrades, monthlyFacts, groupBy, segmentLine, describeWindow,
} from '@/lib/ai/chatFacts'

/** Minimal closed trade; only the fields the fact builder reads. */
function trade(net: number, close: string, extra: Partial<Trade> = {}): Trade {
  return {
    symbol: 'XAUUSD', trade_type: 'buy', status: 'closed', lot_size: 0.1,
    net_profit: net, close_time: close, ...extra,
  } as Trade
}

/** A deposit or withdrawal as MT5 records it: no lot, symbol BALANCE. */
function balanceOp(net: number, close: string): Trade {
  return {
    symbol: 'BALANCE', trade_type: 'balance', status: 'closed', lot_size: 0,
    net_profit: net, close_time: close,
  } as unknown as Trade
}

describe('decided — the win-rate denominator', () => {
  it("reproduces Marco's July: 86.7%, not the 41.2% the Analyst reported", () => {
    // His real shape, from the database: 32 real trades — 13W / 2L / 17 BE —
    // plus 2 balance operations, one of them a deposit.
    //
    // The old builder counted the deposit as a win (net_profit > BE_THRESHOLD,
    // no isRealTrade filter) and divided by all 34 rows: 14/34 = 41.2%, which
    // is precisely the figure he was shown. The rule gives 13/(13+2).
    const real = [
      ...Array.from({ length: 13 }, (_, i) => trade(120, `2026-07-${String(i + 1).padStart(2, '0')}T10:00:00Z`)),
      ...Array.from({ length: 2 },  (_, i) => trade(-80, `2026-07-1${i + 4}T10:00:00Z`)),
      ...Array.from({ length: 17 }, (_, i) => trade(2,   `2026-07-${String(i + 10).padStart(2, '0')}T11:00:00Z`)),
    ]
    const rows = [...real, balanceOp(5000, '2026-07-08T10:00:00Z'), balanceOp(-200, '2026-07-09T10:00:00Z')]

    expect(rows).toHaveLength(34)
    const d = decided(realClosedTrades(rows))
    expect(d.trades).toBe(32)
    expect(d.wins).toBe(13)
    expect(d.losses).toBe(2)
    expect(d.breakEven).toBe(17)
    expect(d.winRate).toBe(86.7)
    expect(d.winRate).not.toBe(41.2)
    // and the deposit must not reach the P&L either: 13×120 − 2×80 + 17×2
    expect(d.netPnl).toBe(1434)
    expect(d.netPnl).not.toBe(1434 + 5000 - 200)
  })

  it("calls a 3W/0L month 100%, not 23.1% — the documented past failure", () => {
    const ts = [
      trade(90, '2026-07-01T10:00:00Z'),
      trade(60, '2026-07-02T10:00:00Z'),
      trade(45, '2026-07-03T10:00:00Z'),
      ...Array.from({ length: 10 }, (_, i) => trade(1, `2026-07-1${i % 10}T10:00:00Z`)),
    ]
    const d = decided(ts)
    expect(d.decided).toBe(3)
    expect(d.breakEven).toBe(10)
    expect(d.winRate).toBe(100)
    expect(d.netPnl).toBeGreaterThan(0)
  })

  it('treats ±€10 as the break-even band, exclusive at the edges', () => {
    expect(decided([trade(10, '2026-07-01T10:00:00Z')]).decided).toBe(0)
    expect(decided([trade(-10, '2026-07-01T10:00:00Z')]).decided).toBe(0)
    expect(decided([trade(10.01, '2026-07-01T10:00:00Z')]).wins).toBe(1)
    expect(decided([trade(-10.01, '2026-07-01T10:00:00Z')]).losses).toBe(1)
  })

  it('reports 0%, not NaN, when nothing was decided', () => {
    expect(decided([]).winRate).toBe(0)
    expect(decided([trade(0, '2026-07-01T10:00:00Z')]).winRate).toBe(0)
  })
})

describe('realClosedTrades', () => {
  it('drops balance operations so a deposit is never a win', () => {
    const rows = [
      trade(100, '2026-07-01T10:00:00Z'),
      balanceOp(5000, '2026-07-02T10:00:00Z'),   // deposit
      balanceOp(-800, '2026-07-03T10:00:00Z'),   // withdrawal
      trade(-50, '2026-07-04T10:00:00Z'),
    ]
    const real = realClosedTrades(rows)
    expect(real).toHaveLength(2)
    const d = decided(real)
    expect(d.winRate).toBe(50)
    expect(d.netPnl).toBe(50)                    // not 4250
  })

  it('drops open trades and unpriced rows', () => {
    const rows = [
      trade(100, '2026-07-01T10:00:00Z'),
      { ...trade(0, '2026-07-02T10:00:00Z'), status: 'open' } as Trade,
      { ...trade(0, '2026-07-03T10:00:00Z'), net_profit: null } as Trade,
    ]
    expect(realClosedTrades(rows)).toHaveLength(1)
  })
})

describe('monthlyFacts — calendar months, not a rolling window', () => {
  const ts = [
    trade(100, '2026-07-05T10:00:00Z'),
    trade(-40, '2026-07-20T10:00:00Z'),
    trade(3,   '2026-07-21T10:00:00Z'),   // break-even
    trade(-70, '2026-06-15T10:00:00Z'),
    trade(-30, '2026-06-16T10:00:00Z'),
    trade(200, '2026-05-02T10:00:00Z'),
  ]

  it('buckets by calendar month, newest first', () => {
    const m = monthlyFacts(ts)
    expect(m.map(x => x.key)).toEqual(['2026-07', '2026-06', '2026-05'])
    expect(m[0].label).toBe('July 2026')
  })

  it('scopes the rate to the month, excluding that month break-even', () => {
    const july = monthlyFacts(ts).find(m => m.key === '2026-07')!
    expect(july.trades).toBe(3)
    expect(july.decided).toBe(2)
    expect(july.breakEven).toBe(1)
    expect(july.winRate).toBe(50)
    expect(july.netPnl).toBe(63)
  })

  it('does not bleed June trades into July', () => {
    const june = monthlyFacts(ts).find(m => m.key === '2026-06')!
    expect(june.trades).toBe(2)
    expect(june.winRate).toBe(0)
    expect(june.netPnl).toBe(-100)
  })

  it("buckets in the trader's clock, not the server's UTC", () => {
    // 00:30 on 1 July in Vienna is 22:30 on 30 June UTC. The dashboard counts
    // it as July, so the Analyst must too.
    const justAfterMidnightVienna = trade(50, '2026-06-30T22:30:00Z')
    const m = monthlyFacts([justAfterMidnightVienna])
    expect(m[0].key).toBe('2026-07')
    expect(monthlyFacts([justAfterMidnightVienna], 6, 'UTC')[0].key).toBe('2026-06')
  })

  it('honours the limit and ignores trades with no close time', () => {
    expect(monthlyFacts(ts, 2)).toHaveLength(2)
    const withNull = [...ts, { ...trade(50, ''), close_time: null } as Trade]
    expect(monthlyFacts(withNull).reduce((s, m) => s + m.trades, 0)).toBe(ts.length)
  })
})

describe('rendering', () => {
  it('states the excluded break-evens so the model cannot silently re-derive', () => {
    const line = describeWindow(decided([
      trade(100, '2026-07-01T10:00:00Z'),
      trade(-50, '2026-07-02T10:00:00Z'),
      trade(2,   '2026-07-03T10:00:00Z'),
    ]), 'LAST 30 DAYS')
    expect(line).toContain('50% win rate (1W/1L)')
    expect(line).toContain('1 break-even trade excluded')
  })

  it('segments carry their own denominator', () => {
    expect(segmentLine('london', decided([
      trade(100, '2026-07-01T10:00:00Z'),
      trade(4,   '2026-07-02T10:00:00Z'),
    ]))).toBe('london: 100% WR (1W/0L, 1 BE excluded), €+104')
  })

  it('says so plainly when a segment has nothing decided', () => {
    expect(segmentLine('ny', decided([trade(1, '2026-07-01T10:00:00Z')])))
      .toContain('no decided trades')
  })

  it('groupBy skips null keys rather than inventing a bucket', () => {
    const g = groupBy(
      [trade(1, '2026-07-01T10:00:00Z', { session: 'london' }),
       trade(1, '2026-07-02T10:00:00Z', { session: null })],
      t => t.session,
    )
    expect([...g.keys()]).toEqual(['london'])
  })
})
