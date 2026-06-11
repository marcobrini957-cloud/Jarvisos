import { NextResponse } from 'next/server'

const TROY_OZ_TO_GRAMS = 31.1034768

async function fetchSpot(symbol: 'XAU' | 'XAG'): Promise<{ priceUsd: number; changePct: number }> {
  const res = await fetch(`https://api.gold-api.com/price/${symbol}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error(`gold-api.com ${symbol} ${res.status}`)
  const data = await res.json()
  // gold-api returns price in USD per troy oz
  // changePct not always present — calculate from price if needed
  return {
    priceUsd:  data.price as number,
    // gold-api returns chp = daily change %, ch = daily change in USD
    changePct: data.chp ?? (data.ch && data.price ? (data.ch / (data.price - data.ch)) * 100 : 0),
  }
}

async function fetchEurUsd(): Promise<number> {
  const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR', {
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`frankfurter ${res.status}`)
  const data = await res.json()
  // data.rates.EUR is how many EUR you get for 1 USD
  return data.rates?.EUR ?? 0.92
}

// GET /api/metals/prices
export async function GET() {
  try {
    const [gold, silver, usdToEur] = await Promise.all([
      fetchSpot('XAU'),
      fetchSpot('XAG'),
      fetchEurUsd(),
    ])

    return NextResponse.json({
      'GC=F': {
        label:          'Gold',
        priceUsdPerOz:  gold.priceUsd,
        priceEurPerOz:  gold.priceUsd * usdToEur,
        priceEurPerGram: (gold.priceUsd * usdToEur) / TROY_OZ_TO_GRAMS,
        changePct:      gold.changePct,
        usdToEur,
      },
      'SI=F': {
        label:          'Silver',
        priceUsdPerOz:  silver.priceUsd,
        priceEurPerOz:  silver.priceUsd * usdToEur,
        priceEurPerGram: (silver.priceUsd * usdToEur) / TROY_OZ_TO_GRAMS,
        changePct:      silver.changePct,
        usdToEur,
      },
    })
  } catch (err: unknown) {
    console.error('[metals/prices]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
