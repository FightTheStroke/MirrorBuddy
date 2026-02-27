#!/usr/bin/env bash
# Checks that new i18n JSON files have their namespace registered in src/i18n/request.ts.
# Exit 1 if unregistered namespace found. Exit 0 otherwise.
set -euo pipefail

DIFF_BASE="${1:-origin/main}"
I18N_CONFIG="src/i18n/request.ts"
ERRORS=0

new_json_files=$(git diff "$DIFF_BASE"... --name-only --diff-filter=A -- 'messages/*/*.json' 2>/dev/null || true)

if [[ -z "$new_json_files" ]]; then
  echo "✅ No new i18n JSON files detected."
  exit 0
fi

for f in $new_json_files; do
  ns=$(basename "$f" .json)
  if ! grep -q "'$ns'" "$I18N_CONFIG" 2>/dev/null; then
    echo "❌ Namespace '$ns' (from $f) is NOT registered in $I18N_CONFIG"
    ERRORS=$((ERRORS + 1))
  fi
done

if [[ "$ERRORS" -gt 0 ]]; then
  echo ""
  echo "   Add missing namespace(s) to the NAMESPACES array in $I18N_CONFIG"
  exit 1
fi

echo "✅ All new i18n namespaces are registered."
exit 0
