#!/usr/bin/env bash
#
# Turn on VELQUOR alerting. Run from the repo root on Marco's Mac:
#
#   1. Telegram → message @BotFather → /newbot → follow prompts → copy the token
#   2. Open a chat with the bot it just made and send it any message ("hi")
#   3. echo 'TELEGRAM_BOT_TOKEN=<paste>' > ~/.velquor-telegram-token
#   4. ./bridge/setup-telegram-alerts.sh
#
# Step 3 keeps the token out of any transcript or shell history file that gets
# shared. This script resolves the chat id from the message in step 2, installs
# both onto the bridge box, and sends a test alert so activation is proven
# rather than assumed.

set -euo pipefail

TOKEN_FILE="${HOME}/.velquor-telegram-token"
[ -f "$TOKEN_FILE" ] || { echo "No ${TOKEN_FILE}. See the header of this script."; exit 1; }

# shellcheck disable=SC1090
. "$TOKEN_FILE"
TOKEN="${TELEGRAM_BOT_TOKEN:-}"
[ -n "$TOKEN" ] || { echo "TELEGRAM_BOT_TOKEN is empty in ${TOKEN_FILE}"; exit 1; }

echo "→ checking the bot token…"
me="$(curl -sS -m 15 "https://api.telegram.org/bot${TOKEN}/getMe")"
echo "$me" | grep -q '"ok":true' || { echo "Telegram rejected the token:"; echo "$me"; exit 1; }
bot="$(echo "$me" | python3 -c 'import json,sys; print(json.load(sys.stdin)["result"]["username"])')"
echo "  bot is @${bot}"

# The chat id comes from whoever has actually messaged the bot — there is no way
# to look it up by username, which is why step 2 exists.
echo "→ looking for your chat id…"
CHAT_ID="${TELEGRAM_CHAT_ID:-}"
if [ -z "$CHAT_ID" ]; then
  updates="$(curl -sS -m 15 "https://api.telegram.org/bot${TOKEN}/getUpdates")"
  CHAT_ID="$(echo "$updates" | python3 -c '
import json, sys
d = json.load(sys.stdin)
ids = []
for u in d.get("result", []):
    msg = u.get("message") or u.get("channel_post") or {}
    chat = msg.get("chat") or {}
    if chat.get("id") is not None:
        ids.append((chat["id"], chat.get("first_name") or chat.get("title") or ""))
print(ids[-1][0] if ids else "")')"
fi

if [ -z "$CHAT_ID" ]; then
  echo
  echo "  Telegram has no messages for @${bot} yet."
  echo "  Open https://t.me/${bot}, send it any message, then run this again."
  exit 1
fi
echo "  chat id ${CHAT_ID}"

echo "→ installing on the bridge box…"
ssh velquor-bridge "umask 077; cat > /opt/velquor-watchdog/.env" <<EOF
TELEGRAM_BOT_TOKEN=${TOKEN}
TELEGRAM_CHAT_ID=${CHAT_ID}
EOF
ssh velquor-bridge 'chmod 600 /opt/velquor-watchdog/.env'

echo "→ sending a test alert…"
ssh velquor-bridge "set -a; . /opt/velquor-watchdog/.env; set +a
curl -sS -m 10 -o /dev/null -X POST \"https://api.telegram.org/bot\${TELEGRAM_BOT_TOKEN}/sendMessage\" \
  -d chat_id=\"\${TELEGRAM_CHAT_ID}\" \
  --data-urlencode text='✅ VELQUOR alerts are live.
This is a test from the bridge watchdog on '\"\$(hostname)\"'.
You will get a message here within ~2 minutes of the bridge going down, and again when it recovers.'"

echo
echo "Done. Check Telegram — you should have a message from @${bot}."
echo
echo "Still worth adding in the Vercel dashboard (catches the whole box vanishing,"
echo "which the box itself cannot report):"
echo "  TELEGRAM_BOT_TOKEN = ${TOKEN}"
echo "  TELEGRAM_CHAT_ID   = ${CHAT_ID}"
