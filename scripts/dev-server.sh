#!/usr/bin/env bash
# Start the Next.js dev server, dealing with an already-occupied port.
#
# "Port 3000 is in use" is almost always a dev server this repo left running.
# Rather than failing, reclaim the port when it is ours, and otherwise move to
# the next free one and say so.
set -euo pipefail

# Always run the app from apps/web, whichever directory invoked this script.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../apps/web"

PORT="${PORT:-3000}"
MAX_PORT=$((PORT + 10))

port_pid() {
  lsof -ti "tcp:$1" -sTCP:LISTEN 2>/dev/null | head -1 || true
}

is_our_dev_server() {
  local pid="$1"
  local cmd
  cmd="$(ps -o command= -p "$pid" 2>/dev/null || true)"
  [[ "$cmd" == *"next"*"dev"* || "$cmd" == *"next-server"* ]]
}

pid="$(port_pid "$PORT")"

if [[ -n "$pid" ]]; then
  if is_our_dev_server "$pid"; then
    echo "Port $PORT held by a previous dev server (pid $pid) - reclaiming it."
    kill "$pid" 2>/dev/null || true
    for _ in $(seq 1 20); do
      [[ -z "$(port_pid "$PORT")" ]] && break
      sleep 0.25
    done
    if [[ -n "$(port_pid "$PORT")" ]]; then
      echo "Could not free port $PORT; kill pid $pid manually." >&2
      exit 1
    fi
  else
    echo "Port $PORT is used by another program (pid $pid), not a dev server."
    while [[ -n "$(port_pid "$PORT")" && "$PORT" -lt "$MAX_PORT" ]]; do
      PORT=$((PORT + 1))
    done
    if [[ -n "$(port_pid "$PORT")" ]]; then
      echo "No free port between ${PORT} and ${MAX_PORT}." >&2
      exit 1
    fi
    echo "Starting on port $PORT instead - open http://localhost:$PORT"
  fi
fi

exec npx next dev --port "$PORT"
