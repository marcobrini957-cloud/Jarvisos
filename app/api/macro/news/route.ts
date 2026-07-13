import { NextResponse } from 'next/server'
import { rateLimit, clientIp } from '@/lib/api/rate-limit'

export interface NewsItem {
  id:        string
  headline:  string
  time:      string
  category:  string
  priority:  'high' | 'normal'
}

// Financial Juice public headlines API
async function fetchFinancialJuice(): Promise<NewsItem[]> {
  try {
    const res = await fetch(
      'https://headlines.financialjuice.com/home-page-headlines?count=30&hideOld=true&after=0',
      { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }, next: { revalidate: 60 } }
    )
    if (!res.ok) throw new Error(`FJ ${res.status}`)
    const data = await res.json()

    // FJ returns array of headline objects
    const items: Array<{ ID?: string; Headline?: string; headline?: string; Time?: string; time?: string; Priority?: number; priority?: number; Category?: string }> = Array.isArray(data) ? data : (data.headlines ?? data.items ?? [])

    return items.slice(0, 25).map((item, i) => ({
      id:       item.ID ?? String(i),
      headline: item.Headline ?? item.headline ?? '',
      time:     item.Time     ?? item.time     ?? new Date().toISOString(),
      category: item.Category ?? detectCategory(item.Headline ?? item.headline ?? ''),
      priority: (((item.Priority ?? item.priority ?? 0) >= 1) ? 'high' : 'normal') as 'high' | 'normal',
    })).filter(i => i.headline.length > 5)
  } catch (err) {
    console.error('[financial-juice]', err)
    return []
  }
}

function detectCategory(headline: string): string {
  const h = headline.toLowerCase()
  if (h.includes('gold') || h.includes('xau') || h.includes('silver'))    return 'Gold'
  if (h.includes('nasdaq') || h.includes('tech') || h.includes('nvda') || h.includes('s&p')) return 'Stocks'
  if (h.includes('fed') || h.includes('fomc') || h.includes('powell'))    return 'Fed'
  if (h.includes('ecb') || h.includes('lagarde') || h.includes('euro'))   return 'ECB'
  if (h.includes('oil') || h.includes('opec') || h.includes('energy'))    return 'Energy'
  if (h.includes('inflation') || h.includes('cpi') || h.includes('pce'))  return 'Inflation'
  if (h.includes('gdp') || h.includes('recession') || h.includes('growth')) return 'Economy'
  if (h.includes('china') || h.includes('asia'))                           return 'Asia'
  if (h.includes('ukraine') || h.includes('russia') || h.includes('war')) return 'Geopolitical'
  return 'Markets'
}

// ── Smart bias logic ──────────────────────────────────────────────────────────

interface Bias { gold: 'bullish' | 'bearish' | 'neutral'; nasdaq: 'bullish' | 'bearish' | 'neutral'; dxy: 'bullish' | 'bearish' | 'neutral'; reason: string }

function deriveBias(headlines: NewsItem[]): Bias {
  const text    = headlines.map(h => h.headline.toLowerCase()).join(' ')
  let goldScore   = 0  // positive = bullish
  let nasdaqScore = 0
  let dxyScore    = 0

  // Bullish gold signals
  if (text.includes('rate cut') || text.includes('dovish') || text.includes('rate cuts'))   { goldScore += 2; nasdaqScore += 1; dxyScore -= 2 }
  if (text.includes('inflation') && (text.includes('rise') || text.includes('hot') || text.includes('high'))) { goldScore += 1; dxyScore += 1 }
  if (text.includes('geopolit') || text.includes('war') || text.includes('conflict') || text.includes('crisis')) { goldScore += 2; nasdaqScore -= 1 }
  if (text.includes('safe haven') || text.includes('flight to safety'))                      { goldScore += 2; nasdaqScore -= 1 }
  if (text.includes('central bank buy') || text.includes('gold demand') || text.includes('gold reserve')) { goldScore += 2 }
  if (text.includes('weak dollar') || text.includes('dollar fall') || text.includes('usd down')) { goldScore += 1; dxyScore -= 2 }
  if (text.includes('recession') || text.includes('slowdown'))                               { goldScore += 1; nasdaqScore -= 2 }

  // Bearish gold signals
  if (text.includes('rate hike') || text.includes('hawkish') || text.includes('tighten'))   { goldScore -= 2; nasdaqScore -= 1; dxyScore += 2 }
  if (text.includes('strong dollar') || text.includes('dollar rally') || text.includes('usd rise')) { goldScore -= 1; dxyScore += 2 }
  if (text.includes('risk on') || text.includes('risk appetite'))                            { goldScore -= 1; nasdaqScore += 2 }

  // Bullish nasdaq signals
  if (text.includes('earnings beat') || text.includes('strong earnings'))                    { nasdaqScore += 2 }
  if (text.includes('ai') && (text.includes('growth') || text.includes('boom') || text.includes('demand'))) { nasdaqScore += 1 }
  if (text.includes('rate cut'))                                                              { nasdaqScore += 1 }

  // Bearish nasdaq signals
  if (text.includes('tech selloff') || text.includes('tech sell') || text.includes('nasdaq down')) { nasdaqScore -= 2 }
  if (text.includes('yield rise') || text.includes('bond yield') || text.includes('10-year up'))    { nasdaqScore -= 1 }

  const toBias = (score: number) => score >= 1 ? 'bullish' : score <= -1 ? 'bearish' : 'neutral'

  // Build reason string
  const reasons: string[] = []
  if (text.includes('rate cut'))           reasons.push('Rate cut expectations')
  if (text.includes('geopolit') || text.includes('war')) reasons.push('Geopolitical risk')
  if (text.includes('hawkish'))            reasons.push('Hawkish Fed signals')
  if (text.includes('inflation'))          reasons.push('Inflation concerns')
  if (text.includes('earnings'))           reasons.push('Earnings season')
  if (text.includes('recession'))          reasons.push('Recession fears')

  return {
    gold:   toBias(goldScore)   as Bias['gold'],
    nasdaq: toBias(nasdaqScore) as Bias['nasdaq'],
    dxy:    toBias(dxyScore)    as Bias['dxy'],
    reason: reasons.length > 0 ? reasons.join(' · ') : 'Mixed signals — no dominant theme',
  }
}

export async function GET(req: Request) {
  if (!rateLimit(`macro:${clientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }
  const news = await fetchFinancialJuice()
  const bias = deriveBias(news)
  return NextResponse.json({ news, bias })
}
