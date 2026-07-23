#!/bin/bash
# VELQUOR cloud terminal sidecar.
# The EA (InpFileBridge=true) can't use MT5 WebRequest headlessly, so it moves
# every bridge call through files, and this loop shuttles them:
#
#   /sync ........ EA writes vq_sync.json (every write) → POST /sync
#   copy out ..... EA writes vq_cout_*.json envelopes    → POST endpoint in each
#   copy in ...... this loop polls GET /copy/poll (followers) → writes vq_cin_signals.json
#   screenshots .. EA writes vq_shot_<ticket>_<slot>.png → POST /screenshot
#
# curl + jq only, no extra runtime. Env: VQ_API_KEY, BRIDGE_URL.
set -u
: "${VQ_API_KEY:?}"
BRIDGE_URL="${BRIDGE_URL:-https://bridge.velquor.app}"
FILES_DIR="${MT5_FILES_DIR:-/wine/drive_c/Program Files/MetaTrader 5/MQL5/Files}"
SYNC_FILE="$FILES_DIR/vq_sync.json"
CONFIG_FILE="$FILES_DIR/vq_copyconfig.json"
INBOX="$FILES_DIR/vq_cin_signals.json"

log() { echo "{\"ts\":\"$(date -Is)\",\"sidecar\":\"$1\"}"; }
log "up: watching $FILES_DIR -> $BRIDGE_URL"

post_json() { # post_json <path> <body>  -> echoes http code
  # Body goes in via stdin, NOT as a curl argv: Linux caps a single exec
  # argument at MAX_ARG_STRLEN (128 KiB). Candle payloads run ~180 KB, so
  # passing the body as "$2" made execve fail with E2BIG -> curl never ran
  # -> http=000. printf is a shell builtin (no exec, no arg limit).
  printf '%s' "$2" | curl -s -o /dev/null -w "%{http_code}" --max-time 15 \
    -X POST "$BRIDGE_URL$1" \
    -H "Content-Type: application/json" \
    -H "X-Api-Key: $VQ_API_KEY" \
    "${@:3}" \
    --data-binary @- 2>/dev/null || echo 000
}

forward_sync() {
  [ -s "$SYNC_FILE" ] || return
  local mt; mt="$(stat -c %Y "$SYNC_FILE" 2>/dev/null || echo 0)"
  [ "$mt" = "$last_sync_mt" ] && return
  local body; body="$(cat "$SYNC_FILE" 2>/dev/null)"
  [ "${body:0:1}" = "{" ] || return
  local code; code="$(post_json /sync "$body" -H "X-Mt5-Login: ${MT5_LOGIN:-}")"
  if [ "$code" = "200" ]; then last_sync_mt="$mt"; log "sync 200 ${#body}b"; else log "sync http=$code"; fi
}

forward_copy_outbox() {
  local f
  for f in "$FILES_DIR"/vq_cout_*.json; do
    [ -e "$f" ] || continue
    # Give up on envelopes stuck >120s (~hundreds of retries) — e.g. an ack
    # whose copy_log row never landed. Never let one bad file spin forever.
    if [ -n "$(find "$f" -mmin +2 2>/dev/null)" ]; then
      log "copy-out DROPPED stale $(basename "$f")"; rm -f "$f"; continue
    fi
    local ep grp lgn body
    ep="$(jq -r '.endpoint // empty' "$f" 2>/dev/null)"
    grp="$(jq -r '.group // ""' "$f" 2>/dev/null)"
    lgn="$(jq -r '.login // ""' "$f" 2>/dev/null)"
    body="$(jq -c '.body' "$f" 2>/dev/null)"
    if [ -z "$ep" ] || [ "$body" = "null" ] || [ -z "$body" ]; then rm -f "$f"; continue; fi
    local code
    code="$(post_json "$ep" "$body" -H "X-Copy-Group: $grp" -H "X-Mt5-Login: $lgn")"
    if [ "$code" = "200" ]; then rm -f "$f"; log "copy-out $ep 200"; else log "copy-out $ep http=$code (retry)"; fi
  done
}

