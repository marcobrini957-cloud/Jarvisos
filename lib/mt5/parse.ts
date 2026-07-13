// Pure MT5 deal-parsing logic shared by /api/mt5-sync. No I/O — unit-tested in tests/mt5-parse.test.ts.

export function detectSession(isoTime: string): string {
  const d = new Date(isoTime)
  const mins = d.getUTCHours() * 60 + d.getUTCMinutes()
  // Official forex session hours (UTC, DST-independent):
  // New York:  13:30–22:00 UTC (NYSE 9:30 AM–4:00 PM ET)
  // London:    08:00–16:30 UTC (LSE 8:00 AM–4:30 PM UK)
  // Asian:     22:00–08:00 UTC
  // NY takes priority during London/NY overlap (13:30–16:30 UTC)
  if (mins >= 13 * 60 + 30 && mins < 22 * 60) return 'new_york'
  if (mins >= 8 * 60 && mins < 16 * 60 + 30)  return 'london'
  return 'asian'
}

export function calcPips(symbol: string, open: number, close: number, type: 'buy' | 'sell'): number {
  const diff = type === 'buy' ? close - open : open - close
  if (symbol.toUpperCase().includes('XAU') || symbol.toUpperCase().includes('GOLD')) {
    return parseFloat((diff * 10).toFixed(1))
  }
  if (symbol.toUpperCase().includes('NAS') || symbol.toUpperCase().includes('US100') ||
      symbol.toUpperCase().includes('SPX') || symbol.toUpperCase().includes('DOW')) {
    return parseFloat(diff.toFixed(1))
  }
  if (symbol.toUpperCase().includes('JPY')) {
    return parseFloat((diff / 0.01).toFixed(1))
  }
  return parseFloat((diff / 0.0001).toFixed(1))
}

export interface Deal {
  id: string
  type: string
  entryType?: string
  positionId?: string
  symbol?: string
  time: string
  price?: number
  volume?: number
  profit: number
  commission: number
  swap: number
  stopLoss?: number
  takeProfit?: number
  brokerComment?: string
  accountCurrencyExchangeRate?: number
}

export interface ScreenshotInfo {
  hasScreenshot: boolean
  alreadyFalse:  boolean
}

export function groupDealsByPosition(allDeals: Deal[]): Map<string, Deal[]> {
  const byPosition = new Map<string, Deal[]>()
  for (const deal of allDeals) {
    if (!deal.symbol) continue
    if (!['DEAL_TYPE_BUY', 'DEAL_TYPE_SELL'].includes(deal.type)) continue

    const pid  = deal.positionId!
    const list = byPosition.get(pid) ?? []
    list.push(deal)
    byPosition.set(pid, list)
  }
  return byPosition
}

export function buildClosedTradeRows(
  byPosition: Map<string, Deal[]>,
  screenshotMap: Map<number, ScreenshotInfo>,
  userId: string,
): { rows: Record<string, unknown>[]; newTrades: number; updatedTrades: number } {
  const rows: Record<string, unknown>[] = []
  let newTrades     = 0
  let updatedTrades = 0

  for (const [positionId, deals] of byPosition) {
    // Sort by time so we can fall back to positional entry/exit detection
    const sorted = [...deals].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

    // Primary: use entryType. Fallback: first deal = entry, rest = exits
    const entryDeal = sorted.find(d => d.entryType === 'DEAL_ENTRY_IN') ?? sorted[0]
    const exitDeals = sorted.filter(d => d.entryType === 'DEAL_ENTRY_OUT')
      .concat(
        // Fallback: if no DEAL_ENTRY_OUT found, treat all non-entry deals as exits
        sorted.filter(d => d.entryType === 'DEAL_ENTRY_OUT').length === 0
          ? sorted.slice(1)
          : []
      )

    if (!entryDeal || exitDeals.length === 0) continue

    const totalProfit     = exitDeals.reduce((s, d) => s + (d.profit     ?? 0), 0)
    const totalCommission = deals.reduce((s, d)    => s + (d.commission ?? 0), 0)
    const totalSwap       = exitDeals.reduce((s, d) => s + (d.swap       ?? 0), 0)
    const lastExit        = exitDeals[exitDeals.length - 1]

    const symbol    = entryDeal.symbol!
    const tradeType = entryDeal.type === 'DEAL_TYPE_BUY' ? 'buy' : 'sell'
    const openTime  = entryDeal.time
    const closeTime = lastExit.time
    const pips      = calcPips(symbol, entryDeal.price ?? 0, lastExit.price ?? 0, tradeType as 'buy' | 'sell')
    const duration  = Math.round((new Date(closeTime).getTime() - new Date(openTime).getTime()) / 60000)
    const ticket    = parseInt(positionId)
    const existing  = screenshotMap.get(ticket)
    // Never flip screenshot_missing back to true if user already has a screenshot or marked it done
    const screenshotMissing = existing
      ? (!existing.hasScreenshot && !existing.alreadyFalse)
      : true

    rows.push({
      user_id:            userId,
      mt5_ticket:         ticket,
      symbol,
      trade_type:         tradeType,
      lot_size:           entryDeal.volume,
      open_price:         entryDeal.price,
      close_price:        lastExit.price,
      stop_loss:          entryDeal.stopLoss  ?? null,
      take_profit:        entryDeal.takeProfit ?? null,
      open_time:          openTime,
      close_time:         closeTime,
      duration_minutes:   duration,
      pips,
      profit_usd:         totalProfit,
      commission:         totalCommission,
      swap:               totalSwap,
      net_profit:         totalProfit + totalCommission + totalSwap,
      status:             'closed',
      session:            detectSession(openTime),
      screenshot_missing: screenshotMissing,
    })

    if (screenshotMap.has(ticket)) updatedTrades++
    else newTrades++
  }

  return { rows, newTrades, updatedTrades }
}
