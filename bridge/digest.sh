#!/usr/bin/env bash
#
# VELQUOR daily digest — "what is working, what is not", once a day, to Telegram.
#
# The watchdog pages when something breaks. This is the other half: proof that
# nothing is broken, sent on a schedule, so silence is never ambiguous. After
# 2026-08-01 — sync dead for 19 hours with every liveness check green and no
# alert — a report that arrives whether or not anything is wrong is the thing
# that would have caught it, on the first morning, from a phone.
#
# Runs on the box under velquor-digest.timer. Same .env as the watchdog.

set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${DIR}/.env"
# shellcheck disable=SC1090
[ -f "$ENV_FILE" ] && . "$ENV_FILE"

TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"
BRIDGE_ADMIN_TOKEN="${BRIDGE_ADMIN_TOKEN:-}"

send() {
  [ -z "$TELEGRAM_BOT_TOKEN" ] && return 0
  curl -sS -m 15 -o /dev/null \
    -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d chat_id="${TELEGRAM_CHAT_ID}" \
    --data-urlencode text="$1" \
    -d disable_web_page_preview=true || true
}

digest="$(curl -sS -m 15 -H "Authorization: Bearer ${BRIDGE_ADMIN_TOKEN}" \
  http://127.0.0.1:3001/admin/digest 2>/dev/null || echo '')"

if [ -z "$digest" ]; then
  send "🔴 VELQUOR daily report

Could not read the bridge at all — it is not answering /admin/digest.
Box: $(hostname) · $(date -u '+%Y-%m-%d %H:%M UTC')"
  exit 1
fi

disk="$(df --output=pcent / | tail -1 | tr -dc '0-9')"
mem="$(free -m | awk '/^Mem:/ {printf "%d/%d MB", $3, $2}')"
terms="$(docker ps --filter 'name=velquor-term-' --format '{{.Names}}' 2>/dev/null | grep -c . || echo 0)"

body="$(printf '%s' "$digest" | DISK="$disk" MEM="$mem" TERMS="$terms" python3 "${DIR}/digest.py")"

send "${body}

Box: $(hostname) · $(date -u '+%Y-%m-%d %H:%M UTC')"
