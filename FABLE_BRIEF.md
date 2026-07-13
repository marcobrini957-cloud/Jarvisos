# VELQUOR — Full Optimization Run (Fable 5)

Owner: Marco. Blanket permission granted: build, modify, delete, refactor without asking for confirmation. Verify with `npm run build` after each phase. Commit after each completed phase with a clear message.

## Context
- Next.js 16.2.7 + React 19 + Tailwind 4 + Supabase trading dashboard, ~24.5K lines
- Copy trading infra built (EA v2, bridge in `/bridge`, API routes); Hetzner bridge deploy still pending
- No tests exist anywhere in the repo
- Known problem files: `components/dashboard/tabs/TradingTab.tsx` (2,894 lines, 35 useState/useEffect), `app/page.tsx` (2,314 lines, fully client-side), `PortfolioTab.tsx` (1,320), `JournalTab.tsx` (928), `CopyTradingTab.tsx` (919), `OverviewTab.tsx` (861), `DisciplineTab.tsx` (683)

## Phase 1 — Component refactor (maintainability)
Split every dashboard tab >600 lines into small focused components + custom hooks:
- Extract state clusters into hooks (e.g. `useTradeFilters`, `useTradeForm`)
- Extract render sections into components under `components/dashboard/tabs/<tab>/`
- Behavior must stay pixel- and logic-identical. Build after each tab.

## Phase 2 — Landing page performance
- `app/page.tsx` is 2,314 lines with `'use client'` at the top. Split into server components for all static/marketing sections; isolate interactive parts (animations, counters) into small client islands.
- Same for `app/pricing` and `app/login` where possible.
- Add `next.config.ts` tuning: image optimization, and dynamic imports for heavy deps (`@react-pdf/renderer` must NOT be in any initial bundle — lazy-load it).

## Phase 3 — Tests for money-critical paths
- Set up Vitest + React Testing Library
- Priority order: copy-trade logic (`app/api/copy`, bridge routes), trade calculations (P&L, lot sizing in `lib/` and hooks), MT5 sync parsing (`app/api/mt5-sync`), `usePortfolio` / `useTrades` hooks
- Target: every function that touches money or trade data has tests. UI snapshot tests are NOT the goal.

## Phase 4 — Design upgrade to TradingView standard
Goal: visual and structural parity with top-tier trading platforms (tradingview.com is the reference).
- Browse tradingview.com's public pages (home, pricing, product pages) and analyze: typography scale, spacing system, color usage, data-density patterns, navigation structure, how they present features/pricing. DO NOT copy code or assets — analyze the design language and implement our own version in our stack.
- Apply findings across: landing page, pricing, dashboard shell, all tabs. Keep VELQUOR's brand identity but raise the polish to that standard.
- Integrate TradingView's official free embeddable widgets where they add real value (advanced chart widget in TradingTab, ticker tape in dashboard topbar, market overview in OverviewTab). Use their official embed code with required attribution.
- Cursor/motion rule from Marco: animated cursors must never stop moving — overlapping waypoints, no idle pauses.

## Phase 5 — API hardening (if budget remains)
- Audit all 16 route groups under `app/api/`: consistent error handling, input validation, auth checks on every route, no unhandled promise rejections
- Rate limiting on public-facing routes

## Working rules
- Work autonomously; do not stop to ask on minor decisions — pick a reasonable option and note it
- After each phase: `npm run build` must pass, then commit
- If usage limit approaches, prioritize finishing the current phase cleanly and committing over starting a new phase
- Keep a running log of completed work in `FABLE_PROGRESS.md` so a follow-up session can resume
