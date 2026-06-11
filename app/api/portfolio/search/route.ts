import { NextRequest, NextResponse } from 'next/server'

// quoteTypes that are real market indices (^GSPC etc.) — we never want these
const EXCLUDED_TYPES = new Set(['CURRENCY', 'MUTUALFUND', 'OPTION', 'FUTURE'])

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (q.length < 2) return NextResponse.json({ results: [] })

  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=20&newsCount=0&enableFuzzyQuery=true`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept':     'application/json',
          'Referer':    'https://finance.yahoo.com/',
        },
        cache: 'no-store',
      }
    )
    if (!res.ok) return NextResponse.json({ results: [] })
    const data = await res.json()

    const results = (data.quotes ?? [])
      .filter((item: Record<string, unknown>) => {
        const type   = item.quoteType as string
        const symbol = item.symbol as string
        // Exclude real indices (symbol starts with ^) and unwanted types
        if (symbol?.startsWith('^')) return false
        if (EXCLUDED_TYPES.has(type))  return false
        return true
      })
      .slice(0, 8)
      .map((item: Record<string, unknown>) => {
        const type = item.quoteType as string
        // Normalise display type: INDEX → etp for leveraged products
        const displayType = type === 'INDEX' ? 'etp' : type.toLowerCase()
        return {
          ticker:   item.symbol   as string,
          name:     (item.shortname ?? item.longname ?? item.symbol) as string,
          exchange: item.exchange  as string,
          type:     displayType,
        }
      })

    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
