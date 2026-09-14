#!/usr/bin/env bash
set -euo pipefail

input="$(cat)"
tool="$(printf '%s' "$input" | jq -r '.toolName // ""')"
case "$tool" in
  apply_patch|edit|create|write|Edit|Write|MultiEdit) ;;
  *) exit 0 ;;
esac

root="$(cd "$(dirname "$0")/../.." && pwd)"
path="$(printf '%s' "$input" | bash "$root/.claude/hooks/read-edit-path.sh")"
case "$path" in
  *.ts|*.tsx|*.js|*.jsx|*.sh) ;;
  *) exit 0 ;;
esac
if [ -f "$path" ]; then
  lines="$(awk 'END {print NR}' "$path")"
  if [ "$lines" -gt 250 ]; then
    printf 'Line limit exceeded: %s has %s lines (maximum 250).\n' "$path" "$lines" >&2
    exit 1
  fi
fi
