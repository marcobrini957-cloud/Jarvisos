#!/bin/bash
# VELQUOR cloud terminal entrypoint.
# Required env: MT5_LOGIN, MT5_PASSWORD (investor is enough for sync),
#               MT5_SERVER, VQ_API_KEY
set -euo pipefail
: "${MT5_LOGIN:?}" "${MT5_PASSWORD:?}" "${MT5_SERVER:?}" "${VQ_API_KEY:?}"

MT5DIR="/wine/drive_c/Program Files/MetaTrader 5"
BRIDGE_URL="${BRIDGE_URL:-https://bridge.velquor.app}"

# MT5 config files are UTF-16LE with BOM and CRLF; helper writes them that way.
# Without the BOM MT5 misparses the first line (cost us the API key input).
w16() { # w16 <path> — reads stdin (UTF-8, LF), writes BOM + UTF-16LE CRLF
  { printf '\xff\xfe'; sed 's/$/\r/' | iconv -f UTF-8 -t UTF-16LE; } > "$1"
}

mkdir -p "$MT5DIR/config" "$MT5DIR/MQL5/Presets"

# Copy trading config — provisioner sets these for leader/follower terminals.
# Enum ints match ea/VelquorBridge.mq5: COPY_OFF=0 LEADER=1 FOLLOWER=2;
# LOT_PROPORTIONAL=0 LOT_FIXED=1.
VQ_COPY_MODE="${VQ_COPY_MODE:-0}"
VQ_COPY_GROUP="${VQ_COPY_GROUP:-}"
VQ_COPY_LOT_MODE="${VQ_COPY_LOT_MODE:-0}"
VQ_COPY_LOT_FIXED="${VQ_COPY_LOT_FIXED:-0.01}"
VQ_COPY_LOT_MULT="${VQ_COPY_LOT_MULT:-1.0}"
VQ_COPY_MAX_LOT="${VQ_COPY_MAX_LOT:-10.0}"

# EA inputs preset
w16 "$MT5DIR/MQL5/Presets/velquor.set" <<EOF
InpApiKey=$VQ_API_KEY
InpBridgeUrl=$BRIDGE_URL
InpIntervalSec=10
InpHistoryDays=30
InpDebugMode=true
InpFileBridge=true
InpSendCandles=true
InpCandleBars=320
InpCandleSec=60
InpCopyMode=$VQ_COPY_MODE
InpCopyGroupId=$VQ_COPY_GROUP
InpCopyLotMode=$VQ_COPY_LOT_MODE
InpCopyLotFixed=$VQ_COPY_LOT_FIXED
InpCopyLotMult=$VQ_COPY_LOT_MULT
InpCopyMaxLot=$VQ_COPY_MAX_LOT
EOF

# WebRequest allowlist (persistent terminal config)
w16 "$MT5DIR/config/common.ini" <<EOF
[Common]
Login=$MT5_LOGIN
ProxyEnable=0
CertInstall=0
NewsEnable=0
[WebRequest]
Url0=$BRIDGE_URL
EOF

# Headless terminals render for nobody: drop the saved chart profile so MT5
# boots with only the single EA chart from [StartUp] (a stock profile carries
# 5 charts — ~6 charts redrawing per terminal cost real CPU on the host).
rm -f "$MT5DIR/MQL5/Profiles/Charts/Default/"chart*.chr

# Start config: auto-login + auto-attach EA.
# NOTE: unlike the terminal's own config files, the /config start file must be
# plain ANSI text — UTF-16LE made the terminal skip the login silently.
sed 's/$/\r/' > "/wine/drive_c/autologin.ini" <<EOF
[Common]
Login=$MT5_LOGIN
Password=$MT5_PASSWORD
Server=$MT5_SERVER
KeepPrivate=1
[Charts]
MaxBars=10000
[Experts]
AllowLiveTrading=1
AllowDllImport=0
Enabled=1
Account=0
Profile=0
[StartUp]
Expert=VelquorBridge
ExpertParameters=velquor.set
Symbol=EURUSD
Period=M15
EOF

rm -f /tmp/.X99-lock
Xvfb :99 -screen 0 800x600x16 &
sleep 2

echo "[cloudterm] starting MT5 for login $MT5_LOGIN on $MT5_SERVER"
wine "$MT5DIR/terminal64.exe" /portable "/config:C:\\autologin.ini" &

# Forward the EA's file payloads to the bridge (WebRequest can't run headless).
MT5_FILES_DIR="$MT5DIR/MQL5/Files" VQ_API_KEY="$VQ_API_KEY" BRIDGE_URL="$BRIDGE_URL" \
  /sidecar.sh &

# MT5 LiveUpdate exits the original process and relaunches itself — the
# container must survive those gaps. Die only after 60s with no terminal.
sleep 20
misses=0
while [ "$misses" -lt 6 ]; do
  if grep -lsa terminal64 /proc/[0-9]*/cmdline >/dev/null 2>&1; then
    misses=0
  else
    misses=$((misses + 1))
  fi
  sleep 10
done
echo "[cloudterm] terminal gone for 60s — exiting for restart"
exit 1
