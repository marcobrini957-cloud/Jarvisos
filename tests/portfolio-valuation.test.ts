import { describe, it, expect } from 'vitest'
import { valueHolding, portfolioTotals } from '@/lib/portfolio/valuation'

describe('valueHolding', () => {
  it('values a stock holding in EUR', () => {
    const v = valueHolding({ quantity: 10, avg_buy_price: 100 }, 120)
    expect(v.costBasisEur).toBe(1000)
    expect(v.currentValueEur).toBe(1200)
    expect(v.pnlEur).toBe(200)
    expect(v.pnlPct).toBe(20)
  })
  it('values a metal holding (grams × EUR/gram)', () => {
    const v = valueHolding({ quantity: 50, avg_buy_price: 60 }, 75)
    expect(v.currentValueEur).toBe(3750)
    expect(v.pnlEur).toBe(750)
    expect(v.pnlPct).toBe(25)
  })
  it('pnlPct is 0 when cost basis is missing (avoid division by zero)', () => {
    const v = valueHolding({ quantity: 10, avg_buy_price: null }, 120)
    expect(v.costBasisEur).toBe(0)
    expect(v.pnlPct).toBe(0)
  })
})

describe('portfolioTotals', () => {
  it('sums values, falling back to cost basis when no live price yet', () => {
    const t = portfolioTotals([
      { currentValueEur: 1200, costBasisEur: 1000 },
      { currentValueEur: null, costBasisEur: 500 },   // price not loaded → cost basis
      { currentValueEur: null, costBasisEur: null },   // no data → 0
    ])
    expect(t.totalValueEur).toBe(1700)
    expect(t.totalCostEur).toBe(1500)
    expect(t.totalPnlEur).toBe(200)
    expect(t.totalPnlPct).toBeCloseTo(13.33, 1)
  })
  it('handles empty portfolio', () => {
    const t = portfolioTotals([])
    expect(t.totalValueEur).toBe(0)
    expect(t.totalPnlPct).toBe(0)
  })
})
