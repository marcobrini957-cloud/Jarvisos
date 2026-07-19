export type Locale = 'en' | 'de' | 'zh' | 'es'

export interface LandingT {
  nav: {
    features: string
    howItWorks: string
    pricing: string
    signIn: string
    getStarted: string
  }
  hero: {
    badge: string
    h1a: string
    h1b: string
    subtitle: string
    cta: string
    ctaSub: string
    trust: string[]
  }
  stats: Array<{ label: string }>
  showcase: {
    eyebrow: string
    h2a: string
    h2b: string
    subtitle: string
    beforeLabel: string
    beforeSub: string
    afterLabel: string
    afterSub: string
    cards: Array<{ icon: string; title: string; desc: string }>
  }
  features: {
    eyebrow: string
    h2: string
    subtitle: string
    items: Array<{ title: string; desc: string }>
  }
  howItWorks: {
    eyebrow: string
    h2: string
    subtitle: string
    cta: string
    steps: Array<{ title: string; desc: string; detail: string }>
  }
  velquorAI: {
    eyebrow: string
    h2: string
    subtitle: string
    placeholder: string
    online: string
    qa: Array<{ q: string; a: string }>
  }
  propFirm: {
    badge: string
    h2: string
    subtitle: string
    firms: string[]
    trackNote: string
  }
  pricing: {
    h2: string
    subtitle: string
    toggle: { monthly: string; annual: string; save: string }
    footer: string
    tiers: Array<{
      name: string
      monthly: string
      annual: string
      annualNote: string
      period: string
      tagline: string
      cta: string
      badge?: string
      features: Array<{ text: string; included: boolean }>
    }>
  }
  finalCta: {
    h2: string
    subtitle: string
    cta: string
    note: string
    brokersLabel: string
  }
  trust: {
    eyebrow: string
    h2: string
    items: Array<{ icon: string; title: string; desc: string }>
  }
  faq: {
    eyebrow: string
    h2: string
    subtitle: string
    items: Array<{ q: string; a: string }>
  }
  footer: {
    copyright: string
    links: string[]
    impressumLabel: string
  }
}

// ── Pricing feature rows (EN-only across all locales — product terminology) ──
const F_FREE: Array<{ text: string; included: boolean }> = [
  { text: 'MT5 auto-sync (30-day history)',         included: true  },
  { text: 'Trade journal (up to 100 trades)',        included: true  },
  { text: 'Core P&L & win rate stats',              included: true  },
  { text: 'Live TradingView charts & market data',  included: true  },
  { text: 'Portfolio tracker (stocks, ETFs, metals)', included: true },
  { text: 'Red-folder news & economic calendar', included: false },
  { text: 'Session analytics (London / NY / Asia)', included: false },
  { text: 'Setup analytics (per-setup win rate)',    included: false },
  { text: 'VELQUOR AI analysis',                    included: false },
  { text: 'Behavior correlations',                  included: false },
  { text: 'PDF trade reports',                      included: false },
  { text: 'Prop firm tracker',                      included: false },
  { text: 'Trade copier',                           included: false },
  { text: 'Priority support',                       included: false },
]

const F_PRO: Array<{ text: string; included: boolean }> = [
  { text: 'MT5 auto-sync (unlimited history)',       included: true  },
  { text: 'Trade journal (unlimited trades)',         included: true  },
  { text: 'Core P&L & win rate stats',              included: true  },
  { text: 'Live TradingView charts & market data',  included: true  },
  { text: 'Portfolio tracker (stocks, ETFs, metals)', included: true },
  { text: 'Red-folder news & economic calendar', included: true  },
  { text: 'Session analytics (London / NY / Asia)', included: true  },
  { text: 'Setup analytics (per-setup win rate)',    included: true  },
  { text: 'VELQUOR AI analysis',                    included: true  },
  { text: 'Behavior correlations',                  included: true  },
  { text: 'PDF trade reports',                      included: true  },
  { text: 'Prop firm tracker',                      included: true  },
  { text: 'Trade copier (1 group, 1 slave)',         included: true  },
  { text: 'Priority support',                       included: false },
]

const F_ULTRA: Array<{ text: string; included: boolean }> = [
  { text: 'MT5 auto-sync (unlimited history)',       included: true },
  { text: 'Trade journal (unlimited trades)',         included: true },
  { text: 'Core P&L & win rate stats',              included: true },
  { text: 'Live TradingView charts & market data',  included: true },
  { text: 'Portfolio tracker (stocks, ETFs, metals)', included: true },
  { text: 'Red-folder news & economic calendar', included: true },
  { text: 'Session analytics (London / NY / Asia)', included: true },
  { text: 'Setup analytics (per-setup win rate)',    included: true },
  { text: 'VELQUOR AI analysis',                    included: true },
  { text: 'Behavior correlations',                  included: true },
  { text: 'PDF trade reports',                      included: true },
  { text: 'Prop firm tracker',                      included: true },
  { text: 'Trade copier (3 groups, 5 slaves each)', included: true },
  { text: 'Priority support',                       included: true },
]

