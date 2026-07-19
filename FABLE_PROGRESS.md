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

---
# 2026-07-16 — Bridge deployed + Instant Connect (cloud terminals)

**Bridge LIVE**: Hetzner CX23 Helsinki (37.27.179.184, `ssh velquor-bridge`),
https://bridge.velquor.app behind nginx+LE TLS, pm2, ufw, key-only SSH.
BRIDGE_URL/BRIDGE_ADMIN_TOKEN in Vercel prod+preview + .env.local.
Porkbun: A record `bridge` → 37.27.179.184 (Marco added).

**Instant Connect** (self-hosted MetaAPI replacement, cloudterm/):
- Docker image: Ubuntu 24.04 + Wine 9 + Xvfb + MT5 silent install; first-run
  extracts MQL5 stdlib (required for EA compile — installer doesn't ship it);
  EA compiled headless via `MetaEditor64.exe /portable /compile`.
- entrypoint writes UTF-16LE configs (autologin, EA preset, WebRequest allowlist)
  and SUPERVISES terminal64 via /proc scan — MT5 LiveUpdate exits PID1 to
  relaunch itself, which killed the naive exec-based container (bootloop, exit 69).
- provisioner.js on :3002 (pm2 velquor-term): docker run per user, 700m/0.6cpu,
  creds AES-256-GCM in /opt/velquor-term/accounts (never in Supabase),
  TERM_CAPACITY=4 on this box. nginx exposes /provision*, /capacity.
- Site: app/api/mt5/connect (POST/GET/DELETE) + MT5ConnectModal repointed
  (was MetaAPI /api/user/mt5-credentials); Topbar double-POST removed.
- EA source bugs found by first-ever compile: StringTrimLeft used as expression
  (MQL4-style), ACCOUNT_FREEMARGIN deprecated. Fixed; EA now 0 errors.
- MetaAPI code KEPT until Instant Connect proves out with real users.
- Economics: MetaAPI ~€15/user/mo → self-hosted ~€0.40–0.60/user/mo at scale
  (dedicated ~€40–50/mo = 80–120 terminals). EA-path users ≈ free.

---
# 2026-07-17 — Legal package + dev_todos cleanup

**dev_todos table synced with reality**: marked 10 stale items done after verifying
in code/DB (all copy-trading items — EA master/slave, bridge routing, copy_* tables,
settings UI, lot sizing, SignalLog; bridge deploy + domain; last-seen migration;
tier gating via lib/api/tier.ts). Note: schema went with `copy_accounts`, not
`linked_accounts`. `stripe_customer_id` column does NOT exist yet (billing todo open).

**Legal package shipped** (commit e73e9e2):
- `components/legal/LegalPage.tsx` — shared shell (overflow unlock, back link,
  cross-links footer); impressum refactored onto it (now a server component page)
- `/privacy` — GDPR policy: controller, data categories w/ Art. 6 bases, AI section
  (Anthropic as processor), processors (Vercel/Supabase/Hetzner/Anthropic), cookies,
  retention, rights (incl. dsb.gv.at)
- `/terms` — not-financial-advice, investor-password recommendation, plans, acceptable
  use (incl. no unlicensed signal-selling), Austrian-law liability clause, Graz venue
- `components/CookieConsent.tsx` — banner in root layout; localStorage `vq-cookie-consent`
  ('all'|'essential'); getCookieConsent() exported for future PostHog gating
- Footer Privacy/Terms/Contact links wired (LINK_HREFS by index — locale files keep
  Privacy/Terms/Contact order in all 4 locales)

**Remaining open todos** (all need external accounts from Marco): email (Cloudflare
routing, Gmail Send-As, Resend + templates), billing (Stripe account → then columns,
webhook, portal), growth (PostHog, Sentry, UptimeRobot, Stripe→dev console),
infra (DEV_SECRET in Vercel — unverified).

---
# 2026-07-17 (2) — Full EU compliance pass (commit ec3fb84)

Marco asked to verify everything EU/Austrian law requires. Audit + fixes:

**Shipped:**
- `/datenschutz` + `/agb` — full German Datenschutzerklärung + AGB (Austrian operator
  marketing in German → English-only legal texts are weak against consumers).
  Language cross-links on all four pages (LegalPage `altLang` prop).
- **Consent-gated TradingView widgets** (§ 165 TKG / ePrivacy): third-party script
  loads only after 'all' consent; placeholder with informed one-click opt-in
  (compact row variant for the 40px ticker tape). setCookieConsent/onConsentChange
  event system in CookieConsent.tsx.
- **Consent withdrawal** (Art. 7(3) DSGVO): "Cookie settings" reopens banner —
  in landing Footer (locale-aware label) + legal shell footer.
- **14-day consumer withdrawal right** (§ 11 FAGG) incl. model form + immediate-
  performance clause in Terms §5 / AGB §5 — REQUIRED before Stripe goes live.
- **ADR statement** (AStG — "not obliged/not willing") in Terms §10, AGB §10,
  Impressum. (EU ODR platform was discontinued July 2025 — no link needed.)
- de locale footer → /datenschutz + /agb. Proxy allowlist extended.

**Verified OK, no action:** next/font self-hosts Inter (no Google request — the
LG München Google-Fonts issue avoided); market data proxied server-side; no
analytics/tracking; EAA accessibility — micro-enterprise exemption applies.

---
# 2026-07-17 (3) — Mobile login bug hunt (commits a6f9bc4, b1b6c31, d3b9d72)

Marco: "login works on PC, phone shows error + reload." Reproduced with Playwright
WebKit iPhone emulation against production. FOUR real bugs found:

1. **Supabase Site URL was still http://localhost:3000, redirect allowlist EMPTY**
   → all OAuth/magic-link/reset/confirmation redirects went to localhost (works on
   Marco's PC with dev server, dead on phone). Fixed via Management API (Marco's
   sbp_ token): site_url=https://velquor.app, allowlist velquor.app/** + localhost:3000/**.
2. **New-user signup 100% broken** ("Database error creating new user"): TWO triggers
   on auth.users — legacy `on_auth_user_created`→`handle_new_user()` (from
   supabase-multiuser-setup.sql, no SET search_path → unqualified user_profiles
   unresolvable in GoTrue context) + the good foundation trigger. Dropped legacy
   trigger+function via Management API SQL. Verified: admin user creation works,
   profile row auto-created with API key.
3. **Mobile dashboard crash** (= Marco's actual symptom, "This page couldn't load —
   Reload"): OverviewTab unmounts → MobileOverviewTab mounts on phones; both
   useTrades instances hit singleton client channel 'trades-realtime' → second .on()
   after subscribe() throws. Fix: unique channel name per hook instance.
4. **Cross-user data leak**: GET /api/mt5-sync — service-role client, NO auth, NO
   user filter → returned newest snapshot across ALL users (Topbar showed Marco's
   balance to the test user). Fixed: getAuthUserId + eq(user_id) + maybeSingle.
   Also scoped mt5-debug trade queries; MobileOverviewTab greeted everyone as
   hardcoded "Marco" → profile.display_name.

Also: login page now displays ?error= from /auth/callback + unlocks body scroll
(was overflow:hidden from root layout → small phones couldn't reach submit).

Test account: fable-mobiletest@velquor.app (free tier, for mobile e2e tests).
Playwright WebKit installed; e2e script /tmp/vq-login-e2e.mjs pattern in this log.
Known console noise on fresh accounts: two 406s (.single() on empty tables) +
one 500 (mt5 quick-sync without creds) — non-fatal, candidates for a cleanup pass.

**Open items ONLY MARCO can resolve** (flagged in session report):
- Impressum: if Gewerbe registered → must add Gewerbebezeichnung + authority (§ 5 ECG);
  if VAT-registered → UID must be listed. Currently minimal-natural-person version.
- Pricing footer says "VAT may apply" — before Stripe: B2C prices must be FINAL incl.
  VAT (or state Kleinunternehmer no-VAT). Decide with tax advisor.
- DPAs with Vercel/Supabase/Hetzner/Anthropic (standard in their terms — accept/archive).

---
# 2026-07-17 (4) — Live ticker + landing middle/bottom premium pass (00c1d25, 5fc4a8d)

**Live ticker**: TickerStrip now fetches /api/market/strip?set=landing (new
LANDING_TICKERS set in the route: GC=F→XAUUSD, ^NDX→NAS100, FX =X pairs, ^DJI,
^GSPC, ^GDAXI, SI=F, BTC-USD; same 5-min module cache, per-set cache key).
Hardcoded row stays as instant render + fallback (kept if <6 symbols return).
Real gold was ~4,000 vs fake 2,384 — Marco was right that it looked off.

**Design pass** (verified section-by-section via Playwright WebKit screenshots
against local dev — script pattern: scrollIntoView per <section>, force .vq-in):
- Features: per-cell accent hairline + glowing mono numbers
- HowItWorks: gradient rail connecting 4 numbered chip rings
- Trust: emoji → green line-icon tiles (ICONS array by index, locale-safe)
- VelquorSection: chat mock in hero gradient border + ambient glow
- PropFirm: challenge card green border + glow
- FAQ: eyebrow → shared SectionEyebrow pill (was the last plain-text one)
- Pricing: badge → hero gradient (layout untouched — Marco hand-tuned it)

Note: headless WebKit shows a white square artifact top-left when scrolled
(backdrop-filter nav compositing) — NOT a real bug, renders fine live.

---
# 2026-07-17 (5) — Hero animation rAF engine + smart logo (aba8592)

**Logo rule** (Marco): logged out → landing, logged in → dashboard. Landing Nav
already did this; dashboard Topbar → /dashboard ✓; /pricing logo FIXED (was
always '/'). Login-page centre logo is not a link (Back-to-home covers it).

**AnimatedDashboard rewritten** (components/landing/AnimatedDashboard.tsx) as a
single-rAF-clock engine — key design decisions for future edits:
- Cursor = Catmull-Rom spline per scene: [current pos, 6 reading waypoints
  (READ_PATHS fractions), next tab pos]; eased easeInOutSine over SCENE_MS
  (3600ms) + micro sin drift → never stops (cursor rule!). Click at u=0.955,
  scene switch at u=1; next spline starts at the tab → continuous by construction.
- All 60fps writes via refs (cursor transform, progress scaleX, eq dashoffset,
  dot getPointAtLength, live candle attrs, [data-count-to] textContent);
  React re-renders ONLY on step change.
- Equity curve: EQUITY array → smoothPath() Catmull-Rom→bezier; draws via
  dashoffset over 1.3s; head dot keeps 'breathing' after draw.
- [data-hot] elements glow by cursor proximity (measured on scene entry).
- [data-count-to/-dec/-pre/-suf] spans count up with easeOutExpo over 1.1s.
- Candle mapping: y = 64-((v-30)/58)*58-3 (band 30-88 → full height, keep both
  render + live-tick in sync). Candles enter via .vq-candle scaleY overshoot.
- Ticker values synced to real July-2026 levels; tape marquees (vq-tape 26s).
Verified frame-by-frame via /tmp/vq-anim-test.mjs (finds mock by
background rgb(9,13,19) + [data-tab], clips, screenshots at time marks).

---
# 2026-07-17 (6) — Hero animation v2: 1:1 dashboard replica

AnimatedDashboard now replicates the real logged-in dashboard: TradingView-style
tape with logo chips (TAPE) + SPY/QQQ/BTC/VIX strip (STRIP) + real 9-tab bar
(SCENE_TABS = [0,1,3,7,8] → Overview/Trading/Journal/Copy/Ask VELQUOR), greeting
header w/ London-session clock running real time, win-rate ring, 30-day Daily
P&L bars, TV-style Gold chart w/ volume footer, journal calendar (today = the
real 17th), trade copier master→slaves map, chat with typewriter answer.

Cursor spline upgraded to PER-SEGMENT velocity curves (eases out of / into each
waypoint, durations weighted by segment length, linear blend keeps velocity > 0
— cursor rule holds). No emojis — SVG glyphs only.

Resumed-after-limit polish pass: filled dead bottom band in Journal (Recent
Entries list), Copy (5-row signal log), Ask VELQUOR (input bar w/ gold send
glyph); calendar extended to 17 w/ wins 13/15/16, loss 14 — consistent with
journalEntries rows. Verified frame-by-frame via /tmp/vq-anim-test.mjs
(12 marks, 0 page errors, loop wraps clean at ~19s).

---
# 2026-07-17 (7) — Hero animation v3: TRUE 1:1 replica (rebuilt from real screenshots)

Marco called out that v2 was invented from memory, not copied ("the gold chart
does not even look like a chart"). Rebuild process — KEEP for future 1:1 work:
1. Seeded fable-mobiletest account (ultra tier) with 46 trades / 62 snapshots /
   journal+habits+tasks / copy group via service-role REST (/tmp/vq-seed.mjs).
2. Logged in via Playwright, screenshotted all 5 real tabs at 1440px
   (/tmp/vq-capture-sections.mjs — scrolls <main>, dismisses welcome overlay,
   accepts cookies so TradingView widgets load).
3. Rebuilt each AnimatedDashboard scene against those screenshots.

AnimatedDashboard v3: icon tab bar + gear, boxed SPY/QQQ/BTC/VIX strip w/ live
↻ clock, hero card (habit dots, 🔥 streak chips, session-clock bar, exact
metric cards), equity curve w/ €21,106→€25,269 axes, Daily P&L bars panel,
TradingView chart replica (88 seeded-PRNG hourly candles in TV colors
#26A69A/#EF5350, dotted grid, price axis, live price tag + dotted line +
OHLC legend ticking, volume histogram, date axis w/ bold Monday, left→right
clip reveal), Trading metric cards w/ D-W-M-Q-Y pills, Journal stats/calendar/
mood-correlation/insight, Copy group card w/ master+slaves+EA-config block,
Ask VELQUOR banner+quick-questions+input (types the question, then swaps to
the answer typewriter) + What-VELQUOR-Knows rail. Per-scene durations
[4.2,4.8,4.2,4.0,5.6]s; splineAt NaN-guarded (was a rare rAF crash).

**3 REAL prod bugs found via the replica work, all fixed:**
- /api/account/snapshots queried recorded_at (column is snapshot_at) →
  Overview Equity Curve was EMPTY in prod for everyone since launch.
- DailyPnLChart bars: background `${'var(--gr2)'}99` = invalid CSS → bars
  invisible until hover. Now solid color + opacity.
- OverviewTab greeting hardcoded ", Marco" for every user → now
  profile.display_name like mobile (context/UserProfileContext).

White band in screenshots over mock = nav backdrop-filter compositing artifact
(proven: disappears with backdrop-filter:none) — headless-only, NOT a bug.
64 tests pass, build green. Chrome frame-by-frame: 0 page errors.

---
# 2026-07-17 (8) — Copy Trading actually connectable (4f1d21d) + neutral hero greeting

Marco: "you cannot put in your account, login, the password... the whole copy
trading tab needs full-on work." Root cause: AddAccountModal only recorded an
account NUMBER — nothing ever connected unless the user ran the EA themselves.

**New flow — two connection methods per account (master or slave):**
- VELQUOR Cloud (default): broker-server picker (BROKERS quick buttons +
  free text), login, password → we provision a dedicated cloud terminal per
  copy account running the EA in COPY_MASTER/COPY_SLAVE with the group's lot
  settings. Master hint: investor (read-only) pw is enough; slave needs the
  trading pw. If the login equals the user's connected main terminal →
  password-free: main terminal re-provisioned in copy mode via stored creds.
- My own MetaTrader: old flow (number only) + EA CONFIGURATION block.
GroupCard rows: CLOUD badge + Host in Cloud / Unhost buttons.

**Plumbing:**
- provisioner.js: multi-slot containers velquor-term-<uid>--<slot> (slot =
  'c'+accountId[0:8]), copy env passthrough, reuse_stored (re-start with
  stored creds; copy config persists in the .cred file), GET /slots.
- entrypoint.sh: VQ_COPY_MODE/GROUP/LOT_MODE/LOT_FIXED/LOT_MULT/MAX_LOT env →
  InpCopy* preset inputs (enum ints: OFF=0 MASTER=1 SLAVE=2; PROP=0 FIXED=1).
- Site: POST/DELETE /api/copy/accounts/[id]/connect (tier-gated vs
  plan.cloudTerminals via provisioner slot count), GET /api/copy/cloud-status
  (hosted ids derived from slots — NO new DB column). copy_accounts.status
  check constraint allows only pending/active/paused/error ('connecting' 23514).

**Deploy gotcha that bit us:** server /opt/velquor-term/build/Dockerfile was a
STALE variant without `COPY sidecar.sh` + jq — my image rebuild silently
dropped the sidecar (= no file-bridge forwarding, sync dead). Fixed via hotfix
layer (jq + sidecar) + canonical Dockerfile synced to server; stale
Dockerfile.copy/.side/.v2 deleted. Server build dir now mirrors cloudterm/.

**E2E verified (master side):** Marco's real terminal re-provisioned as
COPY_MASTER for his group via reuse_stored — preset shows InpCopyMode=1 +
group id + 0.1×/0.61 lots; EA wrote vq_copyconfig.json; sync restored.
UI verified via Playwright (test acct): modal, Host in Cloud buttons, 400s on
missing pw / bad server, cloud-status. NOT yet tested: a real SLAVE terminal
(needs a second MT5 account's credentials — only Marco has those).

Update (same session, later): Marco added a real SLAVE (#5143547) through the
new Add & Connect modal in prod — its cloud terminal provisioned itself, and
after the canonical-image restart BOTH rows heartbeat active via the /sync
X-Mt5-Login path (master #5121585 + slave, last_seen 300ms apart; snapshots
fresh, balance 2246.24). Infrastructure fully live with 2 real accounts.
Remaining: first actual mirrored trade (master opens → slave executes) — just
needs Marco to place one.

---
# 2026-07-17 (9) — Dashboard design pass: Lego-grid Overview, Journal + Copy polish

Marco's brief: no blank spaces, rows must lock together "like Lego", tape too
loud (removed — it stays on the landing page only), equity curve needs more
info, Markets panel made no sense.

- **Ticker tape removed** from DashboardShell (TradingView embed gone; the
  small SPY/QQQ/BTC/VIX MarketStrip inside Overview stays).
- **Overview restructured into equal-height rows** (items-stretch + h-full
  Panels): [Equity 3/5 | DailyPnL 2/5] → [Calendar 2/3 | Streaks+Markets] →
  [Intelligence 2/3 | Today's Focus]. Page 2171→1843px, zero dead zones. The
  old layout had a ~500px blank hole left of the Markets widget.
- **Markets panel**: TradingView MarketOverview iframe (rendered empty)
  replaced by MarketsCard — our /api/market/strip?set=landing quotes
  (XAUUSD/NAS100/FX/indices), live dots, 5-min refresh.
- **EquityCurveChart** showStats: current balance, period P&L (+€/%), max
  drawdown (peak-to-trough), 30/60/90D period pills (self-fetching).
- **DailyPnLChart** showStats: period total + green/red day counts.
- **Journal**: raw-HTML bug FIXED (insight box printed literal
  `<strong style=...>` — template literal inside JSX; now real JSX). Filler
  "Mood → P&L: See below" card → "Best Mood" (name + avg €/day).
- **Copy tab**: EA CONFIGURATION collapsed by default ("for accounts on your
  own MetaTrader"), WebRequest reminder reworded + demoted (cloud users need
  no setup).
- Macro/Discipline/Tasks/Trading reviewed — already structurally sound, left
  alone. Portfolio untouched (Marco approves of it as-is).
64 tests, build green; verified via Playwright screenshots per tab.

---
# 2026-07-18 — First copy-trade attempt failed: three root causes found + fixed

Marco opened BTCUSD 0.05 + 0.01 on the master — nothing reached the slave.
Full trace (bridge metrics → copy_signals/copy_log → container logs → EA log):

**Bug 1 (EA, fatal): `OnTimerMillisecond()` is not an MQL5 event.** MQL5 fires
only `OnTimer()`, and `EventSetMillisecondTimer()` REPLACES `EventSetTimer()`
(one timer slot). Net effect on slaves: PostSync ran every 2s (log-confirmed)
and `PollCopySignals()` was dead code — the slave never polled, ever.
Fix (EA 2.11): slaves set only the millisecond timer; OnTimer polls copy
signals every tick and throttles PostSync to InpIntervalSec via GetTickCount64.

**Bug 2 (bridge): /copy rate limit 120 req/15min keyed per API key** — shared
by ALL of a user's terminals. Slave polling (~every 3.4s ≈ 265/window) filled
the bucket in ~7 min, then the MASTER's /copy/signal posts got 429 — the 0.01
open + both closes sat as vq_cout_* files retrying every 3s (which kept the
bucket full — self-DoS). /sync (300/window) was also ~50% throttled with two
terminals; nobody noticed because last_seen stayed fresh enough.
Fix: bridge_settings rate_limit_sync 300→3000, rate_limit_copy 120→6000
(live, no restart) + server.js limiter now keys on api_key:mt5_login so
terminals get separate buckets. Deployed + pm2 restart.

**Bug 3 (sidecar): poll_copy_inbox swallowed non-200s** — jq silently failed
on the 429 text body, so logs showed nothing. Fix: capture http code, log
state CHANGES only (`copy-poll http=429` once, `recovered` once).

**1:1 lot sizing (Marco's ask: "the way all firms do it"):**
- Copy Group 1: lot_multiplier 0.1→1.0, max_lot 0.61→100 (0.1× would have
  turned 0.05 into 0.005 lots — below broker min — even with delivery fixed).
  Applies live: bridge sends group config with every signal, EA obeys server.
- CreateGroupModal: sizing picker is now [1:1 Mirror | Multiplier | Fixed],
  mirror default (= proportional ×1.0, cap 100, no inputs shown).

**Cleanup:** 4 stale copy_log rows (master trades already closed) marked
'skipped' before the fixed slave came online, so it won't execute dead opens.
Image rebuilt (EA 2.11 compile-verified in Docker build), both terminals
re-provisioned via provisioner reuse_stored (needs Bearer BRIDGE_ADMIN_TOKEN).

**Slave account #5143547 now has €10** (Marco funded it) — enough to prove
signal delivery but a 1:1 BTC trade will likely fail on margin; the EA acks
'failed' with the retcode, which is itself a valid end-to-end test.

---
# 2026-07-18 (2) — COPY TRADING PROVEN WITH REAL EXECUTION (EA 2.12)

Marco's second real trade (12:03 BTCUSD 0.01 buy) DELIVERED in 7s but slave
OrderSend failed retcode=10021 "no quotes": the slave terminal had never
charted BTCUSD → no Market Watch subscription → MT5 refuses the order.
EA 2.12: EnsureSymbolReady() — SymbolSelect + wait ≤3s for first tick before
executing; clean ack message on timeout. (2800e1b)

Synthetic E2E with REAL money on slave #5143547 (€10):
- EURUSD test → retcode 10018 market closed (it's Saturday — that's why Marco
  trades BTC today; forex tests only work weekdays)
- BTCUSD 0.01 open signal → slave EXECUTED ticket 51187043 at 1:1 lots
- close signal → slave closed same ticket. Balance 10.00→9.64 (spread from
  the test round-trip + a manual sell Marco made on the slave directly).
Full chain proven: bridge → copy_log → sidecar poll → inbox → EA execute →
ack 'executed' back in copy_log. Latency signal→fill ~7-10s.

Remaining for a real mirror: Marco opens a master trade (BTC on weekends);
0.01 BTC fits the €10 slave margin at Blueberry, bigger sizes need funding.

---
# 2026-07-18 (3) — Multi-terminal data blending fixed (master/slave separation)

Marco's question "why don't copied trades show in open trades?" surfaced a
real bug: BOTH terminals sync under one API key with NO account discrimination
— account_snapshots alternated master €2234 / slave €9.49 every ~5s (equity
curve + balance display corrupted since the slave went live), and every
mirrored trade landed TWICE in trades (journal/stats double-count).

Fix at the single choke point (bridge /sync) instead of 20 reader files:
- account_snapshots + trades now have mt5_login BIGINT (added via Supabase
  Management API, sbp_ token recovered from session history)
- bridge tags every snapshot/trade row with X-Mt5-Login
- bridge SKIPS snapshot+trades+profile writes entirely for copy-slave logins
  (isSlaveLogin, 60s cache) — slaves sync only as heartbeat + copy plumbing;
  the journal is master-only by design. Slave history lives in copy_log.
- Backfill: existing rows tagged (slave tickets from the slave terminal's own
  vq_sync closed list: 51187039/43/56), then all slave rows DELETED
  (3 trades + 13,446 snapshots).
Verified live: snapshots stream master-only + tagged, slave heartbeat active.

Also confirmed: Marco's 12:11 real mirror worked — master 51187055 → slave
51187056, 1:1 lots, both sides opened and closed. COPY TRADING IS LIVE.

Marco UX answers: slave's open trade visible only when logged into the slave
account in MT5 (normal); dashboard open-trades view is master-only (by
design now). Future: show slave live state in Copy tab from copy_log/acks.

---
# 2026-07-18 (4) — Copy latency 5-6s → ~1s + account switcher (62695ec + nginx)

**Marco's 3 asks:** slave leaking into topbar (was the snapshot blending,
fixed earlier same day), account switcher on the MT5 pill, and copy latency.

**Latency rework — polling stack replaced with push:**
- bridge GET /copy/poll?wait=25 long-polls: armSlaveWaiter BEFORE the pending
  query (race-free), /copy/signal wakes waiters in-process (slaveWaiters Map).
- sidecar: fast 0.3s local loop (sync + cout forwarding) + backgrounded
  dedicated long-poll loop (curl --max-time 30, 1s pause after copy-in so the
  ack lands before re-poll, 2s backoff on errors, state-change-only logging).
- EA 2.14: InpCopyPollMs 250ms inbox checks (desktop WebRequest slaves poll
  at the same rate — fine with per-login rate buckets).
- ⚠️ nginx proxy_read_timeout was 10s → 504'd every idle long-poll. Now 40s
  (server + bridge/nginx.conf). Idle poll verified: 200 after 25.4s.
- ⚠️ DUPLICATE EXECUTION found in testing: long-poll redelivers the pending
  row before the ack arrives → slave opened the same master trade TWICE
  (tickets 51187119+120). EA 2.14 idempotency: FindSlaveTicket (mapping +
  VQ:<ticket> comment scan) before open; duplicate delivery acks 'executed'
  with the existing ticket. Orphan closed via re-sent close signal.
**Measured (single clock): open ack 1.17s, close ack 1.24s** — fill is
earlier still (ack return path ≈0.3-0.6s). Was 5-6s.

**Account switcher (Topbar):** AccountMenu.tsx replaces the bare MT5 pill —
dropdown lists primary + copy accounts (live/stale/offline dots, PRIMARY/
MASTER/COPY badges, balance/equity, group/broker, last-seen), click to switch
what the pill shows (localStorage vq-account-view), actions: Sync now, MT5
Connection (modal), Copy Trading → (vq-switch-tab CustomEvent → DashboardShell
listener). GET /api/accounts/overview merges latest master snapshot +
copy_accounts (which now carry balance/equity/open_trades_count, heartbeated
by the bridge on every slave sync). Journal stays master-only.

---
# 2026-07-18 (5) — Copy hot path: DB off the critical path (~0.3-0.55s delivery)

Marco: "make it a highway." Rework (8af96ce + follow-up):
- /copy/signal → in-memory handoff to waiting long-polls (payload in the exact
  /copy/poll shape, copy_log ids pre-generated via crypto.randomUUID); the
  copy_signals/copy_log inserts run AFTER res.json as audit trail. Hot-path
  caches: master acc + slave acc 60s, group config + slave list 10s.
- /copy/poll: pushed payloads returned with ZERO db reads; slave-acc lookup
  cached; heartbeat update fire-and-forget; timed-out polls keep the pending
  catch-up query (correctness backstop for signals arriving while the inbox
  was occupied / no waiter armed).
- /copy/ack: updates only status='pending' rows — late acks from redelivered
  signals can never overwrite the recorded result. Acks racing their own
  copy_log insert 403 → sidecar retries → self-heals. Sidecar drops cout
  envelopes stuck >120s (no infinite retry). Loops: 0.1s local, 0.5s
  post-delivery pause. EA 2.15: 100ms inbox checks.

**Measured**: delivery (signal POST → slave inbox) 551ms typical, 100-330ms
when a waiter is armed. Remaining ack lag = broker fill time (weekend BTC
1-2s; NOT our pipeline). Master event → slave order sent ≈ 0.3-0.7s total.

**BURST TEST (3 rapid opens + 3 closes) — copy_log flawless**: #11 open→
51187210 closed✓, #12 open→51187211 closed✓, #13 open FAILED 10019 (margin,
correct — €8 only fits two 0.01 BTC) → its close SKIPPED correctly. No
duplicates, no orphans, slave flat after. The redelivery+idempotency+
pending-only-ack triangle held under fire.

---
# 2026-07-18 (6) — Terminal density optimization + TOMORROW.md (b689a33)

Correction first: the earlier "93% full" reading was contaminated by my own
docker builds/burst tests on the same box. Clean Saturday baseline was
~0.10-0.15 cpu / ~300MB per terminal.

Optimization (entrypoint + EA 2.16 + provisioner):
- Chart profile wiped at boot → 1 chart instead of 6 rendering headlessly
- MaxBars=10000, Xvfb 1024x768→800x600
- EA 2.16 TrimMarketWatch(): cloud-only (InpFileBridge gate — desktop users'
  Market Watch untouched), keeps chart symbol + symbols with positions/orders;
  hid 8 → 1 symbol remains. EnsureSymbolReady re-subscribes on demand —
  VERIFIED: BTCUSD copy signal executed+closed cleanly post-trim (51188593).
- Provisioner caps 700m/0.6cpu → 600m/0.5cpu

After: ~7.6-10% cpu, ~275MB per terminal (cpu -25%, ram -8% vs baseline).
Capacity on the €5 CX23: Marco's 2 + comfortably ~4-6 guests (RAM-bound);
re-measure on a WEEKDAY (Saturday = no forex ticks) before committing to
TERM_CAPACITY bump. Unlimited EA-path users regardless.

TOMORROW.md written: weekday validation, Pro-tier cloud decision, infra
signups (Supabase/Vercel/Stripe/Anthropic key), snapshot pruning job, EA
Connect Wizard, Copy tab live positions, security sweep (revoke sbp_ token).

---
# 2026-07-18 (7) — Marco's tab overhaul list (Overview/Analyst/Macro/Mobile)

**Overview (7854cca):** WinRateCard w/ period select (This Month/Q1-Q4/Year/
All — computed from close_time ranges); EquityCurveChart periods 1W/1M/3M/1Y
(the "bug" Marco saw was the master/slave snapshot blending, already fixed at
the bridge); chart row heights 150→130; MarketStrip ticker + MarketsCard
REMOVED (files deleted); Today's Focus rebuilt (overview/TodaysFocus.tsx):
red-folder countdowns from /api/macro + weekday loss pattern + best-hour edge
window + worstCombo from computeBreakdowns — replaces habits/tasks/journal
filler (those live in their own tabs); VELQUOR Intelligence → full-width
"Edge Report" (overview/EdgeReport.tsx): insights + Fact grid (best/worst
instrument, session, setup, combos).

**Analyst (was Ask VELQUOR / VELQUOR AI):** VelquorTab rewritten as
ChatGPT-style full-screen chat — centered 760px column, autosizing textarea
composer, empty state = LogoMark + explainer + 4 capability cards, first-run
staggered intro animation (localStorage vq-analyst-intro-seen), zero emojis,
example-questions boxes gone. Renamed "Analyst" in TabBar/Sidebar/MobileNav/
pricing/landing.

**Macro:** full Bloomberg-style rebuild — terminal header (red square,
VIENNA/LONDON/NEW YORK ticking clocks), NEXT RELEASE hero with live 1s
countdown, dense week table (TIME|■|CCY|EVENT|ACT/FCT/PRV in tabular mono,
beat/miss coloring, past rows dimmed, <1h rows tinted red). Briefing/news/
bias cards removed per Marco ("only red folder news"). Gotcha: FF feed's
`time` string is empty — derive from `date` (eventTime()).

**Mobile:** TradeLogTable minWidth:480+overflowX removed → true mobile cards
(hidden sm:flex desktop row + flex sm:hidden card, tap = annotate); 📷 →
IMG chip. Jank fix in globals.css: @media ≤768px kills ambient blob
animations/blur + backdrop-filter (main repaint cost on phones) +
prefers-reduced-motion. Playwright audit: zero horizontal-overflow elements
at 390px. Screenshots verified desktop+mobile via webkit (test acct password
reset via GoTrue admin; welcome modal dismiss = click LET'S WIN).

---
# 2026-07-19 — Finishing the cut-off session: News tab, dictation, honest stats

Yesterday's session hit the usage limit mid-work; this session completed and
verified all of it.

**Break-even unification (BE_THRESHOLD everywhere):** every remaining raw
`net_profit > 0` win check now uses BE_THRESHOLD (±€10) — velquor/chat
context builder, lib/intelligence.ts insights, trading heatmap + tag stats,
TradingTab balance-ops filter. Win rates no longer count break-evens as wins
anywhere.

**Equity curve is deposit-aware:** /api/account/snapshots also sums
symbol='BALANCE' trades in the period and returns netDeposits;
EquityCurveChart shows "+€X (+Y%) trading" (delta minus funding) plus a
muted "€Z deposited/withdrawn" note. A deposit is not a win.

**Macro → News rename (complete sweep):** TabBar/Sidebar/MobileNav,
MacroTab header "MARKET NEWS · RED FOLDERS ONLY", landing Nav +
BeforeAfterMockup + AnimatedDashboard hero (also Ask VELQUOR → Analyst
there, matching prod), FeedCard chip, pricing feature rows ("Red-folder
news & economic calendar"), feature cards in all 4 locales (en/de/zh/es),
and both AI system prompts ("check the News tab").

**Event briefs (lib/news/eventBriefs.ts):** regex-matched one-line
explainers per red-folder release — what the number is + what a hot/miss
print does to USD/gold/Nasdaq. Rendered under every calendar row and in
the NEXT RELEASE hero. Verified via mocked /api/macro (live feed had 0
USD red folders on Sunday — correct empty state, not a bug).

**Analyst prompt chips:** 4 gold pills under the empty state (Full trend
analysis / Weakness audit / Psychology check / Risk review) — click drops
the full prompt into the composer for editing.

**Edge Report + Today's Focus:** portfolio-category insights filtered out
(trading edge only, 4 shown); new computeStats facts — profit factor with
health verdict, avg win vs avg loss, expectancy, longest W/L streaks (up
to 10 facts). TodaysFocus says "Sundays cost you money", not "Suns".

**Voice dictation (Journal):** components/ui/VoiceDictationButton.tsx
(MediaRecorder, webm/mp4 fallback, elapsed timer, pulse dot) →
POST /api/journal/transcribe → Groq whisper-large-v3-turbo (auto language
for EN/DE monologues, 25MB cap, auth + 503 without GROQ_API_KEY). Appends
transcript to the entry body. E2E PROVEN: synthesized spoken note via
macOS `say` → POST through logged-in session → perfect transcript back.

**Verification:** tsc clean, 64/64 tests, prod build green. Headless
screenshots (recipe: chromium + Chrome executablePath, keys map to
VISIBLE tab order — News=5, Analyst=9, Journal=4; modal opens via
calendar day click): News briefs, Analyst chips, Journal Dictate button,
Overview "+8.2% trading" label + Edge Report facts all confirmed. Known
noise, not ours: /api/mt5-sync 500s = legacy MetaAPI polling (delete per
TOMORROW.md #12), hydration warning on /login pre-exists.

---
# 2026-07-19 (2) — Terminology migration: master/slave → leader/follower (3db5801)

Marco: remove master/slave wording from the whole code base. New terms:
**Leader / Follower** (industry standard). 438 case-mapped renames across
site, bridge, cloudterm, EA, schema files, TOMORROW.md — zero leftovers
(checked master password false-positives first; none existed).

**DB (supabase-leader-follower.sql, run via Management API):**
copy_signals.master_account_id/master_ticket → leader_*, copy_log.slave_* →
follower_account_id/follower_ticket/follower_lots, role values migrated
under dropped+recreated check constraint, idx_copy_log_follower_pending
renamed, dev_todos titles cleaned, nickname 'slave acc' → 'Follower acc'.
Fresh sbp_ token from Marco lives in ~/.velquor-supabase-token (0600,
outside repo) — revokable, reusable for future DDL.

**Wire protocol renamed in lockstep** (breaking, coordinated cutover on a
Sunday): poll payloads now leader_ticket/leader_lots, acks
follower_ticket/follower_lots, EA copyconfig mode LEADER/FOLLOWER (sidecar
gate matches), provisioner copy.mode 'leader'/'follower'. EA → 2.17.

**Deploy order (DB first, then everything the same hour):** migration →
bridge deploy.sh → git push (Vercel) → scp cloudterm files → image rebuild
(layer cache, ~1min) → provisioner.js copied to /opt/velquor-term + pm2
restart (must happen BEFORE re-provision calls — old provisioner maps
'leader' to mode 0) → both terminals re-provisioned with reuse_stored +
EXPLICIT copy config (the .cred files are AES-GCM blobs holding the old
role strings — cannot sed; explicit copy{} overrides and re-persists) →
EA 2.17 compiled on Marco's Mac via bundled wine64 (NOT wine — only
wine64 exists in the MT5.app wrapper; MetaEditor64.exe /portable /compile,
exit code 1 is normal, log says 0 errors).

**E2E PROVEN post-rename:** both accounts heartbeat with new roles;
synthetic BTCUSD 0.01 open → follower filled ticket 51191112 in ~1.2s
(duplicate delivery correctly ignored by idempotency guard) → close
executed same ticket → follower flat (open_trades_count 0). Copy tab in
prod shows LEADER ACCOUNT / FOLLOWER ACCOUNTS. Landing bundle serves
Follower strings.

**Gotcha catalogued:** the test account fable-mobiletest owns 'Main Group'
(leader 114892, followers 221040 + FTMO 58112) — SEEDED data, static
last_seen 2026-07-17T12:00. Never fire test signals at groups without
checking user_id ownership first; a stray signal into a real FTMO
challenge would be catastrophic. Marco's real pair = Copy Group 1
(5121585 → 5143547).

---
# 2026-07-19 (3) — Edge Report truth fix + trades-only filter + mobile pass

**The "Difficult month at 23.1%" bug (Marco: "I'm not in a red month"):**
lib/intelligence.ts computed win rate as wins/ALL trades — Marco's July is
3 wins, 0 losses, 10 break-evens, +€109.51, and the formula called that
23.1% and "difficult". New decidedStats() helper: win rate = wins/(wins+
losses), break-evens excluded BOTH sides → his July is 100%. Monthly
insight now judges P&L AND decided win rate (a green month is never
"difficult"); removed hardcoded "Gold is your stronger instrument" and
"60% target" fossils. ALL win-rate denominators in intelligence.ts
(instruments, sessions, day-of-week, emotions, plan, setups) now decided-
only, messages rewritten in plain English ("Gold is working much better
for you than Nasdaq: 54% vs 32% of decided trades won"). Regression tests
in tests/intelligence.test.ts (68 total pass).

**Portfolio purge:** VelquorInsight gained `source: trades|portfolio|
journal|tasks`; every push tagged. Edge Report (desktop + mobile) filters
source==='trades' — the gold-leverage/tech-concentration warnings
(category 'warning' but holdings-derived) can never leak in again. Fact
labels de-jargoned: Expectancy → "Avg profit per trade", setup sub "avg
€X per trade", session keys prettified (london → London).

**Mobile (390px audit, all 9 tabs, seg screenshots via inner-container
scroll — window.scrollTo does NOTHING, DashboardShell scrolls inside):**
- MobileOverviewTab: generic "VELQUOR Insights" section → real Edge
  Report (trades-filtered insights + shared buildEdgeFacts() 2-col grid;
  fact builder extracted from overview/EdgeReport.tsx for reuse)
- PeriodMetricCard D/W/M/Q/Y pills clipped on narrow cards → header
  flex-wrap (pills drop below title)
- Trading Live Chart: 480px fixed → .tv-chart-wrap class, 340px ≤768px
  (the consent placeholder alone was ~1250px of dead space on phones)
- Portfolio holdings header ALLOCATION/CURRENT overlapped → ellipsis +
  scroll min-width 480→560
- Copy "Host in Cloud" button wrapped 3 lines → nowrap
- Clean already: Journal, Discipline (Trader DNA), News, Tasks, Analyst,
  Copy — zero horizontal overflow anywhere (scrollW 390 on all tabs)
- AdvancedChart height prop widened to number|string
E2e gotchas catalogued: greeting modal key vq_greeting_date (toDateString
format), suppress via addInitScript with vq-cookie-consent +
vq-analyst-intro-seen; Playwright text= locators flaky on the bottom nav
→ jsClick via evaluate.

---
# 2026-07-19 (4) — Mobile Overview: real charts instead of 7-week bars

Marco asked whether mobile has a separate Overview (yes — MobileOverviewTab
swaps in <768px; other tabs are shared responsive) and wanted the "Last 7
Weeks" mini bars replaced with the desktop charts. Done: WeeklyMiniChart
component deleted, replaced with the SAME components desktop uses —
EquityCurveChart (1W/1M/3M/1Y selector, deposit-aware "+€X trading" split,
Max DD) and DailyPnLChart (30 days, green/red day count, touch tooltip).
Both are viewBox SVGs → fully fluid at 390px, verified with screenshots.
Mobile Overview now: header → stat cards → win ring → Equity Curve →
Daily P&L → Daily Risk → Today's Focus → Edge Report.

---
# 2026-07-19 (5) — URGENT: trade annotation modal invisible (client demo)

Marco: pen/edit on Trading tab trades dead on PC + mobile. Root cause was
NOT the modal or the API — `.vq-tab-in` (tab entrance animation, wraps
every tab in DashboardShell) had `animation-fill-mode: both`, which
retains the final keyframe's `transform: translateY(0)` forever. Retained
transform = the tab wrapper becomes the containing block for ALL
position:fixed descendants → TradeAnnotationModal, its overlay, journal
EntryModal, screenshot lightbox all centered inside the 5552px tab
content instead of the viewport (measured: modal top at 1606px in a
900px viewport). Overlay dimmed only the content area (topbar stayed
bright) — that asymmetry was the tell.

Fix: fill-mode `backwards` (globals.css) — transform drops when the
0.22s entrance ends; identical visuals, no retained containing block.
NEVER change it back to both/forwards; comment in CSS explains.

Verified: Playwright (chrome channel) desktop 1440px pen-click + iPhone 13
card-tap, local AND production after deploy 9e55ef2 — modal centered,
rationale saves (PATCH 200, row checked in DB via service role), test
rows cleaned after. Note: Turbopack dev served stale CSS through TWO
restarts — needed `rm -rf .next` before the change showed up.

E2E infra this session: /tmp/vq-e2e/*.mjs (playwright-core + system
Chrome, no browser download). Cookie consent localStorage value is
'all'/'essential' — NOT 'accepted' (wrong value = banner intercepts
clicks). Test account fable-mobiletest has a known password now, stored
in Claude's local memory, not here (repo is public).
