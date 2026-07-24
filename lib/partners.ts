// Partner / affiliate catalog — single source of truth for every broker,
// prop-firm and tool offer we promote. Add or edit an offer by changing THIS
// file; the Partners tab, the free-user rail and the house ad-slots all render
// from here. (This is the affiliate layer — not to be confused with
// lib/brokers.ts, which maps MT5 server names to connectable addresses.)
//
// IMPORTANT:
//  • Any `url` containing TODO_REAL_AFFILIATE_CODE is a PLACEHOLDER and earns
//    nothing — swap it for your real affiliate/tracking link before relying on
//    it. Blueberry Markets carries a real referral link.
//  • rating / reviews / accounts are ILLUSTRATIVE placeholders styled after the
//    TradingView broker directory. Replace with real figures (or drop the
//    fields) as you verify them — don't ship fabricated trust signals to prod.

export type PartnerCategory = 'broker' | 'prop' | 'tool'

export interface Partner {
  id:        string           // stable slug — used in tracking + /api/go/[id]
  name:      string
  category:  PartnerCategory
  assets:    string           // "Forex, CFDs" — the "Tradable assets" line
  headline:  string           // one-line hook shown on the compact ad / rail
  blurb:     string           // 1–2 sentence description
  ctaLabel:  string           // primary button text ("Open account")
  url:       string           // affiliate destination (server-side via /api/go)
  learnMoreUrl?: string       // "Learn more" secondary link (optional)

  // TradingView-style trust row (all optional)
  rating?:   number           // 4.6
  reviews?:  string           // "29K"
  accounts?: string           // "306K"

  // Badges / ribbons
  plan?:     'PLATINUM' | 'GOLD' | 'SILVER'   // partner-tier chip (blue)
  award?:    string           // gold chip, e.g. "BEST 2024"
  promo?:    string           // promotion line, e.g. "8% deposit bonus"

  accent?:   string           // CSS color for logo/accent; defaults to --ac
  logo?:     string           // /public path to a logo; falls back to initials
  featured:  boolean          // gradient hero card + rail + house-ad rotation
  disclosure?: string         // optional extra risk/terms note
}

export const CATEGORY_LABELS: Record<PartnerCategory, string> = {
  broker: 'Brokers',
  prop:   'Prop firms',
  tool:   'Tools & data',
}

// Filter pills shown across the top of the Partners tab (TradingView style).
export const PARTNER_FILTERS: { id: 'all' | PartnerCategory; label: string }[] = [
  { id: 'all',    label: 'All partners' },
  { id: 'broker', label: 'Brokers'      },
  { id: 'prop',   label: 'Prop firms'   },
  { id: 'tool',   label: 'Tools'        },
]

// Standard risk line reused across leveraged-product partners.
const CFD_RISK =
  'Trading leveraged products carries a high risk of loss. Not financial advice.'

