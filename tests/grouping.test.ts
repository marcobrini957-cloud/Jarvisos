import { describe, it, expect } from 'vitest'
import { groupHoldings, hasMultipleLots } from '@/lib/portfolio/grouping'
import type { HoldingWithPrice } from '@/hooks/usePortfolio'

/** A priced lot. Cost and value are given directly, as the hook computes them. */
function lot(over: Partial<HoldingWithPrice> & { ticker: string }): HoldingWithPrice {
  return {
    id: Math.random().toString(36).slice(2),
    name: 'Test', asset_type: 'stock', quantity: 1, avg_buy_price: 100,
    currency: 'EUR', is_active: true,
    marketName: null,
    currentPrice: null, currentPriceEur: null, prevCloseEur: null,
    change1d: null, marketState: null,
    currentValueEur: null, pnlEur: null, pnlPct: null, costBasisEur: null,
    ...over,
  } as HoldingWithPrice
}

describe('hasMultipleLots', () => {
  it('spots a repeated instrument', () => {
    expect(hasMultipleLots([lot({ ticker: 'NVDA' }), lot({ ticker: 'NVDA' })])).toBe(true)
  })
  it('is false when every row is a different instrument', () => {
    expect(hasMultipleLots([lot({ ticker: 'NVDA' }), lot({ ticker: 'MSFT' })])).toBe(false)
    expect(hasMultipleLots([])).toBe(false)
  })
})

describe('groupHoldings', () => {
  it('rolls repeated lots into one line per instrument', () => {
    const g = groupHoldings([
      lot({ ticker: 'NVDA', quantity: 1,  costBasisEur: 148.84, currentValueEur: 170 }),
      lot({ ticker: 'NVDA', quantity: 2,  costBasisEur: 320,    currentValueEur: 340 }),
      lot({ ticker: 'MSFT', quantity: 1,  costBasisEur: 396,    currentValueEur: 350 }),
    ])
    expect(g).toHaveLength(2)
    const nvda = g.find(x => x.ticker === 'NVDA')!
    expect(nvda.lots).toHaveLength(2)
    expect(nvda.quantity).toBe(3)
    expect(nvda.costBasisEur).toBeCloseTo(468.84, 2)
    expect(nvda.currentValueEur).toBe(510)
    expect(nvda.pnlEur).toBeCloseTo(41.16, 2)
  })

  it('weights the average entry by size, not by lot count', () => {
    // 10 shares at €10 and 1 share at €100 → €200/11, not the €55 a naive mean gives
    const g = groupHoldings([
      lot({ ticker: 'X', quantity: 10, avg_buy_price: 10,  costBasisEur: 100 }),
      lot({ ticker: 'X', quantity: 1,  avg_buy_price: 100, costBasisEur: 100 }),
    ])
    expect(g[0].avgBuyPrice).toBeCloseTo(200 / 11, 4)
    expect(g[0].avgBuyPrice).not.toBeCloseTo(55, 1)
  })

  it('derives the group percentage from the summed cost, not an average of percentages', () => {
    const g = groupHoldings([
      lot({ ticker: 'X', quantity: 1, costBasisEur: 100,  currentValueEur: 200 }),  // +100%
      lot({ ticker: 'X', quantity: 1, costBasisEur: 1000, currentValueEur: 1000 }), //    0%
    ])
    // €1100 in, €1200 out → +9.09%, not the +50% a mean of the two would give
    expect(g[0].pnlPct).toBeCloseTo(9.09, 2)
  })

  it('keeps totals identical to the ungrouped rows', () => {
    const rows = [
      lot({ ticker: 'A', costBasisEur: 100, currentValueEur: 120 }),
      lot({ ticker: 'A', costBasisEur: 200, currentValueEur: 180 }),
      lot({ ticker: 'B', costBasisEur: 300, currentValueEur: 330 }),
    ]
    const sum = (xs: (number | null)[]) => xs.reduce<number>((a, b) => a + (b ?? 0), 0)
    const g = groupHoldings(rows)
    expect(sum(g.map(x => x.costBasisEur))).toBe(sum(rows.map(r => r.costBasisEur)))
    expect(sum(g.map(x => x.currentValueEur))).toBe(sum(rows.map(r => r.currentValueEur)))
  })

  it('survives a group where nothing is priced', () => {
    const g = groupHoldings([lot({ ticker: 'Z', quantity: 5 }), lot({ ticker: 'Z', quantity: 5 })])
    expect(g[0].quantity).toBe(10)
    expect(g[0].currentValueEur).toBeNull()
    expect(g[0].pnlEur).toBeNull()
    expect(g[0].pnlPct).toBeNull()
  })

  it('still totals the lots that do have a price when one is missing', () => {
    const g = groupHoldings([
      lot({ ticker: 'Z', costBasisEur: 100, currentValueEur: 150 }),
      lot({ ticker: 'Z' }),   // unpriced
    ])
    expect(g[0].currentValueEur).toBe(150)
    expect(g[0].costBasisEur).toBe(100)
  })

  it('takes price and day change from whichever lot has them', () => {
    const g = groupHoldings([
      lot({ ticker: 'Z' }),
      lot({ ticker: 'Z', currentPriceEur: 42, change1d: -1.5, marketState: 'REGULAR' }),
    ])
    expect(g[0].currentPriceEur).toBe(42)
    expect(g[0].change1d).toBe(-1.5)
    expect(g[0].marketState).toBe('REGULAR')
  })

  it('leaves a single-lot portfolio alone', () => {
    const g = groupHoldings([lot({ ticker: 'ONE', quantity: 7, costBasisEur: 70, currentValueEur: 80 })])
    expect(g).toHaveLength(1)
    expect(g[0].lots).toHaveLength(1)
    expect(g[0].quantity).toBe(7)
    expect(g[0].pnlEur).toBe(10)
  })

  it('carries a price-feed name through when the rows were saved without one', () => {
    const g = groupHoldings([
      lot({ ticker: 'CSSPX.MI', name: null }),
      lot({ ticker: 'CSSPX.MI', name: null, marketName: 'Core S&P 500 USD (Acc)' }),
    ])
    expect(g[0].name).toBeNull()
    expect(g[0].marketName).toBe('Core S&P 500 USD (Acc)')
  })

  it('does not divide by zero on a zero-cost group', () => {
    const g = groupHoldings([lot({ ticker: 'F', quantity: 0, costBasisEur: 0, currentValueEur: 0 })])
    expect(g[0].avgBuyPrice).toBeNull()
    expect(g[0].pnlPct).toBeNull()
  })
})
