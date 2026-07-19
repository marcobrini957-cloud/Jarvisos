# VELQUOR Bridge (v2)

Node/Express service between the MT5 EA (`ea/VelquorBridge.mq5`) and Supabase.
Runs on the Hetzner box behind nginx at `bridge.velquor.app`.

## Endpoints

| Route | Caller | Purpose |
|---|---|---|
| `POST /sync` | EA | account snapshot + open/closed trades (batched upsert) |
| `POST /disconnect` | EA | mark EA offline |
| `POST /copy/signal` | leader EA | broadcast trade signal to group |
| `GET /copy/poll` | follower EA | fetch pending signals (+ lot config) |
| `POST /copy/ack` | follower EA | report execution result |
| `GET /health` | anyone | status/version/uptime (`?deep=1` also pings the DB) |
| `GET /admin/stats` | admin console | metrics + live settings (Bearer `BRIDGE_ADMIN_TOKEN`) |
| `POST /admin/reload` | admin console | force settings refresh + clear auth cache |

EA auth: `X-Api-Key: vq_…` (from `user_profiles.velquor_api_key`).
Banned users (`user_profiles.banned`) get `403 account_banned` on every route.

## Live settings

The bridge polls the `bridge_settings` row (id=1) every 30 s — edit it from the
VELQUOR admin console (`/dev` → Bridge) and changes apply without a restart:
maintenance mode, sync/copy kill switches, rate limits, minimum EA version.

It also writes a heartbeat (version, uptime, metrics) back to that row every
30 s, which is how the admin console shows bridge health without needing
network access to the box.

Until `supabase-admin-foundation.sql` has been run, the bridge falls back to
built-in defaults and skips the heartbeat — it still syncs trades.

## Env (`/opt/velquor-bridge/.env`)

```
SUPABASE_URL=…
SUPABASE_SERVICE_ROLE_KEY=…
BRIDGE_ADMIN_TOKEN=…   # same value as in Vercel, enables /admin/*
PORT=3001              # optional
```

## Deploy

DNS `bridge.velquor.app` → server IP, then see the header of `deploy.sh`
for one-time server prep. Every deploy after that:

```
BRIDGE_HOST=root@<ip> ./deploy.sh
```

Logs: `pm2 logs velquor-bridge` (JSON lines). Crash-safety: uncaught
exceptions exit and pm2 restarts; per-route errors are caught and answered
with 500 without taking the process down.