export const PARTNERS: Partner[] = [
  // ── FEATURED — real Blueberry referral link ──────────────────────────────
  {
    id:        'blueberry-markets',
    name:      'Blueberry Markets',
    category:  'broker',
    assets:    'Forex, CFDs',
    headline:  'Award-winning low-spread MT5 broker',
    blurb:     'Raw spreads from 0.0 pips, fast execution and the MT5 setup Velquor connects to natively.',
    ctaLabel:  'Open an account',
    url:       'https://portal.blueberrymarkets.com/en/sign-up?referralCode=kgdgyxnbws',
    rating:    4.8,
    reviews:   '5.4K',
    accounts:  '61K',
    plan:      'PLATINUM',
    award:     'VELQUOR PICK',
    promo:     'Connects to Velquor out of the box',
    accent:    '#4C8DFF',
    featured:  true,
    disclosure: CFD_RISK,
  },

  // ── Brokers (placeholder links — wire real affiliate codes) ──────────────
  {
    id:        'fxpro',
    name:      'FxPro',
    category:  'broker',
    assets:    'Forex, CFDs',
    headline:  'No-dealing-desk execution',
    blurb:     'One of the most established CFD brokers, with MT4/MT5 and fast fills.',
    ctaLabel:  'Open an account',
    url:       'https://www.fxpro.com/?ib=TODO_REAL_AFFILIATE_CODE',
    rating:    4.5,
    reviews:   '1.2K',
    accounts:  '40.1K',
    plan:      'PLATINUM',
    accent:    '#E5352B',
    featured:  false,
    disclosure: CFD_RISK,
  },
  {
    id:        'ic-markets',
    name:      'IC Markets',
    category:  'broker',
    assets:    'Forex, CFDs',
    headline:  'True ECN, deep liquidity',
    blurb:     'Popular raw-spread ECN broker with high leverage and low latency.',
    ctaLabel:  'Open an account',
    url:       'https://www.icmarkets.com/?camp=TODO_REAL_AFFILIATE_CODE',
    rating:    4.6,
    reviews:   '8.2K',
    accounts:  '78.9K',
    plan:      'PLATINUM',
    accent:    '#12B76A',
    featured:  false,
    disclosure: CFD_RISK,
  },
  {
    id:        'easymarkets',
    name:      'easyMarkets',
    category:  'broker',
    assets:    'Forex, CFDs',
    headline:  'Fixed spreads & guaranteed stops',
    blurb:     'Beginner-friendly broker with built-in risk tools and no slippage on stops.',
    ctaLabel:  'Open an account',
    url:       'https://www.easymarkets.com/?ic=TODO_REAL_AFFILIATE_CODE',
    rating:    4.9,
    reviews:   '4.8K',
    accounts:  '20.5K',
    plan:      'PLATINUM',
    award:     'BEST 2024',
    accent:    '#4CAF50',
    featured:  false,
    disclosure: CFD_RISK,
  },
  {
    id:        'okx',
    name:      'OKX',
    category:  'broker',
    assets:    'Crypto',
    headline:  'Top-tier crypto exchange',
    blurb:     'Spot, futures and options on one of the deepest crypto order books.',
    ctaLabel:  'Open an account',
    url:       'https://www.okx.com/join/TODO_REAL_AFFILIATE_CODE',
    rating:    4.7,
    reviews:   '22.6K',
    accounts:  '258.4K',
    plan:      'PLATINUM',
    promo:     '8% deposit bonus',
    accent:    '#B7BDC6',
    featured:  false,
    disclosure: CFD_RISK,
  },

  // ── Prop firms (your growth lane) ────────────────────────────────────────
  {
    id:        'ftmo',
    name:      'FTMO',
    category:  'prop',
    assets:    'Funded accounts',
    headline:  'Get funded up to $200k',
    blurb:     'Pass the evaluation and trade FTMO capital, keeping up to 90% of the profits.',
    ctaLabel:  'Start the challenge',
    url:       'https://ftmo.com/?affiliates=TODO_REAL_AFFILIATE_CODE',
    rating:    4.8,
    reviews:   '12.3K',
    accounts:  '180K',
    plan:      'PLATINUM',
    accent:    '#2E7D32',
    featured:  true,
    disclosure: CFD_RISK,
  },
  {
    id:        'fundednext',
    name:      'FundedNext',
    category:  'prop',
    assets:    'Funded accounts',
    headline:  'Up to 95% profit split',
    blurb:     'Fast-growing prop firm with a 15% profit share from the challenge phase.',
    ctaLabel:  'Start the challenge',
    url:       'https://fundednext.com/?ref=TODO_REAL_AFFILIATE_CODE',
    rating:    4.7,
    reviews:   '9.1K',
    accounts:  '120K',
    plan:      'GOLD',
    accent:    '#7A4FFF',
    featured:  false,
    disclosure: CFD_RISK,
  },

  // ── Tools & data ─────────────────────────────────────────────────────────
  {
    id:        'tradingview',
    name:      'TradingView',
    category:  'tool',
    assets:    'Charts, screeners, alerts',
    headline:  'Charts the pros actually use',
    blurb:     'Advanced charting, alerts and screeners. Upgrade for more indicators and no ads.',
    ctaLabel:  'Try TradingView',
    url:       'https://www.tradingview.com/?aff_id=TODO_REAL_AFFILIATE_CODE',
    rating:    4.7,
    reviews:   '30K',
    accounts:  '50M+',
    plan:      'GOLD',
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

// Human label for a numeric rating (matches TradingView's "Excellent / Great").
export function ratingLabel(rating: number): string {
  if (rating >= 4.8) return 'Excellent'
  if (rating >= 4.4) return 'Great'
  if (rating >= 3.8) return 'Good'
  return 'Average'
}

// Deterministic-ish rotation helper for house ad slots so a given slot key
// shows a stable-but-varied featured offer (avoids every slot showing the same
// partner). Falls back to the first featured partner.
export function pickHousePartner(seed: number): Partner | undefined {
  const featured = getFeaturedPartners()
  if (featured.length === 0) return undefined
  return featured[Math.abs(Math.floor(seed)) % featured.length]
}
