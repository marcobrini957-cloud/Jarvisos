import { NextResponse } from 'next/server'

const TROY_OZ_TO_GRAMS = 31.1034768

async function fetchSpot(yahooTicker: string): Promise<{ priceUsd: number; changePct: number }> {
  const encoded = encodeURIComponent(yahooTicker)
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=2d`,
    {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
      next: { revalidate: 60 },
    }
  )
  if (!res.ok) throw new Error(`Yahoo Finance ${yahooTicker} ${res.status}`)
  const data = await res.json()
  const meta = data?.chart?.result?.[0]?.meta
  if (!meta) throw new Error(`Yahoo Finance ${yahooTicker}: no meta`)
  const price     = meta.regularMarketPrice as number
  const prevClose = meta.chartPreviousClose as number
  const changePct = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0
  return { priceUsd: price, changePct }
}

async function fetchEurUsd(): Promise<number> {
  const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR', {
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`frankfurter ${res.status}`)
  const data = await res.json()
  return data.rates?.EUR ?? 0.92
}

// GET /api/metals/prices
export async function GET() {
  try {
    const [gold, silver, usdToEur] = await Promise.all([
      fetchSpot('GC=F'),
      fetchSpot('SI=F'),
      fetchEurUsd(),
    ])

    return NextResponse.json({
      'GC=F': {
        label:           'Gold',
        priceUsdPerOz:   gold.priceUsd,
        priceEurPerOz:   gold.priceUsd * usdToEur,
        priceEurPerGram: (gold.priceUsd * usdToEur) / TROY_OZ_TO_GRAMS,
        changePct:       gold.changePct,
        usdToEur,
      },
      'SI=F': {
        label:           'Silver',
        priceUsdPerOz:   silver.priceUsd,
        priceEurPerOz:   silver.priceUsd * usdToEur,
        priceEurPerGram: (silver.priceUsd * usdToEur) / TROY_OZ_TO_GRAMS,
        changePct:       silver.changePct,
        usdToEur,
      },
    })
  } catch (err: unknown) {
    console.error('[metals/prices]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
