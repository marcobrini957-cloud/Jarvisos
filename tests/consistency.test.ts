import { describe, it, expect } from 'vitest'
import { calcConsistency } from '@/components/dashboard/tabs/trading/helpers'
import type { Trade } from '@/types'

// calcConsistency feeds two places that must always agree: the Consistency KPI
// card in the Trading tab and the Consistency axis on the TraderRadar. It moved
// out of TradingTab into shared helpers so they cannot drift apart.
const t = (close_time: string | null, net_profit: number | null): Trade =>
  ({ close_time, net_profit } as Trade)

describe('calcConsistency', () => {
  it('counts a day green when the day nets positive, not each trade', () => {
    // One bad trade and two good ones on the same day = one green day.
    const { green, totalDays, pct } = calcConsistency([
      t('2026-08-01T09:00:00Z', -50),
      t('2026-08-01T11:00:00Z', 30),
      t('2026-08-01T14:00:00Z', 40),
    ])
    expect(totalDays).toBe(1)
    expect(green).toBe(1)
    expect(pct).toBe(100)
  })

  it('ignores days with no trades', () => {
    // Two traded days a week apart — the six untraded days in between must not
    // count against the trader.
    const { green, totalDays, pct } = calcConsistency([
      t('2026-08-01T09:00:00Z', 100),
      t('2026-08-08T09:00:00Z', -100),
    ])
    expect(totalDays).toBe(2)
    expect(green).toBe(1)
    expect(pct).toBe(50)
  })

  it('treats an exactly flat day as not green', () => {
    const { green, totalDays } = calcConsistency([
      t('2026-08-01T09:00:00Z', 50),
      t('2026-08-01T10:00:00Z', -50),
    ])
    expect(totalDays).toBe(1)
    expect(green).toBe(0)
  })

  it('skips trades with no close time rather than bucketing them together', () => {
    const { totalDays } = calcConsistency([
      t(null, 100),
      t('2026-08-01T09:00:00Z', 100),
    ])
    expect(totalDays).toBe(1)
  })

  it('is 0% with no trades at all, never NaN', () => {
    expect(calcConsistency([])).toEqual({ green: 0, totalDays: 0, pct: 0 })
  })
})
