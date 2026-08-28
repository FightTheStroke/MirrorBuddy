#!/usr/bin/env bash
# Is this robot healthy, current, and still connected to the app store?
#
# Written after an incident where a robot ran three-versions-old code for weeks.
# Nothing was broken enough to notice: the app worked, it just quietly stopped
# receiving updates because its Hugging Face login had expired, so the store
# looked empty and no update was ever offered.
#
# Run it against a robot on the same network:
#     ./robot/tools/robot-doctor.sh                 # reachy-mini.local
#     ./robot/tools/robot-doctor.sh 192.168.1.42
#
# Exit code is non-zero when something needs a human.

set -uo pipefail

HOST="${1:-reachy-mini.local}"
API="http://${HOST}:8000"
SPACE="${2:-Roberdan/mirrorbuddy}"
APP="reachy_mini_mirrorbuddy"
PROBLEMS=0

say() { printf '  %s\n' "$1"; }
bad() {
  printf '  ✗ %s\n' "$1"
  PROBLEMS=$((PROBLEMS + 1))
}

echo "MirrorBuddy robot check — $HOST"

if ! curl -sf -m 8 "$API/api/daemon/status" >/dev/null 2>&1; then
  bad "The robot did not answer at $API. Is it on, and on this network?"
  exit 1
fi
say "✓ The robot is on and answering."

STATE="$(curl -sf -m 8 "$API/api/apps/current-app-status" |
  sed -n 's/.*"state":"\([a-z]*\)".*/\1/p')"
RUNNING_APP="$(curl -sf -m 8 "$API/api/apps/current-app-status" |
  sed -n 's/.*"name":"\([a-z_]*\)".*/\1/p')"
if [ "$RUNNING_APP" = "$APP" ] && [ "$STATE" = "running" ]; then
  say "✓ MirrorBuddy is running."
else
  bad "MirrorBuddy is not running (app='${RUNNING_APP:-none}', state='${STATE:-unknown}')."
fi

# The one that bit us: an expired login makes the store look empty, for ever, silently.
LOGGED_IN="$(curl -sf -m 8 "$API/api/hf-auth/status" |
  sed -n 's/.*"is_logged_in":\([a-z]*\).*/\1/p')"
STORE_COUNT="$(curl -sf -m 45 "$API/api/apps/list-available/hf_space" | grep -o '"name"' | wc -l | tr -d ' ')"
if [ "${STORE_COUNT:-0}" -gt 0 ]; then
  say "✓ The app store is reachable ($STORE_COUNT apps visible, logged in: ${LOGGED_IN:-unknown})."
else
  bad "The app store looks empty — the robot's Hugging Face login has probably expired."
  say "  Fix: open the robot dashboard and sign in to Hugging Face again."
fi

# Installed from the store, or from a folder someone copied once? Only the first
# kind is ever offered an update.
UPDATES="$(curl -sf -m 60 "$API/api/apps/check-updates")"
CHECKED="$(printf '%s' "$UPDATES" | sed -n 's/.*"apps_checked":\([0-9]*\).*/\1/p')"
if printf '%s' "$UPDATES" | grep -q "$APP"; then
  if printf '%s' "$UPDATES" | grep -q '"update_available":true'; then
    bad "A newer MirrorBuddy is published and this robot has not taken it."
    say "  Fix: update the app from the robot dashboard."
  else
    say "✓ MirrorBuddy is tracked for updates and is current."
  fi
elif [ "${CHECKED:-0}" -gt 0 ]; then
  say "✓ MirrorBuddy is tracked for updates and is current."
else
  bad "MirrorBuddy is not tracked for updates — it was installed from a folder, not the store."
  say "  Fix: remove it from the dashboard and install it from the store instead."
fi

PUBLISHED="$(curl -sf -m 30 "https://huggingface.co/spaces/$SPACE/raw/main/pyproject.toml" 2>/dev/null |
  sed -n 's/^version = "\(.*\)"/\1/p' | head -1)"
say "  Version in the app store: ${PUBLISHED:-not published}"

echo
if [ "$PROBLEMS" -eq 0 ]; then
  echo "✓ Nothing to do — this robot is current and will stay current."
  exit 0
fi
echo "✗ $PROBLEMS thing(s) need a human. See the fixes above."
exit 1
