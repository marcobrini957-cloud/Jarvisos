# VELQUOR Cloud Terminal ("Instant Connect")

Self-hosted replacement for MetaAPI: users paste MT5 login + **investor password**
(read-only) + broker server on velquor.app, and we run a headless MT5 terminal for
them 24/7 on the Hetzner box. The terminal has the VelquorBridge EA attached and
pushes trades/snapshots to the bridge exactly like a user-run desktop EA would.

Cost per user: ~500 MB RAM ≈ €0.40–0.60/month at dedicated-server prices,
vs €15/month/account on MetaAPI.

## Pieces

| File | Where it runs | Purpose |
|---|---|---|
| `Dockerfile` | built on Hetzner (x86 only) | Ubuntu + Wine + Xvfb + MT5 (silent install) + compiled EA |
| `entrypoint.sh` | in each container | writes UTF-16LE MT5 configs (auto-login ini, EA preset, WebRequest allowlist), starts Xvfb + terminal |
| `provisioner.js` | Hetzner, pm2 `velquor-term`, port 3002 | REST API to start/stop/inspect per-user containers |
| `pm2.config.js` | Hetzner | pm2 unit for the provisioner |

Site side: `app/api/mt5/connect/route.ts` (POST=provision, GET=status,
DELETE=disconnect) called by `MT5ConnectModal`. Auth: user cookie → provisioner
call with `BRIDGE_ADMIN_TOKEN` server-side.

## Why a file sidecar instead of WebRequest

MT5's `WebRequest()` needs the "Allow WebRequest for listed URL" permission,
which **cannot be set headlessly** — the URL list is encrypted per terminal
session, so copying a pre-authorized config or committing a GUI-enabled image
both still fail with error 4014 (function not allowed) after a fresh login.

So cloud terminals run the EA with `InpFileBridge=true`: instead of calling
WebRequest, the EA atomically writes each JSON payload to
`MQL5/Files/vq_sync.json`, and `sidecar.sh` (curl loop in the same container)
forwards new payloads to `POST /sync` with the user's `X-Api-Key`. Desktop
users keep `InpFileBridge=false` and use WebRequest normally (they tick the box
once on a real install).

## Server layout (`/opt/velquor-term`)

- `provisioner.js`, `pm2.config.js`, `package.json`, `.env`
- `.env`: `BRIDGE_ADMIN_TOKEN` (same as bridge), `TERMINAL_CRED_KEY` (32-byte hex),
  `TERM_CAPACITY` (4 on the CX23)
- `accounts/<container>.cred` — AES-256-GCM encrypted credentials (never in Supabase)
- `build/` — Dockerfile + EA source, `docker build -t velquor-mt5 .`

nginx exposes `/provision*` and `/capacity` on bridge.velquor.app → 127.0.0.1:3002.

## Containers

`velquor-term-<user_id>` — `--restart unless-stopped --memory 700m --cpus 0.6`.
Credentials are passed via a transient env-file (deleted right after start).
Trade data flows: container EA → https://bridge.velquor.app/sync → Supabase.

Debug a terminal:
```
docker logs velquor-term-<uid>
docker exec velquor-term-<uid> bash -c \
  'iconv -f UTF-16LE -t UTF-8 "/wine/drive_c/Program Files/MetaTrader 5/MQL5/Logs/$(date +%Y%m%d).log"'
```

## Scaling

CX23 (current, €5.49): bridge + ~4 terminals. Next step at >4 Instant Connect
users: Hetzner dedicated (~€40–50/mo) → 80–120 terminals; keep this box as the
bridge, move the provisioner + Docker there, raise TERM_CAPACITY.

EA-path users (running the EA in their own MT5) cost ~nothing — capacity only
constrains Instant Connect.
