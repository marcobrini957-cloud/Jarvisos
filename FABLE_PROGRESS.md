# FABLE_BRIEF.md — Progress Log

Session log for the full optimization run. See FABLE_BRIEF.md for the phase definitions.

## Phase 1 — Component refactor ✅ DONE (2026-07-13)

All six dashboard tabs >600 lines split into focused components. Behavior unchanged
(pure extraction — code moved verbatim, only imports/exports added). `npm run build`
verified after each tab.

| Tab | Before | After (main) | New directory |
|---|---|---|---|
| TradingTab | 2,894 | 495 | `tabs/trading/` — helpers.ts, TradeAnnotationModal, VelquorChat, analytics-shared (StatRow/TableHeader), TraderRadar, TradingInsights, YourEdge, EquityCurve, PositionSizeCalc, ReportDownloadBar, TradeLogTable, useTradeFilters.ts |
| PortfolioTab | 1,320 | 463 | `tabs/portfolio/` — helpers.ts, CsvImportModal (+ exported parseCSV/parseNum/detectColumns/guessAssetType for tests), TickerSearch, HoldingModal, DonutChart (+BREAKDOWN_CATS) |
| JournalTab | 928 | 453 | `tabs/journal/` — helpers.ts (Mood, calendar fns), EntryModal, WeeklyReviewSection |
| CopyTradingTab | 919 | 127 | `tabs/copy/` — types.ts, styles.ts, helpers.tsx, AddAccountModal, CreateGroupModal, SignalLog, GroupCard, PlanGateBanner, HowItWorks |
| OverviewTab | 861 | 339 | `tabs/overview/` — helpers.tsx (useIsMobile, fmt fns), MarketStrip, WinRing, TradeCalendar (+DayDetailPanel), StreakCards |
| DisciplineTab | 683 | 328 | `tabs/discipline/` — helpers.ts, AddHabitModal, AddTaskModal, TaskRow |

New hook: `tabs/trading/useTradeFilters.ts` (symbol/direction filter + pagination,
filter change resets page — same behavior as before).

Notes:
- DashboardShell imports (default exports) unchanged.
- CSV parse helpers in `tabs/portfolio/CsvImportModal.tsx` are exported — Phase 3 test targets.

## Phase 2 — Landing page performance ✅ DONE (2026-07-13)

- `app/page.tsx`: 2,314 → 34 lines. Now a **server component** composing 20 section
  files in `components/landing/`. Client islands ('use client') only where needed:
  Counter, AnimatedDashboard, Nav, Hero, StatsBar, BeforeAfterMockup, ShowcaseSection,
  Features, HowItWorks, VelquorSection, PropFirmSection, Pricing, Footer,
  AutoSyncVisual, CopierVisual, ScrollSetup (body-overflow effect). Server-rendered
  (no JS shipped): Aurora, AIAnalysisVisual, ThreePillars, FooterTagline.
- **Deleted dead code**: `DashboardMockup` (129 lines) and `TradingTabMockup`
  (137 lines) were defined in page.tsx but never rendered anywhere.
- BeforeAfterMockup lazy-loaded via next/dynamic inside ShowcaseSection (below fold).
- `app/login/page.tsx`: 947 → 578 lines. Aurora → `components/login/Aurora.tsx`;
  340-line LoginDashboardPreview → own chunk via next/dynamic.
- `/pricing` left as-is (317 lines; entire page depends on the annual toggle state —
  no meaningful server split available).
- `@react-pdf/renderer` verified server-only already (only imported in
  `app/api/reports/route.ts`, listed in serverExternalPackages) — nothing to do.
- `next.config.ts`: added poweredByHeader:false, image formats (avif/webp) +
  Supabase storage remotePattern (ready for future next/image adoption).
- Note: most landing sections use `useLocale` (client-side navigator locale
  detection) so they must stay client islands; converting locale to Accept-Language
  server detection would make the route dynamic and lose static caching — not done.

## Phase 3 — Tests ✅ DONE (2026-07-13)

Vitest + RTL installed. `npm test` = `vitest run`. **47 tests, all passing.**

Money logic extracted into pure, tested modules (hooks/routes re-import, behavior identical):
- `lib/trading/stats.ts` — computeStats, tradeResult, BE_THRESHOLD, isRealTrade
  (moved out of hooks/useTrades.ts, which re-exports them for compat)
- `lib/mt5/parse.ts` — calcPips, detectSession, groupDealsByPosition,
  buildClosedTradeRows (moved out of app/api/mt5-sync/route.ts, route now 263 lines)
- `lib/portfolio/valuation.ts` — valueHolding, portfolioTotals (used by usePortfolio)
- `bridge/lib.js` — detectSession, calcPips (required by bridge/server.js).
  ⚠️ bridge/lib.js must be deployed to Hetzner together with server.js.

