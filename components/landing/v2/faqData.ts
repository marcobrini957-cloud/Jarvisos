// FAQ content, in a plain module on purpose.
//
// Both the FAQ section (a client component) and the landing page (a server
// component, which builds the FAQPage rich-result markup from it) need this
// array. Exporting it from the 'use client' module meant the server page
// received a client reference proxy instead of the data — FAQS.map threw and
// took the whole page down with it. A module with no directive is importable
// from both sides.
export const FAQS: [string, string][] = [
  ['Do I have to give VELQUOR my MT5 password?', 'No. VELQUOR works through an Expert Advisor that runs inside your own MT5 terminal — your broker login never leaves your machine. The EA authenticates with a personal API key you can reset at any time.'],
  ['Which brokers are supported?', 'Every broker that offers MetaTrader 5 — IC Markets, Pepperstone, Blueberry, Vantage, FTMO, Eightcap and hundreds more. If it runs MT5, it works with VELQUOR.'],
  ['How fast is the trade copier?', 'Signals travel from your leader account to your followers in about half a second, with the broker fill on top. Lot sizing is 1:1, proportional or fixed — you choose per group.'],
  ['Is my trading data safe?', 'Your data is stored on EU servers, isolated per account, and encrypted in transit. Nobody else can see your trades, and VELQUOR never has the ability to withdraw or move your money.'],
  ['Do I need a credit card for the free plan?', 'No. The free plan is free forever — no card, no trial countdown. You get auto-sync, the journal and core stats. Upgrade only when you want AI analysis, unlimited history or the copier.'],
  ['Can I use it during a prop firm challenge?', 'Yes — that is exactly what Prop Firm Mode is for. VELQUOR tracks your max daily loss, total drawdown and profit target in real time, and warns you before you breach a rule.'],
]
