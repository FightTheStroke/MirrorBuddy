#!/usr/bin/env bash
# Keeps a Reachy Mini on the MirrorBuddy version published in the app store.
#
# Written after Roberto's robot ran 0.40.0 for days while the store served 0.40.7:
# the app looked fine, so nothing signalled that fixes were not arriving. The
# robot is also frequently off or off-network, which is why this waits patiently
# instead of failing — it acts only when the device answers and the versions
# actually differ.
#
#     ./robot/tools/robot-keeper.sh                  # watch forever
#     ROBOT_KEEPER_ONCE=1 ./robot/tools/robot-keeper.sh
#
# Environment: ROBOT_HOST, ROBOT_SSH_HOST, ROBOT_SPACE, ROBOT_KEEPER_SLEEP.

set -uo pipefail

HOST="${ROBOT_HOST:-192.168.0.109}"
API="http://${HOST}:8000"
SETTINGS_URL="http://${HOST}:7862/"
SSH_HOST="${ROBOT_SSH_HOST:-pollen@${HOST}}"
SPACE="${ROBOT_SPACE:-Roberdan/mirrorbuddy}"
SPACE_URL="https://huggingface.co/spaces/${SPACE}/raw/main/pyproject.toml"
APP="reachy_mini_mirrorbuddy"
IDLE_SLEEP="${ROBOT_KEEPER_SLEEP:-120}"
ONCE="${ROBOT_KEEPER_ONCE:-0}"

log() { printf '%s %s\n' "$(date +%Y-%m-%dT%H:%M:%S)" "$*"; }

json_field() {
  python3 -c 'import json,sys
try:
    print(json.load(sys.stdin).get(sys.argv[1], ""))
except Exception:
    print("")' "$1" 2>/dev/null
}

robot_reachable() { curl -s -m 6 -o /dev/null "$API/api/daemon/status"; }

installed_version() {
  timeout 20 ssh -o BatchMode=yes -o ConnectTimeout=6 "$SSH_HOST" \
    '/venvs/apps_venv/bin/python -c "import importlib.metadata as m;print(m.version(\"reachy-mini-mirrorbuddy\"))"' \
    2>/dev/null | tr -d '\r' | head -1
}

store_version() {
  curl -sf -m 20 "$SPACE_URL" | sed -n 's/^version = "\(.*\)"/\1/p' | head -1
}

update_robot() {
  local want="$1" have="$2" job status state
  log "robot $have -> store $want: updating"

  curl -s -m 30 -X POST "$API/api/apps/stop-current-app" >/dev/null
  sleep "$((IDLE_SLEEP > 0 ? 4 : 0))"

  job="$(curl -s -m 300 -X POST "$API/api/apps/update/$APP" | json_field job_id)"
  if [ -z "$job" ]; then
    log "update refused: the daemon returned no job"
    return 1
  fi

  status=""
  for _ in $(seq 1 30); do
    status="$(curl -s -m 15 "$API/api/apps/job-status/$job" | json_field status)"
    case "$status" in done | completed | failed | error) break ;; esac
    sleep "$((IDLE_SLEEP > 0 ? 15 : 0))"
  done
  log "update job: ${status:-unknown}"

  curl -s -m 30 -X POST "$API/api/apps/start-app/$APP" >/dev/null
  sleep "$((IDLE_SLEEP > 0 ? 45 : 0))"

  state="$(curl -s -m 15 "$API/api/apps/current-app-status" | json_field state)"
  log "now $(installed_version), state=${state:-unknown}, settings=$(
    curl -s -m 8 -o /dev/null -w '%{http_code}' "$SETTINGS_URL"
  )"
  [ "$state" = "running" ]
}

one_pass() {
  local want have
  if ! robot_reachable; then
    return 0
  fi

  want="$(store_version)"
  have="$(installed_version)"
  if [ -z "$want" ] || [ -z "$have" ]; then
    log "version unknown (store='${want}', robot='${have}') — waiting"
    return 0
  fi
  if [ "$want" = "$have" ]; then
    return 0
  fi

  update_robot "$want" "$have"
}

if [ "$ONCE" = "1" ]; then
  one_pass
  exit 0
fi

while true; do
  one_pass
  sleep "$IDLE_SLEEP"
done
