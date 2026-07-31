#!/usr/bin/env bash
#
# VELQUOR bridge watchdog — runs ON the Hetzner box, every minute, under a
# systemd timer.
#
# Why here and not on Vercel: the failures that actually happen are local ones —
# pm2 crashed, the disk filled, nginx stopped, a terminal container died — and a
# once-a-day Vercel cron finds those up to 23 hours late. A check that lives on
# the box sees them in about a minute. The Vercel cron stays as the backstop for
# the one case this cannot report: the whole box being gone.
#
# Deliberately NOT run under pm2: pm2 is one of the things being watched, and a
# watchdog that dies with its subject is decoration. systemd owns it.
#
# Edge-triggered. It alerts on the transition into trouble and once again on
# recovery — never every minute, or the alert becomes noise you learn to ignore.
# A failure must persist for FAIL_THRESHOLD consecutive checks before it pages,
# so a `pm2 restart` during a deploy does not wake anyone up.

set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_FILE="${DIR}/state"
ENV_FILE="${DIR}/.env"

# shellcheck disable=SC1090
[ -f "$ENV_FILE" ] && . "$ENV_FILE"

TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"
ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
BRIDGE_HEALTH_URL="${BRIDGE_HEALTH_URL:-http://127.0.0.1:3001/health?deep=1}"
DISK_WARN_PCT="${DISK_WARN_PCT:-90}"
FAIL_THRESHOLD="${FAIL_THRESHOLD:-2}"

notify() {
  local msg="$1"
  if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    curl -sS -m 10 -o /dev/null \
      -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d chat_id="${TELEGRAM_CHAT_ID}" \
      --data-urlencode text="${msg}" \
      -d disable_web_page_preview=true || true
  fi
  # Discord and Slack accept the same body shape; harmless if unset.
  if [ -n "$ALERT_WEBHOOK_URL" ]; then
    curl -sS -m 10 -o /dev/null -X POST "$ALERT_WEBHOOK_URL" \
      -H 'Content-Type: application/json' \
      --data "$(printf '{"content":%s,"text":%s}' \
        "$(printf '%s' "$msg" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')" \
        "$(printf '%s' "$msg" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')")" || true
  fi
}

problems=()

# ── 1. Is the bridge process up? ────────────────────────────────────────────
# `pm2 jlist` is the machine-readable form; grepping `pm2 list` output breaks on
# its box-drawing characters.
pm2_status="$(pm2 jlist 2>/dev/null \
  | python3 -c 'import json,sys
try: apps = json.load(sys.stdin)
except Exception: print("unreadable"); raise SystemExit
b = [a for a in apps if a.get("name") == "velquor-bridge"]
print(b[0]["pm2_env"]["status"] if b else "missing")' 2>/dev/null || echo unreadable)"
[ "$pm2_status" != "online" ] && problems+=("bridge process is ${pm2_status}")

# ── 2. Does it actually answer, and can it reach the database? ──────────────
health="$(curl -sS -m 8 "$BRIDGE_HEALTH_URL" 2>/dev/null || echo '')"
if [ -z "$health" ]; then
  problems+=("bridge is not answering /health")
else
  echo "$health" | grep -q '"status":"ok"' || problems+=("bridge /health is not ok")
  echo "$health" | grep -q '"db":"ok"'     || problems+=("bridge cannot reach the database")
fi

# ── 3. Is the public endpoint reachable through nginx + TLS? ────────────────
# Checks the path a user's terminal actually takes, not just localhost.
code="$(curl -sS -m 10 -o /dev/null -w '%{http_code}' https://bridge.velquor.app/health 2>/dev/null || echo 000)"
[ "$code" != "200" ] && problems+=("https://bridge.velquor.app/health returned ${code}")

# ── 4. Disk ─────────────────────────────────────────────────────────────────
# Docker images and MT5 logs grow quietly; a full disk stops sync with no error
# anyone would look at.
disk="$(df --output=pcent / | tail -1 | tr -dc '0-9')"
[ -n "$disk" ] && [ "$disk" -ge "$DISK_WARN_PCT" ] && problems+=("disk is ${disk}% full")

# ── 5. Terminal containers ──────────────────────────────────────────────────
# A container that was deprovisioned is removed, which is fine. One that is
# present but not running has crashed, and that user's sync is silently dead.
dead="$(docker ps -a --filter 'name=velquor-term-' --format '{{.Names}} {{.State}}' 2>/dev/null \
  | awk '$2 != "running" { print $1 }' | tr '\n' ' ')"
[ -n "${dead// /}" ] && problems+=("terminal container(s) not running: ${dead}")

# ── State machine ───────────────────────────────────────────────────────────
prev_state="ok"; prev_fails=0
if [ -f "$STATE_FILE" ]; then
  # shellcheck disable=SC1090
  . "$STATE_FILE"
  prev_state="${STATE:-ok}"; prev_fails="${FAILS:-0}"
fi

if [ ${#problems[@]} -gt 0 ]; then
  fails=$((prev_fails + 1))
  if [ "$fails" -ge "$FAIL_THRESHOLD" ] && [ "$prev_state" != "down" ]; then
    body="🔴 VELQUOR bridge PROBLEM"$'\n\n'
    for p in "${problems[@]}"; do body+="• ${p}"$'\n'; done
    body+=$'\n'"Live trade sync may be down for all users."$'\n'"Box: $(hostname) · $(date -u '+%Y-%m-%d %H:%M UTC')"
    notify "$body"
    printf 'STATE=down\nFAILS=%s\n' "$fails" > "$STATE_FILE"
  else
    printf 'STATE=%s\nFAILS=%s\n' "$prev_state" "$fails" > "$STATE_FILE"
  fi
  # Non-zero exit records the failure in `systemctl status` / journalctl too.
  printf 'watchdog: %s\n' "${problems[*]}" >&2
  exit 1
fi

if [ "$prev_state" = "down" ]; then
  notify "🟢 VELQUOR bridge RECOVERED"$'\n\n'"All checks passing again."$'\n'"Box: $(hostname) · $(date -u '+%Y-%m-%d %H:%M UTC')"
fi
printf 'STATE=ok\nFAILS=0\n' > "$STATE_FILE"
exit 0
