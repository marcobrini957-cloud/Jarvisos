import { NextRequest, NextResponse } from 'next/server'

// POST /api/portfolio/isin
// Body: { isins: string[] }
// Returns: { results: Record<string, { ticker: string; name: string } | null> }
//
// Strategy:
// 1. Batch-resolve ISIN → ticker/name via OpenFIGI (25 req/min free, up to 100 per call)
// 2. For each result, validate ticker via Yahoo Finance search (YF supports ISIN queries too)
//    — First try searching the ISIN directly on Yahoo Finance (most reliable for ETFs)
//    — If that yields a result, use that symbol (it's already YF-canonical)
//    — Otherwise fall back to the OpenFIGI ticker and hope it works
// This ensures CSV-imported holdings get the exact same Yahoo Finance ticker
// that the manual TickerSearch flow would produce.

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':     'application/json',
  'Referer':    'https://finance.yahoo.com/',
}

const EXCLUDED_TYPES = new Set(['CURRENCY', 'MUTUALFUND', 'OPTION', 'FUTURE'])

async function searchYahoo(query: string): Promise<{ ticker: string; name: string } | null> {
  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&enableFuzzyQuery=false`,
      { headers: YF_HEADERS, cache: 'no-store' }
    )
    if (!res.ok) return null
    const data = await res.json()
    const quotes = (data.quotes ?? []) as Array<Record<string, unknown>>
    const hit = quotes.find(q => {
      const sym  = q.symbol as string
      const type = q.quoteType as string
      if (!sym || sym.startsWith('^')) return false
      if (EXCLUDED_TYPES.has(type)) return false
      return true
    })
    if (!hit) return null
    return {
      ticker: hit.symbol as string,
      name:   ((hit.shortname ?? hit.longname ?? hit.symbol) as string),
    }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { isins } = await req.json() as { isins: string[] }
    if (!Array.isArray(isins) || isins.length === 0) {
      return NextResponse.json({ results: {} })
    }

    // ── Step 1: OpenFIGI batch resolve ────────────────────────────────────────
    const body = isins.map(isin => ({ idType: 'ID_ISIN', idValue: isin }))

    const figiRes = await fetch('https://api.openfigi.com/v3/mapping', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })

    let figiData: Array<{ data?: Array<{ ticker: string; name: string; exchCode: string }> } | { error: string }> = []
    if (figiRes.ok) {
      figiData = await figiRes.json()
    }

    // ── Step 2: For each ISIN, get the best OpenFIGI candidate ───────────────
    const figiCandidates: Array<{ ticker: string; name: string } | null> = isins.map((_, i) => {
      const entry = figiData[i]
      if (!entry || 'error' in entry || !entry.data?.length) return null
      const best = entry.data.find(d => ['US', 'UN', 'UA', 'UQ'].includes(d.exchCode))
               ?? entry.data.find(d => d.ticker && d.ticker.length <= 6)
               ?? entry.data[0]
      return { ticker: best.ticker, name: best.name }
    })

    // ── Step 3: Yahoo Finance validation (parallel) ───────────────────────────
    // Try the ISIN itself first (YF understands ISINs for ETFs/stocks),
    // then fall back to the OpenFIGI ticker.
    const results: Record<string, { ticker: string; name: string } | null> = {}

    await Promise.all(isins.map(async (isin, i) => {
      const figi = figiCandidates[i]

      // Always try ISIN directly on Yahoo Finance first
      const byIsin = await searchYahoo(isin)
      if (byIsin) {
        results[isin] = byIsin
        return
      }

      // If ISIN search failed, try the OpenFIGI ticker
      if (figi?.ticker) {
        const byTicker = await searchYahoo(figi.ticker)
        if (byTicker) {
          results[isin] = byTicker
          return
        }
        // Last resort: trust OpenFIGI ticker as-is (manual fallback)
        results[isin] = figi
        return
      }

      results[isin] = null
    }))

    return NextResponse.json({ results })
  } catch (err) {
    console.error('[isin]', err)
    return NextResponse.json({ results: {} })
  }
}
