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
    eyebrow: string
    h2: string
    subtitle: string
    footer: string
    tiers: Array<{
      name: string
      price: string
      period: string
      tagline: string
      cta: string
      features: string[]
    }>
  }
  footer: {
    copyright: string
    links: string[]
    impressumLabel: string
  }
}

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
    badge: 'Built for serious MT5 traders',
    h1a: 'See the truth',
    h1b: 'Trade the edge.',
    subtitle: 'Connect your MT5 account and instantly see what\'s working, what\'s not, and exactly where you\'re leaking money.',
    cta: 'Start free — no card needed',
    ctaSub: 'See inside ↓',
    trust: ['Any MT5 Broker', 'Live & Demo Accounts', 'AI-Powered', 'Mobile PWA'],
  },
  stats: [
    { label: 'Trades tracked' },
    { label: 'Avg win rate uplift' },
    { label: 'MT5 sync time' },
    { label: 'AI insights per week' },
  ],
  showcase: {
    eyebrow: 'The transformation',
    h2a: 'Before VELQUOR.',
    h2b: 'After VELQUOR.',
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
    h2: 'Built for the trader who takes it seriously',
    subtitle: 'Not another trade log. A full operating system for your trading business.',
    items: [
      { title: 'Auto-synced from MT5', desc: 'Every trade, position, and P&L syncs from your MT5 account in real time. No manual entry, no CSV uploads, no spreadsheets.' },
      { title: 'VELQUOR AI coaching', desc: 'Ask anything about your trades and get answers built from your actual data — not generic advice. "Why am I losing on NAS100?" gets a real answer.' },
      { title: 'Session & setup analytics', desc: 'Instantly see your win rate broken down by London, New York, and Asian session — and by every setup type you trade.' },
      { title: 'Mood vs. performance', desc: 'Log how you feel before each trading day. Over time, VELQUOR shows you the exact mood states that correlate with your best and worst performance.' },
      { title: 'Prop firm tracker', desc: 'Running a challenge? Activate Prop Firm Mode and VELQUOR watches every rule — max daily loss, drawdown, profit target — in real time.' },
      { title: 'PDF trade reports', desc: 'Generate a professional PDF report for any date range. Weekly reviews, monthly summaries, or a full account audit — all formatted and ready.' },
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
    h2: 'An AI that actually knows your trading',
    subtitle: 'VELQUOR has access to every trade, every journal entry, every mood log. It doesn\'t give generic advice — it analyses your data and tells you exactly what\'s holding you back.',
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
    eyebrow: 'Simple pricing',
    h2: 'One tool. Two plans.',
    subtitle: 'Start free. Upgrade when you need more firepower.',
    footer: 'All plans include a 7-day free trial. Cancel any time — no questions asked. Prices in EUR, VAT may apply.',
    tiers: [
      {
        name: 'Starter',
        price: '€0',
        period: '/month',
        tagline: 'For traders getting started',
        cta: 'Start free',
        features: [
          'Full trade journal — auto-synced from MT5',
          'Win rate, P&L, and session analytics',
          'Mood & habit tracking',
          '30-day trade history',
          '50 VELQUOR AI messages/month',
          'PDF reports (last 7 days)',
        ],
      },
      {
        name: 'Pro',
        price: '€29',
        period: '/month',
        tagline: 'For traders who trade to win',
        cta: 'Start 7-day free trial',
        features: [
          'Everything in Starter, plus:',
          'Unlimited trade history',
          'Unlimited VELQUOR AI messages',
          'Prop Firm Mode (unlimited challenges)',
          'Advanced setup & session analytics',
          'Weekly AI performance reviews',
          'PDF reports — any date range',
          'Priority support',
        ],
      },
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
      { title: 'VELQUOR KI-Coaching', desc: 'Stelle Fragen zu deinen Trades und erhalte Antworten aus deinen echten Daten — keine generischen Ratschläge. "Warum verliere ich auf NAS100?" bekommt eine echte Antwort.' },
      { title: 'Session- & Setup-Analyse', desc: 'Sieh sofort deine Gewinnrate nach London-, New York- und Asia-Session — und nach jedem Setup-Typ, den du tradest.' },
      { title: 'Stimmung vs. Performance', desc: 'Logge deine Tagesverfassung. Mit der Zeit zeigt VELQUOR, welche Gemütszustände mit deinen besten und schlechtesten Ergebnissen korrelieren.' },
      { title: 'Prop-Firm-Tracker', desc: 'Läuft gerade eine Challenge? Aktiviere den Prop-Firm-Modus und VELQUOR überwacht jede Regel — Max Daily Loss, Drawdown, Profitziel — in Echtzeit.' },
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
    eyebrow: 'Einfache Preise',
    h2: 'Ein Tool. Zwei Pläne.',
    subtitle: 'Kostenlos starten. Upgraden wenn du mehr Firepower brauchst.',
    footer: 'Alle Pläne beinhalten 7 Tage kostenlose Testphase. Jederzeit kündbar — keine Fragen gestellt. Preise in EUR, MwSt. kann anfallen.',
    tiers: [
      {
        name: 'Starter',
        price: '€0',
        period: '/Monat',
        tagline: 'Für Einsteiger',
        cta: 'Kostenlos starten',
        features: [
          'Vollständiges Handelsjournal — auto-sync von MT5',
          'Gewinnrate, GuV und Session-Analytics',
          'Stimmungs- & Gewohnheits-Tracking',
          '30 Tage Handelshistorie',
          '50 VELQUOR KI-Nachrichten/Monat',
          'PDF-Berichte (letzte 7 Tage)',
        ],
      },
      {
        name: 'Pro',
        price: '€29',
        period: '/Monat',
        tagline: 'Für Trader, die gewinnen wollen',
        cta: '7 Tage kostenlos testen',
        features: [
          'Alles aus Starter, plus:',
          'Unbegrenzte Handelshistorie',
          'Unbegrenzte VELQUOR KI-Nachrichten',
          'Prop-Firm-Modus (unbegrenzte Challenges)',
          'Erweiterte Setup- & Session-Analytics',
          'Wöchentliche KI-Performance-Reviews',
          'PDF-Berichte — beliebiger Zeitraum',
          'Priority-Support',
        ],
      },
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
      { title: 'VELQUOR AI辅导', desc: '询问任何关于你交易的问题，获得基于你真实数据的答案——而非泛泛建议。"我为什么在NAS100上亏损？"能得到真实答案。' },
      { title: '时段与策略分析', desc: '立即查看按伦敦、纽约、亚洲时段分解的胜率——以及每种策略类型的表现。' },
      { title: '情绪与表现对比', desc: '记录每个交易日前的状态。随着时间推移，VELQUOR显示哪种情绪状态与你的最佳和最差表现相关。' },
      { title: '自营公司追踪器', desc: '正在参加挑战赛？激活自营公司模式，VELQUOR实时监控每条规则——每日最大亏损、回撤、盈利目标。' },
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
    eyebrow: '简单定价',
    h2: '一个工具。两种方案。',
    subtitle: '免费开始。需要更多时再升级。',
    footer: '所有方案均含7天免费试用。随时取消——无需解释。价格以欧元计，可能需缴增值税。',
    tiers: [
      {
        name: '入门版',
        price: '€0',
        period: '/月',
        tagline: '适合刚起步的交易者',
        cta: '免费开始',
        features: [
          '完整交易日志——从MT5自动同步',
          '胜率、盈亏和时段分析',
          '情绪与习惯追踪',
          '30天交易历史',
          '每月50条VELQUOR AI消息',
          'PDF报告（最近7天）',
        ],
      },
      {
        name: '专业版',
        price: '€29',
        period: '/月',
        tagline: '为致胜而交易的交易者',
        cta: '7天免费试用',
        features: [
          '包含入门版所有功能，另加：',
          '无限交易历史',
          '无限VELQUOR AI消息',
          '自营公司模式（无限挑战赛）',
          '高级策略与时段分析',
          '每周AI表现回顾',
          'PDF报告——任意日期范围',
          '优先支持',
        ],
      },
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
      { title: 'Coaching con IA VELQUOR', desc: 'Pregunta cualquier cosa sobre tus operaciones y obtén respuestas basadas en tus datos reales — no consejos genéricos. "¿Por qué pierdo en NAS100?" tiene una respuesta real.' },
      { title: 'Análisis de sesión y setup', desc: 'Ve al instante tu tasa de victorias por sesión London, New York y Asia — y por cada tipo de setup que operas.' },
      { title: 'Estado de ánimo vs. rendimiento', desc: 'Registra cómo te sientes antes de cada jornada. Con el tiempo, VELQUOR muestra los estados de ánimo que correlacionan con tu mejor y peor rendimiento.' },
      { title: 'Rastreador de prop firm', desc: '¿En un desafío? Activa el Modo Prop Firm y VELQUOR vigila cada regla — pérdida máxima diaria, drawdown, objetivo de beneficio — en tiempo real.' },
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
    eyebrow: 'Precios simples',
    h2: 'Una herramienta. Dos planes.',
    subtitle: 'Empieza gratis. Mejora cuando necesites más potencia.',
    footer: 'Todos los planes incluyen 7 días de prueba gratuita. Cancela en cualquier momento — sin preguntas. Precios en EUR, puede aplicarse IVA.',
    tiers: [
      {
        name: 'Starter',
        price: '€0',
        period: '/mes',
        tagline: 'Para traders que empiezan',
        cta: 'Empezar gratis',
        features: [
          'Diario completo — sincronización automática desde MT5',
          'Tasa de victorias, P&L y análisis de sesión',
          'Seguimiento de estado de ánimo y hábitos',
          '30 días de historial de operaciones',
          '50 mensajes IA VELQUOR/mes',
          'Informes PDF (últimos 7 días)',
        ],
      },
      {
        name: 'Pro',
        price: '€29',
        period: '/mes',
        tagline: 'Para traders que operan para ganar',
        cta: 'Prueba gratuita 7 días',
        features: [
          'Todo en Starter, más:',
          'Historial de operaciones ilimitado',
          'Mensajes IA VELQUOR ilimitados',
          'Modo Prop Firm (desafíos ilimitados)',
          'Análisis avanzado de setup y sesión',
          'Revisiones de rendimiento IA semanales',
          'Informes PDF — cualquier rango de fechas',
          'Soporte prioritario',
        ],
      },
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
