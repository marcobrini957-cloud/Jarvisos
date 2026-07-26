// Partner briefs — the content behind every "Learn more".
//
// A "Learn more" that fires the affiliate link is not information, it is a
// second Open-an-account button. These pages exist so a trader can read what a
// partner actually is, who regulates it, what it costs and where it bites,
// before any commission-bearing click.
//
// RULES, because these pages sit next to a link that pays us:
//  • Every figure carries a source in `sources`, and the source is where it was
//    read — the partner's own page where it is the partner's claim, an
//    independent one where it is not. `checked` is the date it was verified.
//  • `theirClaim: true` marks a figure only the partner asserts (customer
//    counts, payout totals, "award-winning"). It is still printed, but it is
//    labelled, because we did not audit it.
//  • `watchOuts` is not optional and never empty. If we cannot name what is
//    wrong with an offer, we have not looked at it hard enough to recommend it.
//  • No invented endorsements. "Famous trader X uses this" is unsourceable and
//    does not appear anywhere in here — published sponsorships do, named as
//    sponsorships.

export interface BriefFact {
  label:       string
  value:       string
  /** Extra qualifier printed under the value. */
  note?:       string
  /** True when the partner is the only source for the number. */
  theirClaim?: boolean
}

export interface BriefSection {
  heading: string
  body?:   string
  facts?:  BriefFact[]
  bullets?: string[]
}

export interface RegEntity {
  entity:    string
  regulator: string
  licence:   string
  address?:  string
}

export interface Source {
  label:   string
  url:     string
  checked: string
}

export interface PartnerBrief {
  id:        string    // matches Partner.id in lib/partners.ts
  kind:      string    // "Retail CFD broker", "Prop trading firm", …
  since?:    string
  based?:    string
  /** One paragraph: what this is, in plain words. */
  whatItIs:  string
  /** Why it is in the product at all — our claim about our own code. */
  inVelquor: string
  sections:  BriefSection[]
  regulation: RegEntity[]
  /** How client money is held, or the equivalent for a non-broker. */
  moneyNote?: string
  watchOuts: string[]
  sources:   Source[]
}

const JUL26 = '26 Jul 2026'

