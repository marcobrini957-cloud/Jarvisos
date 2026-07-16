# VELQUOR cloud terminal — headless MT5 under Wine
# Build ON the Hetzner box (x86_64): docker build -t velquor-mt5 cloudterm/
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
RUN dpkg --add-architecture i386 \
 && apt-get update \
 && apt-get install -y --no-install-recommends \
      wine wine64 wine32:i386 xvfb xauth winbind ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

ENV WINEPREFIX=/wine \
    WINEDEBUG=-all \
    DISPLAY=:99

RUN wineboot --init; wineserver -w

# Silent-install MT5 (installer needs a virtual display even with /auto)
RUN curl -fsSL -o /tmp/mt5setup.exe \
      https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe \
 && bash -c 'Xvfb :99 -screen 0 1024x768x16 & sleep 3; \
             wine /tmp/mt5setup.exe /auto; wineserver -w; kill %1 || true' \
 && test -f "/wine/drive_c/Program Files/MetaTrader 5/terminal64.exe" \
 && rm /tmp/mt5setup.exe

# First run extracts the MQL5 standard library (Include/Trade/Trade.mqh etc.),
# which the installer does NOT ship — the EA compile below needs it.
WORKDIR /wine/drive_c/Program Files/MetaTrader 5
RUN bash -c 'Xvfb :99 -screen 0 1024x768x16 & sleep 2; \
             wine terminal64.exe /portable & sleep 25; \
             wineserver -k || true; sleep 3; kill %1 || true' \
 && test -f "MQL5/Include/Trade/Trade.mqh"

# EA source baked in and compiled at build time
COPY ["VelquorBridge.mq5", "/wine/drive_c/Program Files/MetaTrader 5/MQL5/Experts/VelquorBridge.mq5"]
RUN bash -c 'Xvfb :99 -screen 0 1024x768x16 & sleep 2; \
             wine MetaEditor64.exe /portable \
               /compile:"MQL5\Experts\VelquorBridge.mq5" \
               /log:"MQL5\compile.log"; wineserver -w; kill %1 || true' \
 && { test -f "MQL5/Experts/VelquorBridge.ex5" \
      || { iconv -f UTF-16LE -t UTF-8 MQL5/compile.log; exit 1; }; }
WORKDIR /

COPY sidecar.sh /sidecar.sh
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /sidecar.sh /entrypoint.sh

# ~500MB steady state; enforced via `docker run --memory` by the provisioner
ENTRYPOINT ["/entrypoint.sh"]