// ── English ───────────────────────────────────────────────────────────────────
const en: LandingT = {
  nav: {
    features: 'Features',
    howItWorks: 'How it works',
    pricing: 'Pricing',
    signIn: 'Sign in',
    getStarted: 'Get Started',
  },
  hero: {
    badge: 'Auto-Sync · AI Analysis · Trade Copier',
    h1a: 'Your edge is already',
    h1b: 'in your trades.',
    subtitle: 'VELQUOR auto-logs every trade from MT5, finds the patterns in your behavior and strategy that are costing you money, and mirrors positions across any account in under 2 seconds.',
    cta: 'Start free — no card needed',
    ctaSub: 'See inside ↓',
    trust: ['Any MT5 Broker', 'No manual entry ever', 'AI Behavior Analysis', 'Built-in Trade Copier'],
  },
  stats: [
    { label: 'Trades tracked' },
    { label: 'Avg win rate uplift' },
    { label: 'MT5 sync time' },
    { label: 'AI insights per week' },
  ],
  showcase: {
    eyebrow: 'The VELQUOR difference',
    h2a: 'See what\'s working.',
    h2b: 'Cut what\'s not.',
    subtitle: 'Your trades sync automatically from MT5. Entry, SL, TP, open/close time, P&L — all captured instantly. You don\'t type a single number. You just add what the data can\'t capture: how you felt and what setup it was.',
    beforeLabel: 'BEFORE VELQUOR',
    beforeSub: 'Flying blind',
    afterLabel: 'WITH VELQUOR',
    afterSub: 'Every trade auto-logged',
    cards: [
      { icon: '⚡', title: 'Zero manual entry', desc: 'Connect your MT5 once. Every trade — entry price, SL, TP, open/close time, P&L — syncs automatically. Nothing to copy, nothing to type in.' },
      { icon: '✏️', title: 'You only add context', desc: 'After each trade, just pick your setup type and how you felt. 10 seconds. That\'s the only thing you do — VELQUOR handles everything else.' },
      { icon: '◆', title: 'Patterns emerge automatically', desc: 'After 30 trades, VELQUOR shows your real win rate by session, setup, and mood — and tells you exactly what to change to earn more.' },
    ],
  },
  features: {
    eyebrow: 'Everything in one place',
    h2: 'Three core tools. One complete edge.',
    subtitle: 'Auto-logging, AI behavior analysis, and trade copying — built together and working as one system.',
    items: [
      { title: 'Auto-synced from MT5', desc: 'Every trade, position, and P&L syncs from your MT5 account in real time. No manual entry, no CSV uploads, no spreadsheets. Connect once and it runs forever.' },
      { title: 'Built-in Trade Copier', desc: 'Mirror every trade from your master MT5 to any number of slave accounts in under 2 seconds. Proportional or fixed lot sizing. Fully managed from your dashboard.' },
      { title: 'AI behavior analysis', desc: 'VELQUOR correlates your behavior, your strategy, and your trading habits across every trade — and surfaces the exact combinations that win and the ones that lose.' },
      { title: 'Session & setup analytics', desc: 'Instantly see your win rate broken down by London, New York, and Asian session — and by every setup type you trade. Find your real edge in the numbers.' },
      { title: 'Live TradingView charts', desc: 'A full TradingView chart, live ticker tape, and market overview built straight into your dashboard. Watch Gold and NAS100 without leaving your journal.' },
      { title: 'Journal, habits & discipline', desc: 'Daily journal with mood tracking, habit streaks, discipline scoring, and AI-graded weekly reviews. Your routine and your P&L, finally connected.' },
      { title: 'Prop firm tracker', desc: 'Running a challenge? Activate Prop Firm Mode and VELQUOR watches every rule — max daily loss, drawdown, profit target — in real time.' },
      { title: 'Market news & portfolio', desc: 'A Bloomberg-style calendar of red-folder USD releases with live countdowns and plain-English briefs on what each number moves — plus a long-term portfolio tracker for stocks, ETFs, and metals.' },
      { title: 'PDF trade reports', desc: 'Generate a professional PDF report for any date range. Weekly reviews, monthly summaries, or a full account audit — formatted and ready to go.' },
    ],
  },
  howItWorks: {
    eyebrow: 'How it works',
    h2: 'Up and running in under 2 minutes',
    subtitle: 'No spreadsheets. No CSV exports. No manual data entry. Just connect your MT5 and trade.',
    cta: 'Start your free account →',
    steps: [
      { title: 'Create your free account', desc: 'Sign up with email or Google in under 30 seconds. No credit card, no commitment.', detail: 'Your data is fully private and isolated — secured with row-level encryption from day one.' },
      { title: 'Connect your MT5 account', desc: 'Enter your MT5 login number, investor password, and broker server name. That\'s it — your entire trade history syncs automatically.', detail: 'Works with every MT5 broker worldwide — IC Markets, Blueberry, Pepperstone, FTMO live accounts, and more.' },
      { title: 'See your real numbers', desc: 'Your dashboard fills instantly. Win rate, profit factor, P&L by instrument, session, and day of week — all calculated from your actual trades.', detail: 'VELQUOR AI immediately surfaces your biggest patterns and the areas costing you the most money.' },
      { title: 'Build a consistent process', desc: 'Journal every trade, track your daily habits, run weekly reviews. Over time, VELQUOR correlates your routine with your results.', detail: 'Most traders identify their biggest leak within the first week of using the journal and analytics together.' },
    ],
  },
  velquorAI: {
    eyebrow: 'VELQUOR AI',
    h2: 'An AI analyst that knows your every trade',
    subtitle: 'Most analysis stops at P&L. VELQUOR goes three levels deeper — correlating your behavior (mood, energy, confidence), your strategy (setups, sessions, instruments), and your habits (timing, frequency, risk sizing). Then it shows you exactly where those three dimensions intersect to win or lose.',
    placeholder: 'Ask VELQUOR anything…',
    online: 'Online',
    qa: [
      { q: 'Why am I losing on Nasdaq?', a: 'Your NAS100 trades show a 38% win rate — below breakeven. 6 of your 8 losses came in the first 30 minutes after NY open. You\'re likely trading against institutional order flow before direction is established. Consider a 30-minute wait rule after 15:30 CET.' },
      { q: "What's my best setup?", a: 'ICT Order Block setups on XAUUSD are your strongest edge — 78% win rate, avg +€142 per trade. They perform best during London session between 08:00–11:00 CET. This is where you should be focused.' },
      { q: 'Am I overtrading?', a: 'Yes — your Friday trade count is 2.3x your daily average, with a win rate of 31% vs 67% Mon–Thu. Friday P&L is –€340 this month alone. Consider a strict Friday morning-only rule, max 2 trades.' },
      { q: 'How does mood affect my P&L?', a: "When you log mood as 'confident', avg P&L is +€89/trade. When 'anxious' or 'tired', it drops to –€47. Your 3 worst losing streaks all started on low-energy days. Your energy score is a leading indicator of your performance." },
    ],
  },
  propFirm: {
    badge: '🏆 Prop Firm Mode',
    h2: 'Also running a prop firm challenge?',
    subtitle: 'Activate Prop Firm Mode and VELQUOR monitors every rule of your challenge in real time — max daily loss, total drawdown, profit target, minimum trading days. One wrong day won\'t catch you off guard again.',
    firms: ['FTMO', 'The Funded Trader', 'MyFundedFX', 'E8 Funding', 'Any custom rules'],
    trackNote: 'On track — 3 days to target at current pace',
  },
  pricing: {
    h2: 'Start free. Scale when ready.',
    subtitle: 'No card needed. Cancel any time.',
    toggle: { monthly: 'Monthly', annual: 'Annual', save: 'Save 20%' },
    footer: 'Prices in EUR. VAT may apply. Cancel any time — no questions asked.',
    tiers: [
      {
        name: 'Free',
        monthly: '€0', annual: '€0',
        annualNote: '',
        period: '/mo',
        tagline: 'Get started. No card needed.',
        cta: 'Start for free',
        features: F_FREE,
      },
      {
        name: 'Pro',
        monthly: '€15.99', annual: '€12.99',
        annualNote: 'Billed €155.88/year — save €36',
        period: '/mo',
        tagline: 'Full analytics. Built-in trade copier.',
        cta: 'Start Pro',
        badge: 'Most popular',
        features: F_PRO,
      },
      {
        name: 'Ultra',
        monthly: '€30.99', annual: '€24.99',
        annualNote: 'Billed €299.88/year — save €72',
        period: '/mo',
        tagline: 'Everything in Pro. Multi-group copying.',
        cta: 'Start Ultra',
        features: F_ULTRA,
      },
    ],
  },
  finalCta: {
    h2: 'Your next trade deserves better than a spreadsheet.',
    subtitle: 'Connect MT5 once. Every trade auto-logged, analysed by AI, and copied across your accounts — from day one.',
    cta: 'Start free — no card needed',
    note: 'Free forever plan · 2-minute setup · cancel anytime',
    brokersLabel: 'Works with every MT5 broker',
  },
  trust: {
    eyebrow: 'Built for trust',
    h2: 'Your account stays yours.',
    items: [
      { icon: '🔑', title: 'No passwords shared', desc: 'The VELQUOR EA runs inside your own MT5 terminal. Your broker credentials never leave your machine — only trade data syncs, over a personal API key you can revoke anytime.' },
      { icon: '🇪🇺', title: 'EU infrastructure', desc: 'Database and bridge both run on European servers. Your trading data never leaves the EU — GDPR-compliant by design.' },
      { icon: '📤', title: 'You own your data', desc: 'Export every trade as PDF whenever you want. Delete your account and everything goes with it — no lock-in, no questions.' },
      { icon: '⏻', title: 'Kill switch built in', desc: 'Disconnect the EA or pause the trade copier with one click from your dashboard. You are always in control of what executes.' },
    ],
  },
  faq: {
    eyebrow: 'FAQ',
    h2: 'Questions, answered.',
    subtitle: 'Everything traders ask before connecting their first account.',
    items: [
      { q: 'Do I have to give VELQUOR my MT5 password?', a: 'No. VELQUOR works through an Expert Advisor that runs inside your own MT5 terminal — your broker login never leaves your machine. The EA authenticates with a personal API key and pushes your trade data to your dashboard. You can revoke the key at any time.' },
      { q: 'Which brokers are supported?', a: 'Every broker that offers MetaTrader 5 — IC Markets, Pepperstone, Blueberry, Vantage, FTMO, Eightcap and hundreds more. If it runs MT5, it works with VELQUOR.' },
      { q: 'How fast is the trade copier?', a: 'Signals travel from your master account to your slave accounts in about one to two seconds. Lot sizing is proportional or fixed — you choose per group — and every copy is logged with its execution time so you can audit it.' },
      { q: 'Is my trading data safe?', a: 'Your data is stored on EU servers, isolated per account, and encrypted in transit. Nobody else can see your trades — and VELQUOR never has the ability to withdraw from or trade on your account by itself.' },
      { q: 'Do I need a credit card for the free plan?', a: 'No. The free plan is free forever — no card, no trial countdown. You get auto-sync, the journal, and core stats. Upgrade only when you want AI analysis, unlimited history, or the trade copier.' },
      { q: 'Can I use it during a prop firm challenge?', a: 'Yes — that is exactly what Prop Firm Mode is for. VELQUOR tracks your max daily loss, total drawdown, and profit target in real time, and warns you before you get close to breaking a rule.' },
    ],
  },
  footer: {
    copyright: 'Velquor © 2026',
    links: ['Privacy', 'Terms', 'Contact'],
    impressumLabel: 'Impressum',
  },
}

