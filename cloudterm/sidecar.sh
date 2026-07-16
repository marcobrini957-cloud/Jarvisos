#!/bin/bash
# VELQUOR cloud terminal sidecar.
# The EA (InpFileBridge=true) can't use MT5 WebRequest headlessly, so it moves
# every bridge call through files, and this loop shuttles them:
#
#   /sync ........ EA writes vq_sync.json (every write) → POST /sync
#   copy out ..... EA writes vq_cout_*.json envelopes    → POST endpoint in each
#   copy in ...... this loop polls GET /copy/poll (slaves) → writes vq_cin_signals.json
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

post_json() { # post_json <path> <bodyfile-or-string>  -> echoes http code
  curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
    -X POST "$BRIDGE_URL$1" \
    -H "Content-Type: application/json" \
    -H "X-Api-Key: $VQ_API_KEY" \
    "${@:3}" \
    --data-binary "$2" 2>/dev/null || echo 000
}

forward_sync() {
  [ -s "$SYNC_FILE" ] || return
  local mt; mt="$(stat -c %Y "$SYNC_FILE" 2>/dev/null || echo 0)"
  [ "$mt" = "$last_sync_mt" ] && return
  local body; body="$(cat "$SYNC_FILE" 2>/dev/null)"
  [ "${body:0:1}" = "{" ] || return
  local code; code="$(post_json /sync "$body")"
  if [ "$code" = "200" ]; then last_sync_mt="$mt"; log "sync 200 ${#body}b"; else log "sync http=$code"; fi
}

forward_copy_outbox() {
  local f
  for f in "$FILES_DIR"/vq_cout_*.json; do
    [ -e "$f" ] || continue
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

poll_copy_inbox() {
  [ -s "$CONFIG_FILE" ] || return
  local mode grp lgn
  mode="$(jq -r '.mode // "OFF"' "$CONFIG_FILE" 2>/dev/null)"
  [ "$mode" = "SLAVE" ] || return
  grp="$(jq -r '.group // ""' "$CONFIG_FILE" 2>/dev/null)"
  lgn="$(jq -r '.login // ""' "$CONFIG_FILE" 2>/dev/null)"
  # Don't clobber an inbox the EA hasn't consumed yet.
  [ -e "$INBOX" ] && return
  local resp
  resp="$(curl -s --max-time 8 "$BRIDGE_URL/copy/poll" \
    -H "X-Api-Key: $VQ_API_KEY" -H "X-Copy-Group: $grp" -H "X-Mt5-Login: $lgn" 2>/dev/null)"
  # Only write a file when there are actually signals to process.
  if echo "$resp" | jq -e '.signals | length > 0' >/dev/null 2>&1; then
    printf '%s' "$resp" > "$INBOX"
    log "copy-in $(echo "$resp" | jq -r '.signals | length') signals"
  fi
}

last_sync_mt=""
while true; do
  forward_sync
  forward_copy_outbox
  poll_copy_inbox
  sleep 3
done