forward_screenshots() {
  # Throttled to one pass per 3 s: a 404 (trade row not synced yet) must retry
  # on the /sync cadence, not the 0.1 s file-loop cadence, or the rate limit
  # burns out in seconds.
  local now; now="$(date +%s)"
  [ $((now - last_shot_ts)) -lt 3 ] && return
  last_shot_ts=$now
  local f
  for f in "$FILES_DIR"/vq_shot_*.png; do
    [ -e "$f" ] || continue
    local base ticket slot
    base="$(basename "$f" .png)"          # vq_shot_<ticket>_<slot>
    ticket="${base#vq_shot_}"
    slot="${ticket##*_}"
    ticket="${ticket%_*}"
    case "$slot" in open|close) ;; *) log "shot DROPPED bad name $(basename "$f")"; rm -f "$f"; continue ;; esac
    # Trade rows land via /sync within ~10 s; anything unsent after 10 min is dead.
    if [ -n "$(find "$f" -mmin +10 2>/dev/null)" ]; then
      log "shot DROPPED stale $(basename "$f")"; rm -f "$f"; continue
    fi
    local code
    code="$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 \
      -X POST "$BRIDGE_URL/screenshot?ticket=$ticket&slot=$slot" \
      -H "Content-Type: image/png" \
      -H "X-Api-Key: $VQ_API_KEY" \
      -H "X-Mt5-Login: ${MT5_LOGIN:-}" \
      --data-binary @"$f" 2>/dev/null || echo 000)"
    if [ "$code" = "200" ]; then rm -f "$f"; log "shot $slot $ticket 200"
    elif [ "$code" = "404" ]; then :   # row not synced yet — quiet retry next pass
    else log "shot $slot $ticket http=$code (retry)"; fi
  done
}

# Dedicated long-poll loop (backgrounded): the bridge holds ?wait=25 requests
# open and answers the instant a signal lands, so delivery latency is network
# round-trip, not poll cadence.
copy_poll_loop() {
  local last_poll_code=""
  while true; do
    if [ ! -s "$CONFIG_FILE" ] || [ "$(jq -r '.mode // "OFF"' "$CONFIG_FILE" 2>/dev/null)" != "FOLLOWER" ]; then
      sleep 5; continue
    fi
    # Don't clobber an inbox the EA hasn't consumed yet.
    if [ -e "$INBOX" ]; then sleep 0.2; continue; fi
    local grp lgn resp code
    grp="$(jq -r '.group // ""' "$CONFIG_FILE" 2>/dev/null)"
    lgn="$(jq -r '.login // ""' "$CONFIG_FILE" 2>/dev/null)"
    resp="$(curl -s --max-time 30 -w '\n%{http_code}' "$BRIDGE_URL/copy/poll?wait=25" \
      -H "X-Api-Key: $VQ_API_KEY" -H "X-Copy-Group: $grp" -H "X-Mt5-Login: $lgn" 2>/dev/null)"
    code="${resp##*$'\n'}"
    resp="${resp%$'\n'*}"
    if [ "$code" != "200" ]; then
      # Log state changes only — a sustained 429/5xx would otherwise flood stdout.
      [ "$code" = "$last_poll_code" ] || log "copy-poll http=$code"
      last_poll_code="$code"
      sleep 2; continue
    fi
    [ "$last_poll_code" = "200" ] || { [ -n "$last_poll_code" ] && log "copy-poll recovered"; }
    last_poll_code="200"
    # Only write a file when there are actually signals to process.
    if echo "$resp" | jq -e '.signals | length > 0' >/dev/null 2>&1; then
      printf '%s' "$resp" > "$INBOX"
      log "copy-in $(echo "$resp" | jq -r '.signals | length') signals"
      # Give the EA time to consume + the ack to reach the bridge before
      # re-polling, or the same pending row comes straight back. (Redelivery
      # is harmless — idempotent opens + pending-only acks — this just avoids
      # wasted round-trips.)
      sleep 0.5
    fi
  done
}

last_sync_mt=""
last_shot_ts=0
copy_poll_loop &
# Fast local loop: file checks are cheap, and copy-out latency (leader signal
# → bridge) rides on this cadence.
while true; do
  forward_sync
  forward_copy_outbox
  forward_screenshots
  sleep 0.1
done
