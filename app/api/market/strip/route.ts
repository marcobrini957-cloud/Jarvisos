import { NextResponse } from 'next/server'
import { rateLimit, clientIp } from '@/lib/api/rate-limit'

// ── Types ─────────────────────────────────────────────────────────────────────

interface StripItem {
  symbol:      string
  label:       string
  price:       number
  change1d:    number
  currency:    string
  marketState: string
}

interface CacheEntry {
  data:      StripItem[]
  fetchedAt: number
}

// ── Ticker config ─────────────────────────────────────────────────────────────

const TICKERS: Array<{ symbol: string; label: string; currency: string }> = [
  { symbol: 'SPY',     label: 'SPY', currency: 'USD' },
  { symbol: 'QQQ',     label: 'QQQ', currency: 'USD' },
  { symbol: 'BTC-USD', label: 'BTC', currency: 'USD' },
  { symbol: '^VIX',    label: 'VIX', currency: 'USD' },
]

// Landing-page hero ticker — trader-facing symbol set (labels match MT5 naming)
const LANDING_TICKERS: Array<{ symbol: string; label: string; currency: string }> = [
  { symbol: 'GC=F',     label: 'XAUUSD', currency: 'USD' },
  { symbol: '^NDX',     label: 'NAS100', currency: 'USD' },
  { symbol: 'EURUSD=X', label: 'EURUSD', currency: 'USD' },
  { symbol: 'GBPUSD=X', label: 'GBPUSD', currency: 'USD' },
  { symbol: '^DJI',     label: 'US30',   currency: 'USD' },
  { symbol: 'BTC-USD',  label: 'BTCUSD', currency: 'USD' },
  { symbol: 'USDJPY=X', label: 'USDJPY', currency: 'USD' },
  { symbol: '^GSPC',    label: 'SPX500', currency: 'USD' },
  { symbol: '^GDAXI',   label: 'GER40',  currency: 'EUR' },
  { symbol: 'SI=F',     label: 'XAGUSD', currency: 'USD' },
]

// ── Yahoo Finance headers ─────────────────────────────────────────────────────

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':     'application/json',
  'Referer':    'https://finance.yahoo.com/',
}

// ── Module-level cache (5 min TTL) ────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000
const cache        = new Map<string, CacheEntry>()

// ── Fetch a single ticker ─────────────────────────────────────────────────────

async function fetchTicker(
  symbol:   string,
  label:    string,
  currency: string,
): Promise<StripItem | null> {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`

    const res = await fetch(url, {
      headers: YF_HEADERS,
      // Disable Next.js fetch cache so we control TTL ourselves
      cache: 'no-store',
    })

    if (!res.ok) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json()

    const result = json?.chart?.result?.[0]
    if (!result) return null

    const meta: Record<string, unknown> = result.meta ?? {}

    const price = (meta.regularMarketPrice as number) ?? null
    if (price == null) return null

    const prevClose =
      (meta.chartPreviousClose as number) ??
      (meta.regularMarketPreviousClose as number) ??
      null

    const change1d =
      prevClose != null && prevClose !== 0
        ? ((price - prevClose) / prevClose) * 100
        : 0

    const marketState = (meta.marketState as string) ?? 'UNKNOWN'

    return {
      symbol,
      label,
      price,
      change1d,
      currency,
      marketState,
    }
  } catch {
    return null
  }
}

// ── GET handler ───────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  if (!rateLimit(`market:${clientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }
  const set      = new URL(req.url).searchParams.get('set') === 'landing' ? 'landing' : 'default'
  const tickers  = set === 'landing' ? LANDING_TICKERS : TICKERS
  const cacheKey = `market-strip:${set}`
  const now      = Date.now()
  const cached   = cache.get(cacheKey)

  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json({ items: cached.data })
  }

  const results = await Promise.all(
    tickers.map(t => fetchTicker(t.symbol, t.label, t.currency)),
  )

  const items: StripItem[] = results.filter((r): r is StripItem => r !== null)

  cache.set(cacheKey, { data: items, fetchedAt: now })

  return NextResponse.json({ items })
}
