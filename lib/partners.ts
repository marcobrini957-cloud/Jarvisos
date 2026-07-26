// Partner / affiliate catalog — single source of truth for every broker,
// prop-firm and tool offer we promote. Add or edit an offer by changing THIS
// file; the Partners tab, the free-user rail and the house ad-slots all render
// from here. (This is the affiliate layer — not to be confused with
// lib/brokers.ts, which maps MT5 server names to connectable addresses.)
//
// Three partners, deliberately. The list was seven brokers, two prop firms and a
// tool, most with placeholder affiliate links and invented trust rows. A
// directory that promotes ten things Marco has never used is not a
// recommendation; these three are the ones actually wired into the product.
//
// RULES, since these cards earn commission:
//  • Any `url` containing TODO_REAL_AFFILIATE_CODE is a PLACEHOLDER and earns
//    nothing — swap it for the real tracking link. Blueberry carries a real one.
//  • A `rating` must name its `ratingSource` and be checkable there today. No
//    invented review counts, no invented account totals — the previous rows
//    ("5.4K reviews · 61K accounts") were styled after TradingView's directory
//    and sourced from nowhere.
//  • `integration` is our own claim about our own product, so it has to be true
//    of the code in this repo.

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

  // Trust row (all optional). A rating without a source does not ship.
  rating?:       number       // 4.6
  ratingSource?: string       // "Trustpilot" — named on the card
  reviews?:      string       // "29K" — only if verified at the source
  accounts?:     string       // "306K" — only if the partner publishes it

  /** Why this one is in the product, in our own words. Must be true of the code. */
  integration?: string

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
  // ── Broker — the only real referral link in the file ─────────────────────
  {
    id:        'blueberry-markets',
    name:      'Blueberry',
    category:  'broker',
    assets:    'Forex, indices, metals, crypto CFDs',
    headline:  'The MT5 broker Velquor connects to natively',
    blurb:     'Raw spreads from 0.0 pips and fast execution on MT5. Velquor ships its server addresses, so a Blueberry account connects without you looking anything up.',
    ctaLabel:  'Open an account',
    url:       'https://portal.blueberrymarkets.com/en/sign-up?referralCode=kgdgyxnbws',
    rating:       4.6,
    ratingSource: 'Trustpilot',
    award:     'VELQUOR PICK',
    promo:     'Connects to Velquor out of the box',
    integration: 'Its live servers ship in lib/brokers.ts — pick Blueberry in the connect modal and the address resolves itself.',
    accent:    '#4C8DFF',
    logo:      '/partners/blueberry.svg',
    featured:  true,
    disclosure: CFD_RISK,
  },

  // ── Prop firm ────────────────────────────────────────────────────────────
  {
    id:        'ftmo',
    name:      'FTMO',
    category:  'prop',
    assets:    'Funded accounts',
    headline:  'Trade their capital, keep up to 90%',
    blurb:     'Pass the evaluation and trade FTMO capital. Their MT5 accounts work as copy followers, so a funded account can mirror the account you already trade.',
    ctaLabel:  'Start the challenge',
    url:       'https://ftmo.com/?affiliates=TODO_REAL_AFFILIATE_CODE',
    rating:       4.8,
    ratingSource: 'Trustpilot',
    integration: 'FTMO-Server is a supported copy target — add it as a follower in the Copy tab and fills mirror in under a second.',
    accent:    '#2E7D32',
    logo:      '/partners/ftmo.svg',
    featured:  true,
    disclosure: CFD_RISK,
  },

  // ── Tool ─────────────────────────────────────────────────────────────────
  {
    id:        'tradingview',
    name:      'TradingView',
    category:  'tool',
    assets:    'Charts, screeners, alerts',
    headline:  'The charts inside this dashboard',
    blurb:     'The live chart on your Trading tab is TradingView. A paid plan adds indicators per chart, more alerts and no ads — in their app and in ours.',
    ctaLabel:  'Try TradingView',
    url:       'https://www.tradingview.com/?aff_id=TODO_REAL_AFFILIATE_CODE',
    integration: 'Velquor embeds their widgets: the Trading tab chart, the ticker tape in the top bar and the market overview on Overview.',
    accent:    '#2962FF',
    logo:      '/partners/tradingview.svg',
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
