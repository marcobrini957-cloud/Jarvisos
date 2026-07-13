// Pure portfolio valuation math — no React, no fetch. Unit-tested in tests/portfolio-valuation.test.ts.
import type { PortfolioHolding } from '@/types'

export interface Valuation {
  costBasisEur:    number
  currentValueEur: number
  pnlEur:          number
  pnlPct:          number
}

// avg_buy_price is always stored in EUR (entered via Trade Republic / our form).
// For metals: quantity = grams, priceEur = EUR/gram. For stocks: quantity = shares, priceEur = EUR/share.
export function valueHolding(h: Pick<PortfolioHolding, 'quantity' | 'avg_buy_price'>, priceEur: number): Valuation {
  const costBasisEur    = h.quantity * (h.avg_buy_price ?? 0)
  const currentValueEur = h.quantity * priceEur
  const pnlEur          = currentValueEur - costBasisEur
  const pnlPct          = costBasisEur > 0 ? (pnlEur / costBasisEur) * 100 : 0
  return { costBasisEur, currentValueEur, pnlEur, pnlPct }
}

export function portfolioTotals(
  holdings: Array<{ currentValueEur: number | null; costBasisEur: number | null }>,
): { totalValueEur: number; totalCostEur: number; totalPnlEur: number; totalPnlPct: number } {
  const totalValueEur = holdings.reduce((s, h) => s + (h.currentValueEur ?? h.costBasisEur ?? 0), 0)
  const totalCostEur  = holdings.reduce((s, h) => s + (h.costBasisEur ?? 0), 0)
  const totalPnlEur   = totalValueEur - totalCostEur
  const totalPnlPct   = totalCostEur > 0 ? (totalPnlEur / totalCostEur) * 100 : 0
  return { totalValueEur, totalCostEur, totalPnlEur, totalPnlPct }
}
