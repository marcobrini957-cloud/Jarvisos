# VELQUOR — Work Plan (from 2026-07-19, markets open)

State as of Sat 2026-07-18 evening: copy trading LIVE end-to-end (~0.3-0.55s
delivery, burst-proven, EA 2.16), account switcher shipped, journal is
leader-only, terminals density-optimized. Everything below is what stands
between this and a launchable product.

## A. Validate with live markets (Mon/Tue, needs open forex)
1. **Weekday load re-measure** — Saturday has no ticks. During London/NY:
   `docker stats` on both terminals (expect 0.15-0.3 cpu each). Then decide
   TERM_CAPACITY (currently 4; likely 5-6 after optimization) and whether the
   CX23 resize can wait.
2. **Real-trade copy validation** — Marco trades normally for a day with the
   funded follower; check every mirror in Copy tab log: latency, lots 1:1,
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
6. ~~**Snapshot pruning job**~~ DONE 2026-07-30 — `prune_account_snapshots()`
   (supabase-snapshot-pruning.sql, live on the database) keeps 48h raw, thins
   to one row per hour per account to 90 days, then deletes. Invoked daily at
   03:20 UTC by `/api/cron/prune-snapshots` (vercel.json). First run removed
   **104,704 of 122,552 rows** — the measurement in the old note was right,
   8,700 rows/day from a single login. Every read in the product is
   `order(snapshot_at desc).limit(1)`, so nothing lost resolution it was using.
   ⚠️ The route refuses to run without `x-vercel-cron` or `CRON_SECRET`: it
   deletes, so it does not get the watchdog's "no secret → open" default.
7. ~~**EA Connect Wizard**~~ DONE 2026-07-25 (f26fa2a) — `/connect` +
   `components/ea/EAConnectWizard.tsx`, also embedded in onboarding step 2 and
   linked from Settings / Copy tab / the empty Trading tab. 3 steps with big
   copy buttons, rendered MT5 dialog mock-ups instead of screenshots, live
   handshake banner. Users now download a **compiled .ex5** (no MetaEditor):
   `npm run ea:build` compiles on the bridge box and records the source hash;
   `sync-ea.mjs` withholds the binary if it ever drifts from the .mq5.
   ⚠️ Re-run `npm run ea:build` after every EA edit, commit the .ex5 + .json.
8. **Copy tab: live positions card** — follower's open mirrors + balance
   (data already on copy_accounts + copy_log; Marco asked for visibility
   without logging into the follower in MT5).
9. **Copy trading UX polish** — surface per-mirror status (executed/failed
   reason like margin) as human text in GroupCard; "failed: no money on
   follower" should be readable by a non-dev.

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