// ── German ────────────────────────────────────────────────────────────────────
const de: LandingT = {
  nav: {
    features: 'Funktionen',
    howItWorks: 'So funktioniert\'s',
    pricing: 'Preise',
    signIn: 'Anmelden',
    getStarted: 'Jetzt starten',
  },
  hero: {
    badge: 'Für ernsthafte MT5-Trader',
    h1a: 'Sieh die Wahrheit',
    h1b: 'Trade den Vorteil.',
    subtitle: 'Verbinde dein MT5-Konto und sieh sofort, was funktioniert, was nicht — und wo du genau Geld verlierst.',
    cta: 'Kostenlos starten — keine Karte nötig',
    ctaSub: 'Einblick nehmen ↓',
    trust: ['Jeder MT5-Broker', 'Live & Demo-Konten', 'KI-gestützt', 'Mobile PWA'],
  },
  stats: [
    { label: 'Erfasste Trades' },
    { label: 'Ø Gewinnrate-Steigerung' },
    { label: 'MT5-Sync-Zeit' },
    { label: 'KI-Insights pro Woche' },
  ],
  showcase: {
    eyebrow: 'Die Transformation',
    h2a: 'Ohne VELQUOR.',
    h2b: 'Mit VELQUOR.',
    subtitle: 'Deine Trades werden automatisch von MT5 synchronisiert. Einstieg, SL, TP, Zeit, GuV — alles sofort erfasst. Du tippst keine einzige Zahl. Du gibst nur dazu, was die Daten nicht können: wie du dich fühltest und welches Setup es war.',
    beforeLabel: 'OHNE VELQUOR',
    beforeSub: 'Im Blindflug',
    afterLabel: 'MIT VELQUOR',
    afterSub: 'Jeder Trade automatisch geloggt',
    cards: [
      { icon: '⚡', title: 'Null manuelle Eingabe', desc: 'Verbinde dein MT5 einmal. Jeder Trade — Einstieg, SL, TP, Zeit, GuV — synchronisiert automatisch. Nichts zu kopieren, nichts einzutippen.' },
      { icon: '✏️', title: 'Du gibst nur Kontext hinzu', desc: 'Nach jedem Trade wählst du Setup-Typ und Gemütszustand. 10 Sekunden. Das ist alles — VELQUOR erledigt den Rest.' },
      { icon: '◆', title: 'Muster entstehen automatisch', desc: 'Nach 30 Trades zeigt VELQUOR deine echte Gewinnrate nach Session, Setup und Stimmung — und sagt dir, was du ändern musst.' },
    ],
  },
  features: {
    eyebrow: 'Alles an einem Ort',
    h2: 'Gebaut für Trader, die es ernst meinen',
    subtitle: 'Kein weiteres Handelsjournal. Ein vollständiges Betriebssystem für dein Trading-Business.',
    items: [
      { title: 'Auto-Sync von MT5', desc: 'Jeder Trade, jede Position, jede GuV synchronisiert in Echtzeit. Keine manuelle Eingabe, keine CSV-Uploads, keine Tabellen.' },
      { title: 'Integrierter Trade-Copier', desc: 'Spiegle jeden Trade von deinem Master-MT5 auf beliebig viele Slave-Konten in unter 2 Sekunden. Proportionale oder feste Lots — komplett vom Dashboard aus verwaltet.' },
      { title: 'KI-Verhaltensanalyse', desc: 'VELQUOR korreliert dein Verhalten, deine Strategie und deine Gewohnheiten über jeden Trade — und zeigt exakt die Kombinationen, die gewinnen und die, die verlieren.' },
      { title: 'Session- & Setup-Analyse', desc: 'Sieh sofort deine Gewinnrate nach London-, New York- und Asia-Session — und nach jedem Setup-Typ, den du tradest.' },
      { title: 'Live-TradingView-Charts', desc: 'Vollständiger TradingView-Chart, Live-Ticker und Marktübersicht direkt im Dashboard. Gold und NAS100 im Blick, ohne dein Journal zu verlassen.' },
      { title: 'Journal, Habits & Disziplin', desc: 'Tagesjournal mit Stimmungstracking, Habit-Streaks, Disziplin-Score und KI-bewerteten Wochenreviews. Deine Routine und deine GuV, endlich verbunden.' },
      { title: 'Prop-Firm-Tracker', desc: 'Läuft gerade eine Challenge? Aktiviere den Prop-Firm-Modus und VELQUOR überwacht jede Regel — Max Daily Loss, Drawdown, Profitziel — in Echtzeit.' },
      { title: 'Marktnachrichten & Portfolio', desc: 'Ein Bloomberg-artiger Kalender der wichtigsten USD-Termine mit Live-Countdown und Klartext-Erklärung, was jede Zahl bewegt — plus langfristiger Portfolio-Tracker für Aktien, ETFs und Metalle.' },
      { title: 'PDF-Handelsberichte', desc: 'Erstelle professionelle PDF-Berichte für beliebige Zeiträume. Wochenreviews, Monatszusammenfassungen oder vollständige Kontoaudits — formatiert und bereit.' },
    ],
  },
  howItWorks: {
    eyebrow: 'So funktioniert\'s',
    h2: 'In unter 2 Minuten einsatzbereit',
    subtitle: 'Keine Tabellen. Keine CSV-Exporte. Keine manuelle Dateneingabe. Einfach MT5 verbinden und traden.',
    cta: 'Kostenloses Konto erstellen →',
    steps: [
      { title: 'Kostenloses Konto erstellen', desc: 'Registriere dich in unter 30 Sekunden mit E-Mail oder Google. Keine Kreditkarte, keine Verpflichtung.', detail: 'Deine Daten sind vollständig privat und isoliert — von Anfang an mit Row-Level-Verschlüsselung gesichert.' },
      { title: 'MT5-Konto verbinden', desc: 'Gib deine MT5-Login-Nummer, das Investor-Passwort und den Broker-Servernamen ein. Das war\'s — deine gesamte Handelshistorie wird automatisch synchronisiert.', detail: 'Funktioniert mit jedem MT5-Broker weltweit — IC Markets, Blueberry, Pepperstone, FTMO-Live-Konten und mehr.' },
      { title: 'Echte Zahlen sehen', desc: 'Dein Dashboard füllt sich sofort. Gewinnrate, Profit-Faktor, GuV nach Instrument, Session und Wochentag — alles aus deinen echten Trades berechnet.', detail: 'VELQUOR KI deckt sofort deine größten Muster und die Bereiche auf, die dich am meisten Geld kosten.' },
      { title: 'Konsistenten Prozess aufbauen', desc: 'Journalisiere jeden Trade, verfolge tägliche Gewohnheiten, führe Wochenreviews durch. Mit der Zeit korreliert VELQUOR deine Routine mit deinen Ergebnissen.', detail: 'Die meisten Trader identifizieren ihr größtes Leck in der ersten Woche mit Journal und Analytics.' },
    ],
  },
  velquorAI: {
    eyebrow: 'VELQUOR KI',
    h2: 'Eine KI, die dein Trading wirklich kennt',
    subtitle: 'VELQUOR hat Zugriff auf jeden Trade, jeden Journal-Eintrag, jedes Stimmungslog. Sie gibt keine generischen Ratschläge — sie analysiert deine Daten und sagt dir genau, was dich aufhält.',
    placeholder: 'Frag VELQUOR alles…',
    online: 'Online',
    qa: [
      { q: 'Warum verliere ich auf Nasdaq?', a: 'Deine NAS100-Trades zeigen eine Gewinnrate von 38 % — unter dem Breakeven. 6 deiner 8 Verluste kamen in den ersten 30 Minuten nach NY-Open. Du tradest wahrscheinlich gegen den institutionellen Orderflow, bevor sich eine Richtung etabliert. Erwäge eine 30-Minuten-Warteregel nach 15:30 Uhr MEZ.' },
      { q: 'Was ist mein bestes Setup?', a: 'ICT Order Block Setups auf XAUUSD sind deine stärkste Edge — 78 % Gewinnrate, Ø +€142 pro Trade. Sie funktionieren am besten in der Londoner Session von 08:00–11:00 Uhr MEZ. Hier sollte dein Fokus liegen.' },
      { q: 'Trade ich zu viel?', a: 'Ja — deine Freitags-Tradeanzahl ist 2,3-mal so hoch wie dein Tagesdurchschnitt, mit einer Gewinnrate von 31 % gegenüber 67 % Mo–Do. Freitags-GuV ist –€340 allein in diesem Monat. Erwäge eine strikte Freitag-Morgen-Regel, maximal 2 Trades.' },
      { q: 'Wie beeinflusst Stimmung meine GuV?', a: "Wenn du Stimmung als 'zuversichtlich' loggst, beträgt Ø GuV +€89/Trade. Bei 'ängstlich' oder 'müde' sinkt sie auf –€47. Deine 3 schlimmsten Verlustserien begannen alle an Tagen mit wenig Energie. Deine Energiebewertung ist ein Frühindikator für deine Performance." },
    ],
  },
  propFirm: {
    badge: '🏆 Prop-Firm-Modus',
    h2: 'Läuft auch eine Prop-Firm-Challenge?',
    subtitle: 'Aktiviere den Prop-Firm-Modus und VELQUOR überwacht jede Regel deiner Challenge in Echtzeit — Max Daily Loss, Gesamtdrawdown, Profitziel, Mindesthandelstage. Ein falscher Tag überrascht dich nicht mehr.',
    firms: ['FTMO', 'The Funded Trader', 'MyFundedFX', 'E8 Funding', 'Beliebige eigene Regeln'],
    trackNote: 'Auf Kurs — 3 Tage bis zum Ziel im aktuellen Tempo',
  },
  pricing: {
    h2: 'Kostenlos starten. Skalieren wenn bereit.',
    subtitle: 'Keine Karte nötig. Jederzeit kündbar.',
    toggle: { monthly: 'Monatlich', annual: 'Jährlich', save: '20% sparen' },
    footer: 'Preise in EUR. MwSt. kann anfallen. Jederzeit kündbar — keine Fragen.',
    tiers: [
      {
        name: 'Free',
        monthly: '€0', annual: '€0',
        annualNote: '',
        period: '/Mo.',
        tagline: 'Jetzt starten. Keine Karte nötig.',
        cta: 'Kostenlos starten',
        features: F_FREE,
      },
      {
        name: 'Pro',
        monthly: '€15.99', annual: '€12.99',
        annualNote: 'Jährlich €155.88 — spare €36',
        period: '/Mo.',
        tagline: 'Vollständige Analyse. Eingebauter Trade-Kopierer.',
        cta: 'Pro starten',
        badge: 'Beliebteste Wahl',
        features: F_PRO,
      },
      {
        name: 'Ultra',
        monthly: '€30.99', annual: '€24.99',
        annualNote: 'Jährlich €299.88 — spare €72',
        period: '/Mo.',
        tagline: 'Alles aus Pro. Multi-Gruppen-Kopieren.',
        cta: 'Ultra starten',
        features: F_ULTRA,
      },
    ],
  },
  finalCta: {
    h2: 'Dein nächster Trade verdient mehr als eine Tabelle.',
    subtitle: 'MT5 einmal verbinden. Jeder Trade automatisch geloggt, von KI analysiert und auf deine Konten kopiert — vom ersten Tag an.',
    cta: 'Kostenlos starten — keine Karte nötig',
    note: 'Für immer kostenloser Plan · 2 Minuten Setup · jederzeit kündbar',
    brokersLabel: 'Funktioniert mit jedem MT5-Broker',
  },
  trust: {
    eyebrow: 'Auf Vertrauen gebaut',
    h2: 'Dein Konto bleibt deins.',
    items: [
      { icon: '🔑', title: 'Keine Passwörter geteilt', desc: 'Der VELQUOR EA läuft in deinem eigenen MT5-Terminal. Deine Broker-Zugangsdaten verlassen nie deinen Rechner — nur Handelsdaten werden über einen persönlichen API-Key synchronisiert, den du jederzeit widerrufen kannst.' },
      { icon: '🇪🇺', title: 'EU-Infrastruktur', desc: 'Datenbank und Bridge laufen auf europäischen Servern. Deine Trading-Daten verlassen die EU nicht — DSGVO-konform by design.' },
      { icon: '📤', title: 'Deine Daten gehören dir', desc: 'Exportiere jeden Trade als PDF, wann immer du willst. Lösche dein Konto und alles verschwindet mit — kein Lock-in, keine Fragen.' },
      { icon: '⏻', title: 'Kill-Switch eingebaut', desc: 'Trenne den EA oder pausiere den Trade-Copier mit einem Klick direkt vom Dashboard. Du behältst immer die Kontrolle darüber, was ausgeführt wird.' },
    ],
  },
  faq: {
    eyebrow: 'FAQ',
    h2: 'Fragen, beantwortet.',
    subtitle: 'Alles, was Trader fragen, bevor sie ihr erstes Konto verbinden.',
    items: [
      { q: 'Muss ich VELQUOR mein MT5-Passwort geben?', a: 'Nein. VELQUOR arbeitet über einen Expert Advisor, der in deinem eigenen MT5-Terminal läuft — dein Broker-Login verlässt nie deinen Rechner. Der EA authentifiziert sich mit einem persönlichen API-Key und sendet deine Handelsdaten an dein Dashboard. Den Key kannst du jederzeit widerrufen.' },
      { q: 'Welche Broker werden unterstützt?', a: 'Jeder Broker mit MetaTrader 5 — IC Markets, Pepperstone, Blueberry, Vantage, FTMO, Eightcap und hunderte mehr. Wenn er MT5 anbietet, funktioniert er mit VELQUOR.' },
      { q: 'Wie schnell ist der Trade-Copier?', a: 'Signale brauchen vom Master-Konto zu den Slave-Konten etwa ein bis zwei Sekunden. Lotgrößen sind proportional oder fest — du entscheidest pro Gruppe — und jede Kopie wird mit Ausführungszeit protokolliert.' },
      { q: 'Sind meine Trading-Daten sicher?', a: 'Deine Daten liegen auf EU-Servern, pro Konto isoliert und verschlüsselt übertragen. Niemand sonst sieht deine Trades — und VELQUOR kann niemals selbst von deinem Konto abheben oder darauf handeln.' },
      { q: 'Brauche ich eine Kreditkarte für den Free-Plan?', a: 'Nein. Der Free-Plan ist für immer kostenlos — keine Karte, kein Trial-Countdown. Du bekommst Auto-Sync, das Journal und Kern-Statistiken. Upgrade erst, wenn du KI-Analyse, unbegrenzte Historie oder den Trade-Copier willst.' },
      { q: 'Kann ich es während einer Prop-Firm-Challenge nutzen?', a: 'Ja — genau dafür gibt es den Prop-Firm-Modus. VELQUOR überwacht Max Daily Loss, Gesamt-Drawdown und Profitziel in Echtzeit und warnt dich, bevor du einer Regelverletzung nahekommst.' },
    ],
  },
  footer: {
    copyright: 'Velquor © 2026',
    links: ['Datenschutz', 'AGB', 'Kontakt'],
    impressumLabel: 'Impressum',
  },
}

