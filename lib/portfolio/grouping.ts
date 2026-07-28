import type { HoldingWithPrice } from '@/hooks/usePortfolio'

/**
 * Rolling a portfolio's lots up per instrument.
 *
 * Buying the same ETF five times leaves five rows. The totals above the table
 * were always right — they sum every row — but the list itself showed NVDA
 * three times, pages apart, and nowhere said what the position in NVDA
 * actually is.
 *
 * This groups for **display only**. The lots stay in the database untouched,
 * because they are the record of what was paid and when: a merge would average
 * five purchase prices into one number and throw away the history behind it,
 * which is the part you need at tax time. Expand a group to see them again.
 */

export interface HoldingGroup {
  /** Instrument key — the ticker. */
  ticker:   string
  name:     string | null
  assetType: string
  /** The lots behind this line, in the order they came back. */
  lots:     HoldingWithPrice[]
  quantity: number
  /** Cost ÷ quantity across the lots — the real average entry for the position. */
  avgBuyPrice:     number | null
  currentPriceEur: number | null
  change1d:        number | null
  marketState:     string | null
  /** Sums. Null only when no lot in the group has a price. */
  currentValueEur: number | null
  costBasisEur:    number | null
  pnlEur:          number | null
  pnlPct:          number | null
}

function sumOrNull(values: (number | null)[]): number | null {
  const known = values.filter((v): v is number => v !== null)
  return known.length > 0 ? known.reduce((a, b) => a + b, 0) : null
}

export function groupHoldings(holdings: HoldingWithPrice[]): HoldingGroup[] {
  const buckets = new Map<string, HoldingWithPrice[]>()
  for (const h of holdings) {
    const arr = buckets.get(h.ticker)
    if (arr) arr.push(h)
    else buckets.set(h.ticker, [h])
  }

  return Array.from(buckets.values()).map(lots => {
    const first    = lots[0]
    const quantity = lots.reduce((n, l) => n + (l.quantity ?? 0), 0)
    const cost     = sumOrNull(lots.map(l => l.costBasisEur))
    const current  = sumOrNull(lots.map(l => l.currentValueEur))
    const pnl      = current !== null && cost !== null ? current - cost : null

    return {
      ticker:    first.ticker,
      name:      first.name ?? null,
      assetType: first.asset_type,
      lots,
      quantity,
      // Weighted by size, not a mean of the averages — a 10-share lot and a
      // 1-share lot do not weigh the same on the entry price.
      avgBuyPrice: cost !== null && quantity > 0 ? cost / quantity : null,
      // Price and day change belong to the instrument, so any priced lot answers.
      currentPriceEur: lots.find(l => l.currentPriceEur !== null)?.currentPriceEur ?? null,
      change1d:        lots.find(l => l.change1d !== null)?.change1d ?? null,
      marketState:     lots.find(l => l.marketState !== null)?.marketState ?? null,
      currentValueEur: current,
      costBasisEur:    cost,
      pnlEur:          pnl,
      pnlPct:          pnl !== null && cost !== null && cost !== 0 ? (pnl / cost) * 100 : null,
    }
  })
}

/** True when grouping would actually change what is on screen. */
export function hasMultipleLots(holdings: HoldingWithPrice[]): boolean {
  const seen = new Set<string>()
  for (const h of holdings) {
    if (seen.has(h.ticker)) return true
    seen.add(h.ticker)
  }
  return false
}
