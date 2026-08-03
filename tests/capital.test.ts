import { describe, it, expect } from 'vitest'
import { ownCapital, hasCredit } from '@/lib/trading/capital'

// Fixture is Marco's real account (login 5121585) as the EA reported it on
// 2026-08-03: balance 2679.74, equity 2819.74, credit 140.00, no open
// positions. Before this fix the product showed 2819.74 as his net worth.
const REAL = { balance: 2679.74, equity: 2819.74, credit: 140 }

describe('ownCapital', () => {
  it('excludes broker credit from the trader\'s capital', () => {
    expect(ownCapital(REAL.equity, REAL.credit)).toBeCloseTo(2679.74, 2)
  })

  it('with no open positions, own capital equals balance', () => {
    // The invariant that proves the split is right: equity = balance + credit
    // + floating P&L, so with nothing open the trader's money IS the balance.
    expect(ownCapital(REAL.equity, REAL.credit)).toBeCloseTo(REAL.balance, 2)
  })

  it('treats an unrecorded credit as unknown, not zero', () => {
    // Rows written before the column existed must not be silently "corrected".
    expect(ownCapital(2819.74, null)).toBeCloseTo(2819.74, 2)
    expect(ownCapital(2819.74, undefined)).toBeCloseTo(2819.74, 2)
  })

  it('passes equity through when the broker confirms zero credit', () => {
    expect(ownCapital(2679.74, 0)).toBeCloseTo(2679.74, 2)
  })

  it('never lets a bad credit value inflate the figure', () => {
    expect(ownCapital(1000, -500)).toBeCloseTo(1000, 2)
    expect(ownCapital(1000, Number.NaN)).toBeCloseTo(1000, 2)
  })

  it('handles a missing equity without producing NaN', () => {
    expect(ownCapital(null, 140)).toBe(0)
  })
})

describe('hasCredit', () => {
  it('is true only for a real positive credit', () => {
    expect(hasCredit(140)).toBe(true)
    expect(hasCredit(0)).toBe(false)
    expect(hasCredit(null)).toBe(false)
    expect(hasCredit(undefined)).toBe(false)
  })
})