// ── Chinese (Simplified) ──────────────────────────────────────────────────────
const zh: LandingT = {
  nav: {
    features: '功能',
    howItWorks: '使用方式',
    pricing: '定价',
    signIn: '登录',
    getStarted: '立即开始',
  },
  hero: {
    badge: '专为严肃的MT5交易者打造',
    h1a: '看清真相',
    h1b: '掌握优势。',
    subtitle: '连接你的MT5账户，立即查看什么有效、什么无效——以及你究竟在哪里漏财。',
    cta: '免费开始——无需信用卡',
    ctaSub: '查看内部 ↓',
    trust: ['任何MT5券商', '真实与模拟账户', 'AI驱动', '移动PWA'],
  },
  stats: [
    { label: '已追踪交易' },
    { label: '平均胜率提升' },
    { label: 'MT5同步时间' },
    { label: '每周AI洞察' },
  ],
  showcase: {
    eyebrow: '转变之路',
    h2a: '使用VELQUOR之前。',
    h2b: '使用VELQUOR之后。',
    subtitle: '你的交易从MT5自动同步。入场价、止损、止盈、开收盘时间、盈亏——全部即时捕获。你无需输入任何数字。你只需补充数据无法捕捉的内容：你的情绪和所用的策略类型。',
    beforeLabel: '使用前',
    beforeSub: '摸黑飞行',
    afterLabel: '使用VELQUOR后',
    afterSub: '每笔交易自动记录',
    cards: [
      { icon: '⚡', title: '零手动输入', desc: '一次连接MT5，每笔交易——入场价、止损、止盈、时间、盈亏——自动同步。无需复制，无需输入。' },
      { icon: '✏️', title: '你只需补充背景', desc: '每笔交易后，只需选择策略类型和情绪状态。10秒钟，仅此而已——VELQUOR处理其余所有事情。' },
      { icon: '◆', title: '规律自动浮现', desc: '30笔交易后，VELQUOR按时段、策略和情绪显示你的真实胜率——并告诉你应该改变什么来赚更多钱。' },
    ],
  },
  features: {
    eyebrow: '一切尽在一处',
    h2: '为认真对待交易的人而建',
    subtitle: '不只是交易日志，而是你交易事业的完整操作系统。',
    items: [
      { title: '从MT5自动同步', desc: '每笔交易、每个持仓、每笔盈亏实时同步。无手动输入，无CSV上传，无电子表格。' },
      { title: '内置跟单系统', desc: '2秒内将主账户的每笔交易镜像到任意数量的从账户。按比例或固定手数——全部在仪表盘中管理。' },
      { title: 'AI行为分析', desc: 'VELQUOR关联你的行为、策略和交易习惯——精准找出赢钱的组合和亏钱的组合。' },
      { title: '时段与策略分析', desc: '立即查看按伦敦、纽约、亚洲时段分解的胜率——以及每种策略类型的表现。' },
      { title: 'TradingView实时图表', desc: '完整的TradingView图表、实时行情条和市场概览直接内置于仪表盘。无需离开日志即可关注黄金和纳指。' },
      { title: '日志、习惯与纪律', desc: '每日日志配合情绪追踪、习惯连击、纪律评分和AI评级的周度回顾。你的日常习惯与盈亏，终于关联起来。' },
      { title: '自营公司追踪器', desc: '正在参加挑战赛？激活自营公司模式，VELQUOR实时监控每条规则——每日最大亏损、回撤、盈利目标。' },
      { title: '市场新闻与投资组合', desc: '彭博风格的高影响美元数据日历，实时倒计时，并用大白话解释每个数据会如何影响市场——外加股票、ETF和贵金属的长期投资组合追踪。' },
      { title: 'PDF交易报告', desc: '为任意日期范围生成专业PDF报告。周度回顾、月度总结或完整账户审计——格式规范，随时可用。' },
    ],
  },
  howItWorks: {
    eyebrow: '使用方式',
    h2: '2分钟内即可运行',
    subtitle: '无电子表格，无CSV导出，无手动数据输入。只需连接MT5并交易。',
    cta: '创建免费账户 →',
    steps: [
      { title: '创建免费账户', desc: '30秒内用邮箱或Google注册。无需信用卡，无任何承诺。', detail: '你的数据完全私密且隔离——从第一天起就用行级加密保护。' },
      { title: '连接你的MT5账户', desc: '输入MT5登录号、投资者密码和券商服务器名称。就这些——你的完整交易历史将自动同步。', detail: '适用于全球所有MT5券商——IC Markets、Blueberry、Pepperstone、FTMO真实账户等。' },
      { title: '查看真实数据', desc: '仪表板即时填充。胜率、盈利因子、按品种/时段/星期分解的盈亏——全部由你的真实交易计算。', detail: 'VELQUOR AI立即揭示你最大的规律和最耗钱的领域。' },
      { title: '建立稳定流程', desc: '记录每笔交易，追踪日常习惯，进行每周回顾。随时间推移，VELQUOR将你的习惯与结果关联。', detail: '大多数交易者在第一周内就通过日志和分析找出了最大的漏洞。' },
    ],
  },
  velquorAI: {
    eyebrow: 'VELQUOR AI',
    h2: '真正了解你交易的AI',
    subtitle: 'VELQUOR能访问每笔交易、每条日志、每次情绪记录。它不给出泛泛建议——它分析你的数据，准确告诉你是什么在阻碍你。',
    placeholder: '问VELQUOR任何问题…',
    online: '在线',
    qa: [
      { q: '我为什么在纳斯达克亏损？', a: '你的NAS100交易胜率为38%——低于盈亏平衡。你8次亏损中有6次发生在纽约开盘后的前30分钟。你可能在方向确立前逆着机构订单流交易。考虑在15:30 CET后设置30分钟等待规则。' },
      { q: '我最佳的策略是什么？', a: 'XAUUSD上的ICT订单块策略是你最强的优势——胜率78%，平均+€142/笔。它们在伦敦时段08:00-11:00 CET表现最佳。这是你应该专注的方向。' },
      { q: '我交易是否过度？', a: '是的——你周五的交易次数是日均的2.3倍，胜率为31%，而周一至周四为67%。本月周五盈亏为-€340。考虑严格执行仅限周五上午、最多2笔交易的规则。' },
      { q: '情绪如何影响我的盈亏？', a: "当你记录情绪为'自信'时，平均盈亏为+€89/笔。当'焦虑'或'疲倦'时，下降至-€47。你最严重的3次连续亏损都始于低能量状态的日子。你的精力评分是你表现的领先指标。" },
    ],
  },
  propFirm: {
    badge: '🏆 自营公司模式',
    h2: '同时在参加自营公司挑战赛？',
    subtitle: '激活自营公司模式，VELQUOR实时监控你挑战赛的每条规则——最大每日亏损、总体回撤、盈利目标、最少交易天数。一个错误的交易日再也不会让你猝不及防。',
    firms: ['FTMO', 'The Funded Trader', 'MyFundedFX', 'E8 Funding', '任何自定义规则'],
    trackNote: '进度正常——按当前速度还需3天达成目标',
  },
  pricing: {
    h2: '免费开始。准备好了再升级。',
    subtitle: '无需信用卡。随时取消。',
    toggle: { monthly: '月付', annual: '年付', save: '省20%' },
    footer: '价格以欧元计，可能需缴增值税。随时取消——无需解释。',
    tiers: [
      {
        name: '免费版',
        monthly: '€0', annual: '€0',
        annualNote: '',
        period: '/月',
        tagline: '立即开始，无需信用卡。',
        cta: '免费开始',
        features: F_FREE,
      },
      {
        name: 'Pro',
        monthly: '€15.99', annual: '€12.99',
        annualNote: '年付€155.88 — 节省€36',
        period: '/月',
        tagline: '完整分析。内置交易复制器。',
        cta: '开始Pro',
        badge: '最受欢迎',
        features: F_PRO,
      },
      {
        name: 'Ultra',
        monthly: '€30.99', annual: '€24.99',
        annualNote: '年付€299.88 — 节省€72',
        period: '/月',
        tagline: '包含Pro全部功能。多组复制。',
        cta: '开始Ultra',
        features: F_ULTRA,
      },
    ],
  },
  finalCta: {
    h2: '你的下一笔交易，值得比电子表格更好的工具。',
    subtitle: '连接一次MT5。每笔交易自动记录、AI分析、并复制到你的所有账户——从第一天开始。',
    cta: '免费开始——无需信用卡',
    note: '永久免费方案 · 2分钟设置 · 随时取消',
    brokersLabel: '兼容所有MT5经纪商',
  },
  trust: {
    eyebrow: '为信任而建',
    h2: '你的账户始终属于你。',
    items: [
      { icon: '🔑', title: '不共享任何密码', desc: 'VELQUOR EA在你自己的MT5终端内运行。经纪商登录凭证永远不会离开你的电脑——仅通过可随时撤销的个人API密钥同步交易数据。' },
      { icon: '🇪🇺', title: '欧盟基础设施', desc: '数据库和桥接服务均运行在欧洲服务器上。你的交易数据不会离开欧盟——设计即符合GDPR。' },
      { icon: '📤', title: '数据归你所有', desc: '随时将每笔交易导出为PDF。删除账户后所有数据一并清除——无锁定，无追问。' },
      { icon: '⏻', title: '内置紧急开关', desc: '在仪表盘上一键断开EA或暂停跟单。执行什么，始终由你掌控。' },
    ],
  },
  faq: {
    eyebrow: '常见问题',
    h2: '你的疑问，我们来解答。',
    subtitle: '交易者连接第一个账户前最常问的问题。',
    items: [
      { q: '我需要把MT5密码交给VELQUOR吗？', a: '不需要。VELQUOR通过运行在你自己MT5终端内的EA工作——经纪商登录凭证永远不会离开你的电脑。EA使用个人API密钥认证，并将交易数据推送到仪表盘。密钥可随时撤销。' },
      { q: '支持哪些经纪商？', a: '所有提供MetaTrader 5的经纪商——IC Markets、Pepperstone、Blueberry、Vantage、FTMO、Eightcap等数百家。只要支持MT5，就能用VELQUOR。' },
      { q: '跟单速度有多快？', a: '信号从主账户传到从账户约需1至2秒。手数可按比例或固定——每组独立设置——每笔复制都记录执行时间，可随时审计。' },
      { q: '我的交易数据安全吗？', a: '数据存储在欧盟服务器上，按账户隔离，传输全程加密。没有人能看到你的交易——VELQUOR自身永远无法从你的账户出金或下单。' },
      { q: '免费方案需要信用卡吗？', a: '不需要。免费方案永久免费——无需信用卡，没有试用倒计时。包含自动同步、日志和核心统计。需要AI分析、无限历史或跟单时再升级即可。' },
      { q: '自营公司挑战赛期间可以使用吗？', a: '可以——自营公司模式正是为此而生。VELQUOR实时追踪每日最大亏损、总回撤和盈利目标，并在你接近违规前发出警告。' },
    ],
  },
  footer: {
    copyright: 'Velquor © 2026',
    links: ['隐私政策', '条款', '联系我们'],
    impressumLabel: '法律信息',
  },
}

