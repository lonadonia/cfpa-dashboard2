#!/bin/bash
# CrossFit-Streaming-Overlay starten (macOS: Doppelklick, Linux: ./start-mac.command)
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js wurde nicht gefunden. Bitte die LTS-Version von https://nodejs.org installieren."
  read -r -n 1 -p "Taste drücken zum Beenden …"
  exit 1
fi
PORT="${PORT:-8080}"
export PORT
( sleep 2; if command -v open >/dev/null 2>&1; then open "http://localhost:$PORT/control.html"; else xdg-open "http://localhost:$PORT/control.html" >/dev/null 2>&1; fi ) &
node server.js
