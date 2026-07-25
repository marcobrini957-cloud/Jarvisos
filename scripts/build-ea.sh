#!/usr/bin/env bash
# Compile ea/VelquorBridge.mq5 → ea/VelquorBridge.ex5 so users can download a
# ready-to-run EA instead of opening MetaEditor and pressing F7.
#
# There is no headless MetaEditor on macOS (the Wine wrapper only opens the
# GUI), so the compile runs inside the cloud-terminal image on the Hetzner box —
# the same toolchain that builds the EA baked into cloud terminals.
#
#   npm run ea:build      # after every EA edit, then commit the .ex5 + .json
#
# The recorded sourceSha256 is what scripts/sync-ea.mjs checks before shipping
# the binary; a mismatch withholds it rather than serving a stale EA.
set -euo pipefail

HOST="${BRIDGE_HOST:-velquor-bridge}"
SRC="ea/VelquorBridge.mq5"
OUT="ea/VelquorBridge.ex5"
META="ea/VelquorBridge.ex5.json"

[ -f "$SRC" ] || { echo "run this from the repo root ($SRC not found)"; exit 1; }

echo "→ uploading $SRC to $HOST"
scp -q "$SRC" "$HOST:/tmp/VelquorBridge.mq5"

echo "→ compiling in velquor-mt5:latest (MetaEditor under Wine)"
ssh "$HOST" 'bash -s' <<'REMOTE'
set -euo pipefail
MT5='/wine/drive_c/Program Files/MetaTrader 5'
rm -rf /tmp/eabuild && mkdir -p /tmp/eabuild
docker run --rm --entrypoint /bin/bash \
  -v /tmp/VelquorBridge.mq5:"$MT5/MQL5/Experts/VelquorBridge.mq5":ro \
  -v /tmp/eabuild:/out \
  velquor-mt5:latest -c '
    set -e
    cd "/wine/drive_c/Program Files/MetaTrader 5"
    Xvfb :99 -screen 0 1024x768x16 >/dev/null 2>&1 &
    sleep 2
    wine MetaEditor64.exe /portable \
      /compile:"MQL5\Experts\VelquorBridge.mq5" \
      /log:"MQL5\compile.log" || true
    wineserver -w || true
    if [ -f "MQL5/Experts/VelquorBridge.ex5" ]; then
      cp "MQL5/Experts/VelquorBridge.ex5" /out/VelquorBridge.ex5
    else
      iconv -f UTF-16LE -t UTF-8 MQL5/compile.log 2>/dev/null || cat MQL5/compile.log
      exit 1
    fi
  '
REMOTE

echo "→ fetching compiled EA"
scp -q "$HOST:/tmp/eabuild/VelquorBridge.ex5" "$OUT"

VERSION=$(sed -n 's/.*#property[[:space:]]*version[[:space:]]*"\([^"]*\)".*/\1/p' "$SRC" | head -1)
SHA=$(shasum -a 256 "$SRC" | cut -d' ' -f1)
cat > "$META" <<JSON
{
  "version": "$VERSION",
  "sourceSha256": "$SHA",
  "builtAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "builtWith": "velquor-mt5:latest (MetaEditor64 /compile under Wine)"
}
JSON

echo "✓ $OUT  (v$VERSION, $(wc -c < "$OUT" | tr -d ' ') bytes)"
echo "  commit $OUT and $META"
