#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# VELQUOR bridge — deploy to Hetzner
#
# One-time server prep (as root on the Hetzner box):
#   apt update && apt install -y nginx certbot python3-certbot-nginx
#   curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs
#   npm i -g pm2 && pm2 startup systemd
#   mkdir -p /opt/velquor-bridge /var/log/velquor-bridge
#   cp nginx.conf /etc/nginx/sites-available/velquor-bridge
#   ln -sf /etc/nginx/sites-available/velquor-bridge /etc/nginx/sites-enabled/
#   certbot --nginx -d bridge.velquor.app   # after DNS A record points here
#
# Create /opt/velquor-bridge/.env on the server (never commit it):
#   SUPABASE_URL=https://lgkdbfrsmgcxjfmvnvnd.supabase.co
#   SUPABASE_SERVICE_ROLE_KEY=...
#   BRIDGE_ADMIN_TOKEN=<long random string — same value goes in Vercel env>
#
# Then from this directory, deploy with:
#   BRIDGE_HOST=root@<server-ip> ./deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

HOST="${BRIDGE_HOST:?Set BRIDGE_HOST=user@server-ip}"
DIR=/opt/velquor-bridge

echo "→ uploading bridge to $HOST:$DIR"
scp server.js lib.js package.json pm2.config.js "$HOST:$DIR/"

echo "→ installing deps + (re)starting pm2"
ssh "$HOST" "set -e
  cd $DIR
  npm install --omit=dev --no-audit --no-fund
  # pm2 doesn't read .env files by itself — export before start
  set -a; source .env; set +a
  pm2 startOrReload pm2.config.js --update-env
  pm2 save
"

echo "→ health check"
sleep 1
ssh "$HOST" "curl -sf http://127.0.0.1:3001/health" && echo && echo "✓ bridge deployed and healthy"