export const PARTNER_BRIEFS: PartnerBrief[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    id:   'blueberry-markets',
    kind: 'Retail CFD broker (MT4 / MT5)',
    since: 'Australian-founded; rebranded from "Blueberry Markets" to "Blueberry" in 2025',
    based: 'Sydney, Australia — with client-facing entities in Mauritius and Vanuatu',
    whatItIs:
      'A retail broker for forex, indices, metals and crypto CFDs, built around MetaTrader rather than a house platform. You trade on MT4 or MT5 (or their web and TradingView front ends) against Blueberry as counterparty, which is how every retail CFD broker works: your position is a contract with them, not an order on an exchange.',
    inVelquor:
      'Blueberry is the broker this dashboard was developed against. Its live server addresses ship in lib/brokers.ts, so picking Blueberry in the connect modal resolves the address for you instead of asking you to find "BlueberryMarkets-Live02" yourself — the step that breaks most MT5 connections.',
    sections: [
      {
        heading: 'What it costs',
        body: 'Two retail account types. The Standard account bakes the cost into the spread; the Direct account shows you a raw spread and charges commission on top. On a scalping strategy the Direct account is usually cheaper; on a swing strategy the difference is noise.',
        facts: [
          { label: 'Standard account', value: 'From 1.0 pips', note: '$0 commission' },
          { label: 'Direct account',   value: 'From 0.0 pips', note: '$7 per standard lot round turn ($3.50 per side)' },
          { label: 'Minimum deposit',  value: '$100',          note: 'Both account types' },
          { label: 'Maximum leverage', value: '500:1' },
          { label: 'Minimum trade',    value: '0.01 lots' },
          { label: 'Instruments',      value: '300+' },
        ],
      },
      {
        heading: 'Platforms',
        body: 'MetaTrader 4, MetaTrader 5, cTrader, WebTrader, TradingView, Blueberry X, Blueberry Social and Blueberry Pulse. Velquor needs MT5 specifically — that is where the EA runs.',
      },
      {
        heading: 'Who is behind it',
        facts: [
          { label: 'Official Trading Partner of SailGP', value: 'Sponsorship', note: 'Their own published partnership, including the Australian "Flying Roos" team', theirClaim: true },
          { label: 'Trustpilot',    value: '4.6 / 5',    note: 'Independent review aggregators, July 2026. Blueberry\'s own site cites 4.5 — check the live score before you decide.' },
          { label: 'Client funds',  value: 'Segregated', note: 'Held with tier-1 banks; Blueberry names CBA', theirClaim: true },
        ],
      },
    ],
    regulation: [
      { entity: 'Blueberry Markets (Mauritius) Ltd', regulator: 'Financial Services Commission, Mauritius', licence: 'Global Business Licence GB24203929 · company no. 218548', address: 'Silicon Avenue, The Catalyst, Ebene 72201, Mauritius' },
      { entity: 'Blueberry Markets (V) Ltd',         regulator: 'Vanuatu Financial Services Commission',    licence: 'Licence classes A, B and C · company no. 700697',       address: 'Govant Building, Kumul Highway, Port Vila, Vanuatu' },
      { entity: 'Blueberry Prime Partners Pty Ltd',  regulator: 'ASIC (Australia)',                          licence: 'AFSL 364411 · ABN 57 140 275 860',                       address: 'Sydney, NSW, Australia' },
    ],
    moneyNote:
      'Client money is held in segregated accounts, which keeps it off the broker\'s balance sheet but is not a compensation scheme: segregation protects against misuse, not against the entity failing.',
    watchOuts: [
      'Which entity you actually sign with depends on where you live. Most international clients contract with the Mauritius or Vanuatu company, not the ASIC-licensed Australian one — a lighter regulatory regime with no equivalent of the Australian complaints scheme. Read the entity name on your own account agreement.',
      '500:1 leverage is not a feature, it is an amplifier. At that ratio a 0.2% move against a fully-leveraged position is the account.',
      'Raw Direct spreads apply to XAUUSD.i and the .i-suffixed forex symbols. Trade the non-.i symbol and you are paying the wider spread and the commission.',
      'US residents are effectively excluded — their own eligibility wording requires assets in excess of $10 million invested on a discretionary basis.',
      'CFDs are a leveraged product. Most retail accounts lose money.',
    ],
    sources: [
      { label: 'Blueberry — account types, spreads and commissions', url: 'https://blueberrymarkets.com/trading/account-types/', checked: JUL26 },
      { label: 'Blueberry — legal documents, entities and licences',  url: 'https://blueberrymarkets.com/legal-documents/',      checked: JUL26 },
      { label: 'Blueberry — why Blueberry (platforms, client funds)', url: 'https://blueberrymarkets.com/why-blueberry/',        checked: JUL26 },
      { label: 'Blueberry — SailGP partnership',                     url: 'https://blueberrymarkets.com/sailgp/',               checked: JUL26 },
      { label: 'AFS licensee register — Blueberry Prime Partners',    url: 'https://search-afsl.com/Blueberry%20Prime%20Partners%20Pty%20ltd/afs-licensee/364411/', checked: JUL26 },
      { label: 'Trustpilot — Blueberry reviews',                      url: 'https://www.trustpilot.com/review/www.blueberrymarkets.com', checked: JUL26 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    id:   'ftmo',
    kind: 'Prop trading firm (evaluation model)',
    since: 'Founded 2015',
    based: 'Prague, Czech Republic — FTMO s.r.o.',
    whatItIs:
      'FTMO sells a trading evaluation. You pay a fee, trade to a profit target inside fixed loss limits, and if you pass you get an FTMO Account and a share of the profits it produces. It is not a broker and it does not hold your trading capital — the relationship is closer to a performance contract than to an account.',
    inVelquor:
      'FTMO-Server is a supported copy target. Add a funded account as a follower in the Copy tab and the fills from the account you already trade mirror into it in well under a second — which is how a passed FTMO account gets traded without you placing every order twice.',
    sections: [
      {
        heading: 'Read this first',
        body: 'In FTMO\'s own words: "all accounts we provide to our clients are demo accounts with fictitious funds and any trading is in a simulated environment only". You are not trading real money at any stage, including after you pass. Your rewards are paid by FTMO out of its own funds against your simulated performance. That is the model across this whole industry, and it is the single most misunderstood thing about it.',
      },
      {
        heading: 'How the evaluation works',
        facts: [
          { label: 'Account sizes',      value: '$10k · $25k · $50k · $100k · $200k' },
          { label: 'Challenge target',   value: '10% profit' },
          { label: 'Verification target',value: '5% profit', note: 'Second phase of the 2-step route; the 1-step route has a single phase' },
          { label: 'Maximum daily loss', value: '5%' },
          { label: 'Maximum loss',       value: '10%' },
          { label: 'Profit split',       value: 'Up to 90%' },
          { label: 'Fee',                value: 'Scales with account size', note: 'Refunded in full with your first reward withdrawal' },
        ],
      },
      {
        heading: 'Platforms',
        body: 'MetaTrader 4, MetaTrader 5 and cTrader. Velquor\'s copy engine works with the MT5 route.',
      },
      {
        heading: 'Scale, as published by FTMO',
        facts: [
          { label: 'Customers',        value: '4.5M+',   theirClaim: true },
          { label: 'Paid in rewards',  value: '$650M+',  theirClaim: true },
          { label: 'Countries served', value: '140+',    theirClaim: true },
          { label: 'Trustpilot',       value: '4.8 / 5', note: 'One of the highest-rated firms in the sector, on a large review base' },
        ],
      },
    ],
    regulation: [
      { entity: 'FTMO s.r.o.', regulator: 'None — a prop firm is not a regulated financial service', licence: 'VAT ID CZ699005540', address: 'Prague, Czech Republic' },
    ],
    moneyNote:
      'There is no client money to protect, because there is no client money: the fee buys an evaluation and the accounts are simulated. That also means none of the investor-protection machinery that applies to a licensed broker applies here.',
    watchOuts: [
      'The fee is the risk. Breach a rule — most often the 5% daily loss — and the evaluation ends; you buy another one or you stop.',
      'Nothing you trade is live, before or after passing. Anyone telling you an FTMO account is "real funded capital" is wrong, and FTMO says so themselves.',
      'The profit split is contractual, not automatic. Payouts follow their terms, and their terms can change.',
      'Consistency and risk rules exist beyond the headline three. Read the full trading objectives for the exact product you buy, not a summary — including this one.',
      'A passed account is a job with a drawdown limit, not a windfall. The same discipline that got you through the evaluation is what keeps it.',
    ],
    sources: [
      { label: 'FTMO — how it works (targets, limits, phases)', url: 'https://ftmo.com/en/how-it-works/', checked: JUL26 },
      { label: 'FTMO — homepage (scale figures, simulated-account wording, platforms)', url: 'https://ftmo.com/en/', checked: JUL26 },
      { label: 'FTMO — press kit and brand assets', url: 'https://ftmo.com/en/press-kit/', checked: JUL26 },
      { label: 'Trustpilot — FTMO reviews', url: 'https://www.trustpilot.com/review/ftmo.com', checked: JUL26 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    id:   'tradingview',
    kind: 'Charting and market-data platform',
    since: 'Founded 2011',
    based: 'New York and London',
    whatItIs:
      'The charting platform most retail traders actually use, and the one this dashboard embeds. Free to use with limits; the paid tiers mainly buy you more indicators per chart, more alerts and more charts per layout.',
    inVelquor:
      'Three TradingView widgets ship in this product: the live chart on the Trading tab, the ticker tape across the top bar, and the market overview on Overview. When you look at price inside Velquor, you are looking at their chart.',
    sections: [
      {
        heading: 'What the tiers cost',
        body: 'Prices below are the annual-billing rate, which is what the pricing page shows by default; monthly billing costs more. The free Basic tier is genuinely usable — its real squeeze is two indicators per chart.',
        facts: [
          { label: 'Basic',     value: 'Free',        note: '1 chart per tab · 2 indicators per chart · 3 active alerts · 30 symbols per watchlist' },
          { label: 'Essential', value: '€12.95 / mo', note: '2 charts · 5 indicators · 20 alerts' },
          { label: 'Plus',      value: '€29.95 / mo', note: '4 charts · 10 indicators · 100 alerts' },
          { label: 'Premium',   value: '€59.95 / mo', note: '8 charts · 25 indicators · 400 alerts' },
          { label: 'Ultimate',  value: '€199.95 / mo',note: '16 charts · 50 indicators · 1,000 alerts' },
        ],
      },
      {
        heading: 'Scale',
        facts: [
          { label: 'Traders on the platform', value: '~100 million', theirClaim: true },
          { label: 'Monthly visits',          value: '200M+',        note: 'Third-party web-traffic estimates' },
        ],
      },
    ],
    regulation: [
      { entity: 'TradingView, Inc.', regulator: 'Not a broker — no financial licence required for charting software', licence: '—', address: 'New York, USA' },
    ],
    watchOuts: [
      'A paid plan does not change the charts inside Velquor. Our embeds are anonymous widgets, so a subscription improves TradingView itself, not this dashboard.',
      'Real-time data for many exchanges is a separate per-exchange fee on top of the plan. The plan price is not the data price.',
      'Free-tier charts carry ads, and the two-indicator limit is what pushes most people to upgrade — decide whether you need that before you pay for a year.',
    ],
    sources: [
      { label: 'TradingView — pricing and plan limits', url: 'https://www.tradingview.com/pricing/', checked: JUL26 },
      { label: 'TradingView — media kit and brand assets', url: 'https://www.tradingview.com/media-kit/', checked: JUL26 },
      { label: 'Wikipedia — TradingView (company history)', url: 'https://en.wikipedia.org/wiki/TradingView', checked: JUL26 },
    ],
  },
]

export function getBrief(id: string): PartnerBrief | undefined {
  return PARTNER_BRIEFS.find(b => b.id === id)
}
