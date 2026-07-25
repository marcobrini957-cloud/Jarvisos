import { describe, it, expect } from 'vitest'
import { timeWeightedReturn, deriveStartBalance, periodReturnPct, type ReturnEvent } from '@/lib/trading/returns'

const trade   = (at: string, amount: number): ReturnEvent => ({ at, amount, kind: 'trade' })
const funding = (at: string, amount: number): ReturnEvent => ({ at, amount, kind: 'funding' })

describe('timeWeightedReturn', () => {
  it('equals simple return when there is no funding', () => {
    const events = [trade('2026-07-02', 50), trade('2026-07-03', 50)]
    // 1000 → 1050 → 1100 compounds to 10.0% only if measured on a flat base;
    // chained: (1+50/1000)(1+50/1050) = 1.05 * 1.047619 = 1.1 exactly
    expect(timeWeightedReturn(1000, events)).toBeCloseTo(10, 6)
  })

  it('ignores deposits as performance but respects them as capital', () => {
    const events = [
      trade('2026-07-02', 100),      // on 1000  → +10%
      funding('2026-07-03', 1000),   // base doubles, not a gain
      trade('2026-07-04', 100),      // on 2100  → +4.76%
    ]
    const pct = timeWeightedReturn(1000, events)
    expect(pct).toBeCloseTo((1.1 * (1 + 100 / 2100) - 1) * 100, 6)
    // and it must be well below the naive 200/1000 = 20%
    expect(pct).toBeLessThan(20)
  })

  it('treats a withdrawal the same way', () => {
    const events = [funding('2026-07-02', -500), trade('2026-07-03', 50)]
    expect(timeWeightedReturn(1000, events)).toBeCloseTo(10, 6)   // 50 on 500
  })

  it("matches MetaTrader's Growth for July 2026 on the real account", () => {
    // Ground truth pulled from the terminal: 1–25 July 2026, 29 closed trades
    // totalling +€233.22 with a €249.34 deposit on the 13th. The MT5 report
    // for that window reads 11.38%; simple division reads 12.43%.
    const julyTrades: [string, number][] = [
      ['2026-07-09T16:56:55Z',   -1.18], ['2026-07-10T16:27:10Z',   34.58],
      ['2026-07-10T16:30:17Z',   31.08], ['2026-07-13T16:44:49Z',    6.13],
      ['2026-07-15T18:24:11Z',   -6.56], ['2026-07-16T15:40:57Z',   46.26],
      ['2026-07-17T16:00:27Z',    0.96], ['2026-07-18T14:50:19Z',   -1.19],
      ['2026-07-18T14:50:35Z',   -0.24], ['2026-07-18T15:05:37Z',    0.02],
      ['2026-07-18T15:11:24Z',   -0.20], ['2026-07-18T15:17:55Z',    0.02],
      ['2026-07-18T15:37:02Z',   -0.17], ['2026-07-20T14:33:19Z',   -1.36],
      ['2026-07-20T15:00:44Z', -173.70], ['2026-07-21T13:35:02Z',   73.59],
      ['2026-07-21T15:48:53Z',   -4.64], ['2026-07-21T16:24:31Z',   10.52],
      ['2026-07-21T16:24:31Z',   10.52], ['2026-07-21T23:25:32Z',   -0.18],
      ['2026-07-22T15:01:31Z',    0.88], ['2026-07-22T15:34:58Z',  -18.93],
      ['2026-07-22T16:02:01Z',   32.78], ['2026-07-22T16:44:39Z',   -5.61],
      ['2026-07-22T17:26:36Z',   68.35], ['2026-07-23T10:58:36Z',   45.51],
      ['2026-07-23T15:54:36Z',   -1.76], ['2026-07-23T16:06:18Z',   63.63],
      ['2026-07-24T16:10:59Z',   24.11],
    ]
    const events: ReturnEvent[] = [
      ...julyTrades.map(([at, amt]) => trade(at, amt)),
      funding('2026-07-13T09:50:14Z', 249.34),
    ]

    const endBalance = 2358.19
    const start = deriveStartBalance(endBalance, events)
    expect(start).toBeCloseTo(1875.63, 2)

    const pct = periodReturnPct({ endBalance, events })
    expect(pct).toBeCloseTo(11.4, 1)          // MT5 reports 11.38%
    expect(Math.abs(pct - 11.38)).toBeLessThan(0.1)
  })

  it('returns 0 rather than dividing by nothing', () => {
    expect(timeWeightedReturn(0, [trade('2026-07-01', 10)])).toBe(0)
    expect(timeWeightedReturn(1000, [])).toBe(0)
    expect(timeWeightedReturn(1000, [funding('2026-07-01', 500)])).toBe(0)
  })
})