Test files in `tests/`:
- stats.test.ts — P&L, win rate (BE exclusion), profit factor, expectancy,
  streaks, realized R:R, max drawdown, weekly Mon–Sun buckets (fake timers)
- mt5-parse.test.ts — pip conventions per symbol class, session boundaries,
  deal grouping, partial-close aggregation, entry/exit fallback, screenshot flag
- bridge-lib.test.js — bridge pip/session parity
- csv-import.test.ts — EU/US number parsing, quoted CSV, Trade Republic headers
- portfolio-valuation.test.ts — holding valuation + totals

Not covered (would need Supabase/network mocks — deliberately skipped): the
copy-trade API routes themselves (`app/api/copy/*`, bridge Express routes) —
their logic is DB orchestration; the pure parts are tested.
## Phase 4 — TradingView design upgrade ✅ DONE (2026-07-13) — deliberately conservative

Analyzed tradingview.com design language (dark institutional palette, restrained
accents, tabular data density, understated secondary links, generous section
whitespace with tight in-list stacking).

**Official TradingView widgets integrated** (`components/widgets/TradingViewWidget.tsx`
— generic embed loader + attribution links per TV widget terms):
- Ticker tape (Gold, NAS100, EUR/USD, S&P, DAX, BTC) in DashboardShell under the
  Topbar, desktop only
- Advanced chart (XAUUSD default, symbol change allowed, Vienna TZ, dark theme
  matched to Void Black) as "Live Chart" panel in TradingTab above the metrics
- Market overview (Marco's markets / Indices / Crypto tabs, brand green/red plots)
  in OverviewTab right column under StreakCard

**Global polish applied** (globals.css): body-wide tabular-nums (every digit
aligns, TV-style), text-wrap balance on headings, brand selection color.

**Deliberately NOT done**: wholesale restyling of landing/pricing/tab layouts.
Marco hand-tuned the landing + pricing design in the 3 commits before this run
("design: match screenshot pricing layout exactly" etc.) and there is no way to
visually verify changes from this environment. The existing Void Black token
system already matches the TV analysis closely (dark surfaces, sparse accents,
caps labels, card system). Recommend: review widgets live, then decide if a
per-tab visual pass is wanted with eyes on the rendering.

Note: a prefers-reduced-motion kill switch was considered and removed — it would
freeze the landing cursor animation, violating Marco's "cursor never stops" rule.
## Phase 5 — API hardening ✅ DONE (2026-07-13)

**Critical bug found & fixed**: `lib/supabase/server` createClient() returns the
SERVICE-ROLE client, and `auth.getUser()` on it always fails ("Auth session
missing") — verified live against Supabase. **13 routes were returning 401 in
production for every request** (profile, avatar, avatar-unlocks, snapshots/equity
curve, trades/analytics, daily-pnl, reports, macro, mt5-accounts, mt5-debug,
dev/ping…). The UI silently swallowed this (default profile name, empty charts).
Fix: new `lib/api/auth.ts` getAuthUser/getAuthUserId (anon key + cookies — same
pattern mt5-sync and copy routes already used); all routes now authenticate with
it and use the service client for data only.

**Cross-user data leaks fixed** (mattered as soon as a 2nd user signs up, since
service role bypasses RLS):
- `trades/[id]` PATCH — no auth at route + no ownership check → now 401 + `.eq('user_id')`
- `trades/[id]/screenshot` POST — same; now verifies trade ownership before upload
- `velquor/chat` buildContext — queried ALL users' trades/journal/snapshots/
  holdings into the AI prompt → all scoped by user id now
- `velquor/weekly-review`, `velquor/trade-feedback` — same, scoped + auth added
- `macro` POST briefing, `reports`, `avatar-unlocks` — trade/journal/holdings
  queries scoped (macro_briefings table has no user_id column — left global)
- `ai-chat` — auth added (defense in depth; proxy already covered it)

**Rate limiting** (`lib/api/rate-limit.ts`, in-memory sliding window):
- Public routes `/api/market/strip`, `/api/macro/news`, `/api/metals/prices`:
  60 req/min per IP → 429
- Dev console login (`app/dev/actions.ts`): 5 attempts/min per IP,
  timingSafeEqual compare, 750ms failure delay, Secure cookie flag in prod

**proxy.ts**: unauthenticated `/api/*` requests now get 401 JSON instead of a
302 HTML redirect to /login.

Build ✓, 47 tests ✓ after all changes.

---
# BACKLOG / recommended next steps
1. Deploy bridge to Hetzner — now includes **bridge/lib.js** (new file, required by server.js)
2. Verify TradingView widgets render well live (ticker tape height, chart theme)
3. Consider per-tab visual pass with eyes on rendering (Phase 4 was conservative)
4. Distributed rate limiting (Upstash) if user count grows — current is per-instance
5. Consider RLS instead of service-role-everywhere as the long-term security model
