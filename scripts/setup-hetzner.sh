#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# VELQUOR Bridge — Hetzner CX22 (Ubuntu 22.04) setup
# Run as root on a fresh server:
#   curl -sL https://raw.githubusercontent.com/yourusername/velquor/main/scripts/setup-hetzner.sh | bash
#
# Or upload manually and: chmod +x setup-hetzner.sh && ./setup-hetzner.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BRIDGE_DIR="/opt/velquor-bridge"
LOG_DIR="/var/log/velquor-bridge"
DOMAIN="bridge.velquor.app"

echo "──────────────────────────────────────────────"
echo "  VELQUOR Bridge — Hetzner setup"
echo "──────────────────────────────────────────────"

# ── System update ─────────────────────────────────────────────────────────────
apt-get update -y && apt-get upgrade -y

# ── Node.js 20 LTS ───────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "Node $(node -v) | npm $(npm -v)"

# ── PM2 ──────────────────────────────────────────────────────────────────────
npm install -g pm2
pm2 startup systemd -u root --hp /root | tail -1 | bash

# ── nginx ────────────────────────────────────────────────────────────────────
apt-get install -y nginx

# ── Certbot ──────────────────────────────────────────────────────────────────
apt-get install -y certbot python3-certbot-nginx

# ── UFW firewall ─────────────────────────────────────────────────────────────
apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

# ── Log directory ────────────────────────────────────────────────────────────
mkdir -p "$LOG_DIR"

# ── Bridge directory ─────────────────────────────────────────────────────────
mkdir -p "$BRIDGE_DIR"

echo ""
echo "──────────────────────────────────────────────"
echo "  Next steps (manual):"
echo "──────────────────────────────────────────────"
echo ""
echo "1. Upload bridge files to ${BRIDGE_DIR}:"
echo "   scp -r bridge/* root@<SERVER_IP>:${BRIDGE_DIR}/"
echo ""
echo "2. Create .env:"
echo "   nano ${BRIDGE_DIR}/.env"
echo "   → paste SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "3. Install Node deps:"
echo "   cd ${BRIDGE_DIR} && npm install --production"
echo ""
echo "4. Point ${DOMAIN} DNS A record to this server's IP"
echo "   Then run: certbot --nginx -d ${DOMAIN}"
echo ""
echo "5. Install nginx config:"
echo "   cp ${BRIDGE_DIR}/nginx.conf /etc/nginx/sites-available/velquor-bridge"
echo "   ln -sf /etc/nginx/sites-available/velquor-bridge /etc/nginx/sites-enabled/"
echo "   nginx -t && systemctl reload nginx"
echo ""
echo "6. Start bridge with PM2:"
echo "   pm2 start ${BRIDGE_DIR}/pm2.config.js"
echo "   pm2 save"
echo ""
echo "7. Verify: curl https://${DOMAIN}/health"
echo ""
echo "Done! Server is ready for EA connections."