// ── Spanish ───────────────────────────────────────────────────────────────────
const es: LandingT = {
  nav: {
    features: 'Funciones',
    howItWorks: 'Cómo funciona',
    pricing: 'Precios',
    signIn: 'Iniciar sesión',
    getStarted: 'Empezar',
  },
  hero: {
    badge: 'Hecho para traders serios de MT5',
    h1a: 'Ve la verdad',
    h1b: 'Opera con ventaja.',
    subtitle: 'Conecta tu cuenta MT5 y ve al instante qué funciona, qué no, y exactamente dónde estás perdiendo dinero.',
    cta: 'Empieza gratis — sin tarjeta',
    ctaSub: 'Ver por dentro ↓',
    trust: ['Cualquier broker MT5', 'Cuentas reales y demo', 'Impulsado por IA', 'PWA móvil'],
  },
  stats: [
    { label: 'Operaciones registradas' },
    { label: 'Mejora media en tasa de victorias' },
    { label: 'Tiempo de sincronización MT5' },
    { label: 'Insights IA por semana' },
  ],
  showcase: {
    eyebrow: 'La transformación',
    h2a: 'Antes de VELQUOR.',
    h2b: 'Con VELQUOR.',
    subtitle: 'Tus operaciones se sincronizan automáticamente desde MT5. Entrada, SL, TP, hora de apertura/cierre, P&L — todo capturado al instante. No escribes ni un número. Solo añades lo que los datos no pueden capturar: cómo te sentiste y qué setup fue.',
    beforeLabel: 'SIN VELQUOR',
    beforeSub: 'Volando a ciegas',
    afterLabel: 'CON VELQUOR',
    afterSub: 'Cada operación registrada automáticamente',
    cards: [
      { icon: '⚡', title: 'Cero entrada manual', desc: 'Conecta tu MT5 una vez. Cada operación — precio de entrada, SL, TP, tiempo, P&L — se sincroniza automáticamente. Nada que copiar, nada que escribir.' },
      { icon: '✏️', title: 'Solo añades contexto', desc: 'Después de cada operación, elige el tipo de setup y cómo te sentiste. 10 segundos. Eso es todo — VELQUOR se encarga del resto.' },
      { icon: '◆', title: 'Los patrones emergen solos', desc: 'Tras 30 operaciones, VELQUOR muestra tu tasa de victorias real por sesión, setup y estado de ánimo — y te dice exactamente qué cambiar para ganar más.' },
    ],
  },
  features: {
    eyebrow: 'Todo en un lugar',
    h2: 'Creado para el trader que se lo toma en serio',
    subtitle: 'No es otro diario de trading. Es un sistema operativo completo para tu negocio de trading.',
    items: [
      { title: 'Sincronización automática de MT5', desc: 'Cada operación, posición y P&L se sincroniza desde tu cuenta MT5 en tiempo real. Sin entrada manual, sin subidas CSV, sin hojas de cálculo.' },
      { title: 'Copiador de operaciones integrado', desc: 'Replica cada operación de tu MT5 maestro a cualquier número de cuentas esclavas en menos de 2 segundos. Lotes proporcionales o fijos — gestionado desde tu panel.' },
      { title: 'Análisis de comportamiento con IA', desc: 'VELQUOR correlaciona tu comportamiento, tu estrategia y tus hábitos en cada operación — y muestra exactamente las combinaciones que ganan y las que pierden.' },
      { title: 'Análisis de sesión y setup', desc: 'Ve al instante tu tasa de victorias por sesión London, New York y Asia — y por cada tipo de setup que operas.' },
      { title: 'Gráficos TradingView en vivo', desc: 'Un gráfico TradingView completo, cinta de cotizaciones en vivo y resumen de mercado integrados en tu panel. Sigue el Oro y el NAS100 sin salir de tu diario.' },
      { title: 'Diario, hábitos y disciplina', desc: 'Diario con seguimiento de ánimo, rachas de hábitos, puntuación de disciplina y revisiones semanales calificadas por IA. Tu rutina y tu P&L, por fin conectados.' },
      { title: 'Rastreador de prop firm', desc: '¿En un desafío? Activa el Modo Prop Firm y VELQUOR vigila cada regla — pérdida máxima diaria, drawdown, objetivo de beneficio — en tiempo real.' },
      { title: 'Noticias del mercado y portafolio', desc: 'Un calendario estilo Bloomberg con los datos USD de alto impacto, cuenta regresiva en vivo y explicaciones claras de qué mueve cada dato — más un rastreador de portafolio para acciones, ETFs y metales.' },
      { title: 'Informes PDF', desc: 'Genera un informe PDF profesional para cualquier rango de fechas. Revisiones semanales, resúmenes mensuales o auditorías completas — todo formateado y listo.' },
    ],
  },
  howItWorks: {
    eyebrow: 'Cómo funciona',
    h2: 'Funcionando en menos de 2 minutos',
    subtitle: 'Sin hojas de cálculo. Sin exportaciones CSV. Sin entrada manual de datos. Solo conecta tu MT5 y opera.',
    cta: 'Crear cuenta gratuita →',
    steps: [
      { title: 'Crea tu cuenta gratuita', desc: 'Regístrate con email o Google en menos de 30 segundos. Sin tarjeta de crédito, sin compromisos.', detail: 'Tus datos son completamente privados y aislados — asegurados con cifrado de nivel de fila desde el primer día.' },
      { title: 'Conecta tu cuenta MT5', desc: 'Introduce tu número de login MT5, contraseña de inversor y nombre del servidor del broker. Eso es todo — todo tu historial de operaciones se sincroniza automáticamente.', detail: 'Compatible con todos los brokers MT5 del mundo — IC Markets, Blueberry, Pepperstone, cuentas en vivo de FTMO y más.' },
      { title: 'Ve tus números reales', desc: 'Tu dashboard se llena al instante. Tasa de victorias, factor de beneficio, P&L por instrumento, sesión y día de la semana — todo calculado de tus operaciones reales.', detail: 'La IA de VELQUOR detecta inmediatamente tus mayores patrones y las áreas que más te cuestan.' },
      { title: 'Construye un proceso consistente', desc: 'Registra cada operación, rastrea tus hábitos diarios, realiza revisiones semanales. Con el tiempo, VELQUOR correlaciona tu rutina con tus resultados.', detail: 'La mayoría de traders identifican su mayor fuga en la primera semana usando el diario y los análisis juntos.' },
    ],
  },
  velquorAI: {
    eyebrow: 'IA VELQUOR',
    h2: 'Una IA que realmente conoce tu trading',
    subtitle: 'VELQUOR tiene acceso a cada operación, cada entrada de diario, cada registro de estado de ánimo. No da consejos genéricos — analiza tus datos y te dice exactamente qué te está frenando.',
    placeholder: 'Pregunta a VELQUOR lo que sea…',
    online: 'En línea',
    qa: [
      { q: '¿Por qué pierdo en Nasdaq?', a: 'Tus operaciones en NAS100 muestran una tasa de victorias del 38% — por debajo del punto de equilibrio. 6 de tus 8 pérdidas vinieron en los primeros 30 minutos tras la apertura de NY. Probablemente estás operando contra el flujo de órdenes institucional antes de que se establezca la dirección. Considera una regla de espera de 30 minutos después de las 15:30 CET.' },
      { q: '¿Cuál es mi mejor setup?', a: 'Los setups ICT Order Block en XAUUSD son tu mayor ventaja — 78% de tasa de victorias, promedio +€142 por operación. Funcionan mejor durante la sesión de Londres entre las 08:00–11:00 CET. Ahí es donde deberías enfocarte.' },
      { q: '¿Estoy operando en exceso?', a: 'Sí — tu conteo de operaciones del viernes es 2,3 veces tu promedio diario, con una tasa de victorias del 31% vs 67% de lunes a jueves. El P&L del viernes es –€340 solo este mes. Considera una regla estricta de solo mañana del viernes, máximo 2 operaciones.' },
      { q: '¿Cómo afecta el estado de ánimo a mi P&L?', a: "Cuando registras estado de ánimo como 'confiado', el P&L promedio es +€89/operación. Cuando 'ansioso' o 'cansado', cae a –€47. Tus 3 peores rachas de pérdidas empezaron en días de baja energía. Tu puntuación de energía es un indicador adelantado de tu rendimiento." },
    ],
  },
  propFirm: {
    badge: '🏆 Modo Prop Firm',
    h2: '¿También en un desafío de prop firm?',
    subtitle: 'Activa el Modo Prop Firm y VELQUOR monitoriza cada regla de tu desafío en tiempo real — pérdida diaria máxima, drawdown total, objetivo de beneficio, días mínimos de trading. Un día equivocado ya no te pillará desprevenido.',
    firms: ['FTMO', 'The Funded Trader', 'MyFundedFX', 'E8 Funding', 'Cualquier regla personalizada'],
    trackNote: 'En camino — 3 días para el objetivo al ritmo actual',
  },
  pricing: {
    h2: 'Empieza gratis. Escala cuando estés listo.',
    subtitle: 'Sin tarjeta. Cancela en cualquier momento.',
    toggle: { monthly: 'Mensual', annual: 'Anual', save: 'Ahorra 20%' },
    footer: 'Precios en EUR. Puede aplicarse IVA. Cancela en cualquier momento — sin preguntas.',
    tiers: [
      {
        name: 'Free',
        monthly: '€0', annual: '€0',
        annualNote: '',
        period: '/mes',
        tagline: 'Empieza ahora. Sin tarjeta.',
        cta: 'Empezar gratis',
        features: F_FREE,
      },
      {
        name: 'Pro',
        monthly: '€15.99', annual: '€12.99',
        annualNote: 'Facturado €155.88/año — ahorra €36',
        period: '/mes',
        tagline: 'Análisis completo. Copiador integrado.',
        cta: 'Iniciar Pro',
        badge: 'Más popular',
        features: F_PRO,
      },
      {
        name: 'Ultra',
        monthly: '€30.99', annual: '€24.99',
        annualNote: 'Facturado €299.88/año — ahorra €72',
        period: '/mes',
        tagline: 'Todo en Pro. Copia multi-grupo.',
        cta: 'Iniciar Ultra',
        features: F_ULTRA,
      },
    ],
  },
  finalCta: {
    h2: 'Tu próxima operación merece algo mejor que una hoja de cálculo.',
    subtitle: 'Conecta MT5 una vez. Cada operación registrada automáticamente, analizada por IA y copiada a tus cuentas — desde el primer día.',
    cta: 'Empieza gratis — sin tarjeta',
    note: 'Plan gratuito para siempre · configuración en 2 minutos · cancela cuando quieras',
    brokersLabel: 'Funciona con cualquier broker MT5',
  },
  trust: {
    eyebrow: 'Construido para la confianza',
    h2: 'Tu cuenta sigue siendo tuya.',
    items: [
      { icon: '🔑', title: 'Sin compartir contraseñas', desc: 'El EA de VELQUOR corre dentro de tu propio terminal MT5. Tus credenciales del broker nunca salen de tu máquina — solo se sincronizan datos de operaciones mediante una clave API personal que puedes revocar cuando quieras.' },
      { icon: '🇪🇺', title: 'Infraestructura en la UE', desc: 'La base de datos y el bridge corren en servidores europeos. Tus datos de trading nunca salen de la UE — conforme al RGPD por diseño.' },
      { icon: '📤', title: 'Tus datos son tuyos', desc: 'Exporta cada operación como PDF cuando quieras. Elimina tu cuenta y todo desaparece con ella — sin ataduras, sin preguntas.' },
      { icon: '⏻', title: 'Interruptor de emergencia', desc: 'Desconecta el EA o pausa el copiador con un clic desde tu panel. Siempre tienes el control de lo que se ejecuta.' },
    ],
  },
  faq: {
    eyebrow: 'FAQ',
    h2: 'Preguntas, respondidas.',
    subtitle: 'Todo lo que los traders preguntan antes de conectar su primera cuenta.',
    items: [
      { q: '¿Tengo que darle a VELQUOR mi contraseña de MT5?', a: 'No. VELQUOR funciona mediante un Expert Advisor que corre dentro de tu propio terminal MT5 — tu login del broker nunca sale de tu máquina. El EA se autentica con una clave API personal y envía tus datos de trading a tu panel. Puedes revocar la clave en cualquier momento.' },
      { q: '¿Qué brokers son compatibles?', a: 'Cualquier broker que ofrezca MetaTrader 5 — IC Markets, Pepperstone, Blueberry, Vantage, FTMO, Eightcap y cientos más. Si tiene MT5, funciona con VELQUOR.' },
      { q: '¿Qué tan rápido es el copiador de operaciones?', a: 'Las señales viajan de tu cuenta maestra a las cuentas esclavas en uno o dos segundos. Los lotes son proporcionales o fijos — lo eliges por grupo — y cada copia queda registrada con su tiempo de ejecución para poder auditarla.' },
      { q: '¿Están seguros mis datos de trading?', a: 'Tus datos se almacenan en servidores de la UE, aislados por cuenta y cifrados en tránsito. Nadie más puede ver tus operaciones — y VELQUOR nunca puede retirar fondos ni operar en tu cuenta por sí solo.' },
      { q: '¿Necesito tarjeta de crédito para el plan gratuito?', a: 'No. El plan gratuito es gratis para siempre — sin tarjeta, sin cuenta atrás de prueba. Incluye auto-sync, el diario y estadísticas clave. Actualiza solo cuando quieras análisis con IA, historial ilimitado o el copiador.' },
      { q: '¿Puedo usarlo durante un desafío de prop firm?', a: 'Sí — exactamente para eso existe el Modo Prop Firm. VELQUOR vigila tu pérdida máxima diaria, el drawdown total y el objetivo de beneficio en tiempo real, y te avisa antes de que estés cerca de romper una regla.' },
    ],
  },
  footer: {
    copyright: 'Velquor © 2026',
    links: ['Privacidad', 'Términos', 'Contacto'],
    impressumLabel: 'Aviso legal',
  },
}

// ── Locale detection + export ─────────────────────────────────────────────────
const packs: Record<Locale, LandingT> = { en, de, zh, es }

export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en'
  const lang = navigator.language || 'en'
  const code = lang.toLowerCase().split('-')[0]
  if (code === 'de') return 'de'
  if (code === 'zh') return 'zh'
  if (code === 'es') return 'es'
  return 'en'
}

export function getTranslations(locale?: Locale): LandingT {
  return packs[locale ?? detectLocale()]
}
