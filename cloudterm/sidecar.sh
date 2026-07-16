#!/bin/bash
# VELQUOR cloud terminal sidecar.
# The EA (InpFileBridge=true) can't use MT5 WebRequest headlessly, so it writes
# its JSON payload to MQL5/Files/vq_sync.json. This loop forwards each new
# payload to the bridge with the user's API key — the request the EA would have
# made itself. curl-only, no extra runtime.
#
# Env: VQ_API_KEY, BRIDGE_URL (default https://bridge.velquor.app)
set -u
: "${VQ_API_KEY:?}"
BRIDGE_URL="${BRIDGE_URL:-https://bridge.velquor.app}"
FILES_DIR="${MT5_FILES_DIR:-/wine/drive_c/Program Files/MetaTrader 5/MQL5/Files}"
SYNC_FILE="$FILES_DIR/vq_sync.json"

log() { echo "{\"ts\":\"$(date -Is)\",\"sidecar\":\"$1\"}"; }
log "up: watching $SYNC_FILE -> $BRIDGE_URL"

# Forward on every EA write (file mtime change), not on content change — the EA
# rewrites every InpIntervalSec even when idle, so this doubles as a liveness
# heartbeat. A failed POST leaves lastmt unchanged so the next loop retries.
lastmt=""
while true; do
  if [ -s "$SYNC_FILE" ]; then
    mt="$(stat -c %Y "$SYNC_FILE" 2>/dev/null || echo 0)"
    if [ "$mt" != "$lastmt" ]; then
      body="$(cat "$SYNC_FILE" 2>/dev/null)"
      if [ "${body:0:1}" = "{" ]; then
        code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
          -X POST "$BRIDGE_URL/sync" \
          -H "Content-Type: application/json" \
          -H "X-Api-Key: $VQ_API_KEY" \
          --data-binary "$body" 2>/dev/null || echo 000)
        if [ "$code" = "200" ]; then
          lastmt="$mt"
          log "forwarded ${#body}b http=200"
        else
          log "bridge http=$code (will retry)"
        fi
      fi
    fi
  fi
  sleep 3
done
