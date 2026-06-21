export interface FFEvent {
  title:        string
  country:      string
  date:         string
  time:         string
  impact:       'High' | 'Medium' | 'Low' | 'Holiday' | 'Non-Economic'
  forecast:     string
  previous:     string
  actual:       string
  currency:     string
  affectsGold:   boolean
  affectsNasdaq: boolean
}

const GOLD_KEYWORDS   = ['gold','cpi','inflation','fomc','federal reserve','fed','nfp','payroll','gdp','interest rate','pce','jolts','treasury','yield','dxy','dollar']
const NASDAQ_KEYWORDS = ['fomc','federal reserve','fed','nfp','payroll','cpi','inflation','gdp','interest rate','pce','earnings','tech','consumer confidence','ism']

function tagEvent(title: string, currency: string): { affectsGold: boolean; affectsNasdaq: boolean } {
  const lower = title.toLowerCase()
  const isUSD = currency.toUpperCase() === 'USD'
  return {
    affectsGold:   isUSD || GOLD_KEYWORDS.some(k => lower.includes(k)),
    affectsNasdaq: isUSD || NASDAQ_KEYWORDS.some(k => lower.includes(k)),
  }
}

export async function fetchFFCalendar(): Promise<FFEvent[]> {
  try {
    const res = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) throw new Error(`FF ${res.status}`)

    const raw: Array<{ title: string; country: string; date: string; time: string; impact: string; forecast: string; previous: string; actual?: string }> = await res.json()

    // ── USD HIGH IMPACT ONLY ─────────────────────────────────────────────────
    return raw
      .filter(e => e.impact === 'High' && e.country?.toUpperCase() === 'USD')
      .map(e => ({
        title:    e.title,
        country:  e.country,
        date:     e.date,
        time:     e.time,
        impact:   'High' as const,
        forecast: e.forecast ?? '',
        previous: e.previous ?? '',
        actual:   e.actual   ?? '',
        currency: e.country,
        ...tagEvent(e.title, e.country),
      }))
  } catch (err) {
    console.error('[ff-calendar]', err)
    return []
  }
}

export function todaysEvents(events: FFEvent[]): FFEvent[] {
  const today = new Date().toDateString()
  return events.filter(e => new Date(e.date).toDateString() === today)
}

// Already High-only from fetchFFCalendar — kept for backwards compat
export function highImpactForTrading(events: FFEvent[]): FFEvent[] {
  return events.filter(e => e.affectsGold || e.affectsNasdaq)
}
