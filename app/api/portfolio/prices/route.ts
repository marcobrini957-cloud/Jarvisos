import { NextRequest, NextResponse } from 'next/server'

export interface QuoteResult {
  ticker:       string
  name:         string
  price:        number
  prevClose:    number
  change1d:     number
  currency:     string
  marketState:  string
  exchange:     string
}

// ── Module-level cache ────────────────────────────────────────────────────────
const CACHE_TTL  = 5 * 60 * 1000
const priceCache = new Map<string, { result: QuoteResult; ts: number }>()
let fxCache:     { eurUsd: number; ts: number } | null = null

function getCached(ticker: string): QuoteResult | null {
  const e = priceCache.get(ticker)
  return e && Date.now() - e.ts < CACHE_TTL ? e.result : null
}

const YF_HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':          'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin':          'https://finance.yahoo.com',
  'Referer':         'https://finance.yahoo.com/',
}

// ── EUR/USD from open.er-api.com (no rate limits, no auth needed) ─────────────
async function fetchEurUsd(): Promise<number> {
  if (fxCache && Date.now() - fxCache.ts < CACHE_TTL) return fxCache.eurUsd
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/EUR', { cache: 'no-store' })
    if (!res.ok) throw new Error(`FX ${res.status}`)
    const data = await res.json()
    const eurUsd = (data?.rates?.USD as number) ?? 1.08
    fxCache = { eurUsd, ts: Date.now() }
    return eurUsd
  } catch {
    return fxCache?.eurUsd ?? 1.08
  }
}

// ── Yahoo Finance v8 chart ────────────────────────────────────────────────────
async function fetchYahooV8(ticker: string): Promise<QuoteResult | null> {
  const cached = getCached(ticker)
  if (cached) return cached

  try {
    // Warm up the session for this ticker (helps bypass rate limiting)
    await fetch(`https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}/`, {
      headers: { ...YF_HEADERS, Accept: 'text/html,application/xhtml+xml' },
      cache:   'no-store',
    })

    const res = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`,
      { headers: YF_HEADERS, cache: 'no-store' }
    )

    if (!res.ok) {
      console.error(`[portfolio/prices] HTTP ${res.status} for ${ticker}`)
      return null
    }

    const data = await res.json()
    const meta = data?.chart?.result?.[0]?.meta as Record<string, unknown> | undefined
    if (!meta?.regularMarketPrice) {
      console.error(`[portfolio/prices] No price data for ${ticker}`)
      return null
    }

    const price     = meta.regularMarketPrice as number
    const prevClose = (meta.chartPreviousClose ?? meta.regularMarketPreviousClose ?? price) as number
    const change1d  = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0

    const result: QuoteResult = {
      ticker,
      name:        (meta.shortName ?? meta.longName ?? ticker) as string,
      price,
      prevClose,
      change1d,
      currency:    (meta.currency    ?? 'USD') as string,
      marketState: (meta.marketState ?? 'CLOSED') as string,
      exchange:    (meta.exchangeName ?? '') as string,
    }

    priceCache.set(ticker, { result, ts: Date.now() })
    console.log(`[portfolio/prices] ${ticker}: ${price} ${result.currency} (${change1d.toFixed(2)}%)`)
    return result

  } catch (e) {
    console.error(`[portfolio/prices] Exception for ${ticker}:`, e)
    return null
  }
}

// ── GET /api/portfolio/prices?tickers=NVDA,MSFT ──────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const tickersParam = req.nextUrl.searchParams.get('tickers') ?? ''
    const tickers = tickersParam.split(',').map(t => t.trim()).filter(Boolean)

    if (tickers.length === 0) {
      return NextResponse.json({ quotes: [], eurUsdRate: 1.08 })
    }

    console.log(`[portfolio/prices] Requested: ${tickers.join(', ')}`)

    const [eurUsd, ...priceResults] = await Promise.all([
      fetchEurUsd(),
      ...tickers.map(fetchYahooV8),
    ])

    const enriched = (priceResults.filter(Boolean) as QuoteResult[]).map(q => ({
      ...q,
      priceEur:     q.currency === 'EUR' ? q.price     : q.price     / eurUsd,
      prevCloseEur: q.currency === 'EUR' ? q.prevClose : q.prevClose / eurUsd,
      eurUsdRate:   eurUsd,
    }))

    console.log(`[portfolio/prices] Done — ${enriched.length}/${tickers.length} quotes, EUR/USD ${eurUsd.toFixed(4)}`)
    return NextResponse.json({ quotes: enriched, eurUsdRate: eurUsd })

  } catch (err: unknown) {
    console.error('[portfolio/prices] Route error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
