// One-line explainers for red-folder releases: what the number is, and what a
// hot/miss print typically does to USD, gold (XAUUSD), and Nasdaq (NAS100).
// Deliberately short — a glance, not an article.

export interface EventBrief {
  what:   string
  effect: string
}

const BRIEFS: { match: RegExp; brief: EventBrief }[] = [
  { match: /core cpi/i, brief: {
    what:   'Consumer inflation excluding food & energy — the Fed\'s cleanest inflation read.',
    effect: 'Hot → USD up, gold & Nasdaq down. Cool → gold & Nasdaq rally.',
  }},
  { match: /cpi/i, brief: {
    what:   'Consumer Price Index — headline inflation.',
    effect: 'Hot → rate-cut hopes fade: USD up, gold & Nasdaq down. Cool → the opposite.',
  }},
  { match: /core ppi|ppi/i, brief: {
    what:   'Producer prices — factory-gate inflation, leads consumer inflation.',
    effect: 'Hot → mild USD up, gold & Nasdaq soften. Smaller punch than CPI.',
  }},
  { match: /non-?farm|nfp|payroll/i, brief: {
    what:   'Non-Farm Payrolls — the monthly US jobs number. Biggest release of the month.',
    effect: 'Strong jobs → USD up, gold down. Weak → gold rallies. Expect violent whipsaws.',
  }},
  { match: /unemployment rate/i, brief: {
    what:   'Share of the workforce without a job.',
    effect: 'Rising → economy cooling: gold up, USD down. Falling → USD strength.',
  }},
  { match: /unemployment claims|jobless/i, brief: {
    what:   'Weekly count of new unemployment filings — a fast jobs-market pulse.',
    effect: 'Higher claims → weaker economy: gold up. Lower → USD firm.',
  }},
  { match: /fomc.*(minutes)/i, brief: {
    what:   'Detailed notes from the last Fed meeting.',
    effect: 'Hawkish tone → USD up, gold & Nasdaq down. Dovish → risk-on rally.',
  }},
  { match: /fomc|federal funds rate|interest rate|rate decision/i, brief: {
    what:   'The Fed\'s interest-rate decision — the single biggest driver of USD, gold, and tech.',
    effect: 'Hike/hawkish → USD up, gold & Nasdaq down hard. Cut/dovish → both rally.',
  }},
  { match: /(fed|powell|warsh|chair).*(testif|speak|speech)/i, brief: {
    what:   'The Fed Chair speaks — markets parse every word for rate hints.',
    effect: 'Hawkish phrases → USD up, gold & Nasdaq dip. Dovish → risk-on. Headline whipsaw risk.',
  }},
  { match: /pce/i, brief: {
    what:   'PCE Price Index — the Fed\'s officially preferred inflation gauge.',
    effect: 'Hot → USD up, gold & Nasdaq down. Cool → both rally.',
  }},
  { match: /gdp/i, brief: {
    what:   'Gross Domestic Product — the broad growth number.',
    effect: 'Strong → USD up, Nasdaq mixed. Weak → recession worry: gold bid.',
  }},
  { match: /retail sales/i, brief: {
    what:   'US consumer spending — the demand engine of the economy.',
    effect: 'Strong → USD up. Weak → gold up on slowdown fears.',
  }},
  { match: /ism.*manufacturing|manufacturing pmi/i, brief: {
    what:   'Factory activity survey — above 50 = expansion.',
    effect: 'Hot → USD up. Below 50 → growth worry, gold supported.',
  }},
  { match: /ism.*services|services pmi/i, brief: {
    what:   'Services-sector survey — most of the US economy. Above 50 = expansion.',
    effect: 'Hot → USD up, Nasdaq mixed. Miss → gold supported.',
  }},
  { match: /consumer confidence|consumer sentiment|uom/i, brief: {
    what:   'Survey of how confident US consumers feel about spending.',
    effect: 'Strong → USD firm. Weak → gold supported. Usually a modest mover.',
  }},
  { match: /jolts/i, brief: {
    what:   'Job openings — labour-demand gauge the Fed watches closely.',
    effect: 'More openings → USD up, gold down. Falling openings → gold bid.',
  }},
  { match: /treasury|auction|bond/i, brief: {
    what:   'US government debt auction — sets the tone for yields.',
    effect: 'Weak demand → yields up: gold & Nasdaq pressured.',
  }},
]

const GENERIC: EventBrief = {
  what:   'High-impact US release — one of the week\'s market movers.',
  effect: 'Stronger than forecast → USD up, gold & Nasdaq pressured. Miss → the reverse.',
}

export function briefFor(title: string): EventBrief {
  for (const { match, brief } of BRIEFS) {
    if (match.test(title)) return brief
  }
  return GENERIC
}
