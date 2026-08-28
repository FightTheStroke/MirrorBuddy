#!/bin/bash
# Wake the robot once after boot, so MirrorBuddy starts on its own.
#
# The wireless Reachy Mini deliberately boots asleep: its daemon is launched with
# --no-wake-up-on-start and only runs the configured startup app on the first
# wake-up, which normally means someone touching the antennas. A child who turns
# the robot on and waits therefore gets a robot that never speaks.
#
# This waits for the daemon, then asks it to wake up. Everything else — which app
# to run — stays the daemon's decision, so changing the startup app in the
# Reachy app keeps working.
set -u

API="http://127.0.0.1:8000"
MAX_WAIT_DAEMON=180 # seconds to wait for the HTTP API after boot
WAKE_ATTEMPTS=5
SETTLE=20 # seconds to let an app come up before checking

log() { echo "mirrorbuddy-autostart: $*"; }

json_field() {
  # $1 = python expression over the parsed body on stdin
  python3 -c "import sys,json
try:
    d=json.load(sys.stdin)
except Exception:
    sys.exit(1)
print($1)" 2>/dev/null
}

app_state() {
  curl -sf -m 5 "$API/api/apps/current-app-status" |
    json_field '(d or {}).get("state","")'
}

startup_app() {
  curl -sf -m 5 "$API/api/apps/startup-app" |
    json_field '(d or {}).get("startup_app") or ""'
}

waited=0
until curl -sf -m 5 "$API/api/daemon/status" >/dev/null 2>&1; do
  if [ "$waited" -ge "$MAX_WAIT_DAEMON" ]; then
    log "daemon API never answered after ${MAX_WAIT_DAEMON}s — giving up"
    exit 1
  fi
  sleep 5
  waited=$((waited + 5))
done
log "daemon API is up after ${waited}s"

# Take the newest published version before the app starts. Nobody in a family is
# going to open a dashboard to press Update, and a robot that never updates is
# a robot running whatever it shipped with, for years. Safe to do here because the
# family's settings no longer live inside the package an update replaces, and
# because the updater never fails the boot: worst case the robot starts on the
# version it already has.
if [ -x /venvs/apps_venv/bin/python ]; then
  /venvs/apps_venv/bin/python -m reachy_mini_mirrorbuddy.self_update 2>&1 |
    while IFS= read -r line; do log "$line"; done
fi

configured="$(startup_app)"
if [ -z "$configured" ]; then
  log "no startup app configured — nothing to wake for"
  exit 0
fi
log "startup app is '$configured'"

for attempt in $(seq 1 "$WAKE_ATTEMPTS"); do
  state="$(app_state)"
  if [ "$state" = "running" ]; then
    log "'$configured' is running — done"
    exit 0
  fi

  log "waking the robot (attempt $attempt/$WAKE_ATTEMPTS, app state='${state:-none}')"
  curl -sf -m 30 -X POST "$API/api/move/play/wake_up" >/dev/null 2>&1 || true
  sleep "$SETTLE"
done

state="$(app_state)"
if [ "$state" = "running" ]; then
  log "'$configured' is running — done"
  exit 0
fi

log "'$configured' did not start after $WAKE_ATTEMPTS wake-ups (state='${state:-none}')"
exit 1
