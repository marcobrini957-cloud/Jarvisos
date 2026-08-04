#!/usr/bin/env bash
# Teach a terminal about brokers, and keep what it learns.
#
# MetaTrader stores the servers it knows in config/servers.dat, and the only
# thing that puts entries there is the broker search in File → Open an Account,
# which downloads a company's server definitions from MetaQuotes. There is no
# file to download and no API that returns addresses — the platform's own
# server list (metatraderweb.app/trade/servers?version=5) gives names only.
#
# So we drive the wizard. Run this against a live container, give it broker
# names, and it copies the accumulated servers.dat out for baking into the image.
#
#   ./learn-servers.sh <container> [broker ...]
#
# Verify a name resolves afterwards by starting a terminal with Server=<name>
# and a junk login: "authorization ... failed (Invalid account)" in the log
# means the server was found. Silence means it was not.
set -euo pipefail

C="${1:?container name}"; shift
BROKERS=("$@")
[ ${#BROKERS[@]} -eq 0 ] && BROKERS=(Vantage Pepperstone FTMO Exness XM Tickmill Eightcap \
  FusionMarkets ThinkMarkets Admirals OANDA RoboForex Blueberry Darwinex ICMarkets)

DAT="/wine/drive_c/Program Files/MetaTrader 5/config/servers.dat"

docker exec "$C" sh -lc 'command -v xdotool >/dev/null || { apt-get update -qq && apt-get install -y -qq xdotool imagemagick; }' >/dev/null

docker exec -e DISPLAY=:99 "$C" sh -lc '
  # Dismiss whatever the terminal opened with (update prompt, EA alert).
  for xy in "584 406" "459 361" "584 406"; do xdotool mousemove $xy click 1 2>/dev/null || true; sleep 1; done
  xdotool mousemove 22 41 click 1; sleep 2      # File
  xdotool mousemove 75 343 click 1; sleep 3     # Open an Account
'

for B in "${BROKERS[@]}"; do
  docker exec -e DISPLAY=:99 "$C" sh -lc "
    xdotool mousemove 335 147 click 1; sleep 1
    xdotool key --clearmodifiers ctrl+a; sleep 1
    xdotool type --delay 40 '$B'; sleep 1
    xdotool mousemove 667 147 click 1; sleep 5
  "
  echo "learned: $B"
done

docker cp "$C:$DAT" ./servers.dat
ls -la ./servers.dat
echo "Commit this, rebuild the image, and name-only logins work for these brokers."
