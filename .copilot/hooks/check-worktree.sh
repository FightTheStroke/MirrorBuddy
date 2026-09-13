#!/usr/bin/env bash
set -euo pipefail

input="$(cat)"
tool="$(printf '%s' "$input" | jq -r '.toolName // ""')"
case "$tool" in
  apply_patch|edit|create|write|Edit|Write|MultiEdit) ;;
  *) exit 0 ;;
esac

root="$(cd "$(dirname "$0")/../.." && pwd)"
result="$(printf '%s' "$input" | bash "$root/.claude/hooks/main-guard.sh")"
if [ -n "$result" ]; then
  printf '%s' "$result" | jq '.hookSpecificOutput | {permissionDecision, permissionDecisionReason}'
fi
