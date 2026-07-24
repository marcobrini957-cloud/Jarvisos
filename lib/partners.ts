// Partner / affiliate catalog — single source of truth for every broker,
// prop-firm and tool offer we promote. Add or edit an offer by changing THIS
// file; the Partners tab, the free-user rail and the house ad-slots all render
// from here. (This is the affiliate layer — not to be confused with
// lib/brokers.ts, which maps MT5 server names to connectable addresses.)
//
// IMPORTANT: `url` values below are placeholders. Swap the ?ref=velquor query
// (or the whole URL) for your real affiliate/tracking link before going live.
// Anything with `TODO_REAL_AFFILIATE_CODE` in the URL is not earning yet.

export type PartnerCategory = 'broker' | 'prop' | 'tool'

export interface Partner {
  id:        string           // stable slug — used in tracking + /api/go/[id]
  name:      string
  category:  PartnerCategory
  headline:  string           // one-line hook shown on the card / ad
  blurb:     string           // 1–2 sentence description
  ctaLabel:  string           // button text
  url:       string           // affiliate destination (server-side only via /api/go)
  badge?:    string           // small ribbon, e.g. "$0 commission", "Editor's pick"
  accent?:   string           // CSS color for the card accent; defaults to --ac
  logo?:     string           // /public path to a logo; falls back to initials
  featured:  boolean          // eligible for the free-user rail + house ad rotation
  disclosure?: string         // optional extra risk/terms note under the card
}

export const CATEGORY_LABELS: Record<PartnerCategory, string> = {
  broker: 'Brokers',
  prop:   'Prop firms',
  tool:   'Tools & data',
}

// Standard risk line reused across leveraged-product partners.
const CFD_RISK =
  'Trading leveraged products carries a high risk of loss. Not financial advice.'

export const PARTNERS: Partner[] = [
  {
    id:        'blueberry-markets',
    name:      'Blueberry Markets',
    category:  'broker',
    headline:  'Award-winning low-spread MT5 broker',
    blurb:     'Raw spreads from 0.0 pips, fast execution and the MT5 setup Velquor connects to natively.',
    ctaLabel:  'Open an account',
    url:       'https://portal.blueberrymarkets.com/en/sign-up?referralCode=kgdgyxnbws',
    badge:     'Editor’s pick',
    accent:    '#4C8DFF',
    featured:  true,
    disclosure: CFD_RISK,
  },
  {
    id:        'ftmo',
    name:      'FTMO',
    category:  'prop',
    headline:  'Get funded up to $200k',
    blurb:     'Pass the evaluation and trade FTMO capital, keeping up to 90% of the profits.',
    ctaLabel:  'Start the challenge',
    url:       'https://ftmo.com/?affiliates=TODO_REAL_AFFILIATE_CODE',
    badge:     'Popular',
    accent:    '#12B76A',
    featured:  true,
    disclosure: CFD_RISK,
  },
  {
    id:        'tradingview',
    name:      'TradingView',
    category:  'tool',
    headline:  'Charts the pros actually use',
    blurb:     'Advanced charting, alerts and screeners. Upgrade for more indicators and no ads.',
    ctaLabel:  'Try TradingView',
    url:       'https://www.tradingview.com/?aff_id=TODO_REAL_AFFILIATE_CODE',
    accent:    '#2962FF',
    featured:  true,
  },
]

// --- Selectors -------------------------------------------------------------

export function getPartner(id: string): Partner | undefined {
  return PARTNERS.find(p => p.id === id)
}

export function getFeaturedPartners(): Partner[] {
  return PARTNERS.filter(p => p.featured)
}

export function partnersByCategory(): { category: PartnerCategory; items: Partner[] }[] {
  const order: PartnerCategory[] = ['broker', 'prop', 'tool']
  return order
    .map(category => ({ category, items: PARTNERS.filter(p => p.category === category) }))
    .filter(group => group.items.length > 0)
}

// Deterministic-ish rotation helper for house ad slots so a given slot key
// shows a stable-but-varied featured offer (avoids every slot showing the same
// partner). Falls back to the first featured partner.
export function pickHousePartner(seed: number): Partner | undefined {
  const featured = getFeaturedPartners()
  if (featured.length === 0) return undefined
  return featured[Math.abs(Math.floor(seed)) % featured.length]
}
