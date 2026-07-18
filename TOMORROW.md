# VELQUOR — Work Plan (from 2026-07-19, markets open)

State as of Sat 2026-07-18 evening: copy trading LIVE end-to-end (~0.3-0.55s
delivery, burst-proven, EA 2.16), account switcher shipped, journal is
master-only, terminals density-optimized. Everything below is what stands
between this and a launchable product.

## A. Validate with live markets (Mon/Tue, needs open forex)
1. **Weekday load re-measure** — Saturday has no ticks. During London/NY:
   `docker stats` on both terminals (expect 0.15-0.3 cpu each). Then decide
   TERM_CAPACITY (currently 4; likely 5-6 after optimization) and whether the
   CX23 resize can wait.
2. **Real-trade copy validation** — Marco trades normally for a day with the
   funded slave; check every mirror in Copy tab log: latency, lots 1:1,
   closes matched. This is the go/no-go for calling copy trading DONE.
3. **Weekday latency measure on forex** (BTCUSD weekend fills were 1-2s
   broker-side; EURUSD weekday should fill in ~50-300ms → total mirror
   ~0.5-0.8s fill-to-fill).

## B. Decisions Marco must make (blockers for launch config)
4. **Pro tier: 0 or 1 cloud terminal?** Stated intent: free+pro = EA path,
   cloud = ultra-only. Code today: pro gets 1 cloud terminal
   (lib/api/tier.ts PLANS.pro.cloudTerminals=1). One-line change + pricing
   page copy must match. DECIDE, then align both.
5. **Infra accounts** (money, ~30 min of signups):
   - Supabase Pro ($25/mo) — snapshot volume will kill free tier with users
   - Vercel Pro ($20/mo) — required for commercial use
   - Stripe — billing not started; `stripe_customer_id` column doesn't exist
   - Anthropic API key into Vercel env (AI coach for paid tiers is silently
     degraded to '' right now)
   - Email: Cloudflare routing / Resend (dev_todos has the list)

## C. Build next (priority order)
6. **Snapshot pruning job** (~1h, no decisions needed) — keep raw
   account_snapshots 48h, thin to hourly after, delete >90d. Runs as
   pg_cron in Supabase or a bridge interval. Without it every connected
   account writes ~8.6K rows/day forever.
7. **EA Connect Wizard** (~half day) — the free/pro onboarding path is a
   text modal today. 3 steps with big copy buttons (API key, bridge URL),
   screenshots for the MT5 WebRequest allowlist, and a live "waiting for
   first sync… ✓ Connected!" check (poll user_profiles.ea_last_seen).
   This is THE conversion lever for the EA path.
8. **Copy tab: live positions card** — slave's open mirrors + balance
   (data already on copy_accounts + copy_log; Marco asked for visibility
   without logging into the slave in MT5).
9. **Copy trading UX polish** — surface per-mirror status (executed/failed
   reason like margin) as human text in GroupCard; "failed: no money on
   slave" should be readable by a non-dev.

## D. Tightening (Marco: "internally change some stuff to finalize")
10. Marco to list his internal changes — placeholder for his walkthrough.
11. **Security sweep before strangers arrive**: revoke the Supabase
    Management token that sits in shell history (sbp_92d2…, used today for
    DDL — generate fresh when needed); rotate anything else long-lived;
    RLS remains the long-term item.
12. Delete MetaAPI code once Instant Connect is declared proven (routes
    mt5-sync POST path, mt5-accounts, mt5-debug, user/mt5-credentials +
    Topbar 30s MetaAPI polling) — after A.2 passes.

## Parking lot
- In-memory ack path / sub-300ms delivery (marketing number, not needed)
- Dedicated box plan at ~10 cloud users (EX44-class, €50-70/mo, 40-60 terminals)
- Landing "wow" pass round 2 (Marco hand-tunes, tread carefully)
