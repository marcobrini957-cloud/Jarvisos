import { NextRequest, NextResponse } from 'next/server'

export interface QuoteResult {
  ticker:       string
  name:         string
  price:        number
  prevClose:    number
  change1d:     number   // percentage
  currency:     string
  marketState:  string
  exchange:     string
}

async function fetchYahooQuotes(tickers: string[]): Promise<QuoteResult[]> {
  if (tickers.length === 0) return []

  const symbols = tickers.join(',')
  const url     = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=regularMarketPrice,regularMarketPreviousClose,regularMarketChangePercent,longName,shortName,currency,marketState,fullExchangeName`

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept':     'application/json',
    },
    next: { revalidate: 300 }, // cache 5 min
  })

  if (!res.ok) throw new Error(`Yahoo Finance ${res.status}`)

  const data = await res.json()
  const results = data?.quoteResponse?.result ?? []

  return results.map((q: Record<string, unknown>) => ({
    ticker:      (q.symbol       as string) ?? '',
    name:        (q.longName     as string) ?? (q.shortName as string) ?? (q.symbol as string) ?? '',
    price:       (q.regularMarketPrice             as number) ?? 0,
    prevClose:   (q.regularMarketPreviousClose      as number) ?? 0,
    change1d:    (q.regularMarketChangePercent       as number) ?? 0,
    currency:    (q.currency                         as string) ?? 'USD',
    marketState: (q.marketState                      as string) ?? 'CLOSED',
    exchange:    (q.fullExchangeName                 as string) ?? '',
  }))
}

// GET /api/portfolio/prices?tickers=NVDA,MSFT,IQQW.DE
export async function GET(req: NextRequest) {
  try {
    const tickersParam = req.nextUrl.searchParams.get('tickers') ?? ''
    const tickers = tickersParam.split(',').map(t => t.trim()).filter(Boolean)

    if (tickers.length === 0) {
      return NextResponse.json({ quotes: [] })
    }

    // Always include EUR/USD exchange rate for conversion
    const allTickers = [...tickers]
    if (!allTickers.includes('EURUSD=X')) allTickers.push('EURUSD=X')

    const quotes  = await fetchYahooQuotes(allTickers)
    const fxQuote = quotes.find(q => q.ticker === 'EURUSD=X')
    const eurUsd  = fxQuote?.price ?? 1.08   // fallback EUR/USD rate

    // Add EUR-converted values
    const enriched = quotes
      .filter(q => q.ticker !== 'EURUSD=X')
      .map(q => ({
        ...q,
        priceEur:    q.currency === 'EUR' ? q.price    : q.price    / eurUsd,
        prevCloseEur:q.currency === 'EUR' ? q.prevClose: q.prevClose / eurUsd,
        eurUsdRate:  eurUsd,
      }))

    return NextResponse.json({ quotes: enriched, eurUsdRate: eurUsd })
  } catch (err: unknown) {
    console.error('[portfolio/prices]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
