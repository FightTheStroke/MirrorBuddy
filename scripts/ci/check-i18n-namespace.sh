#!/usr/bin/env bash
# Checks that new i18n JSON files have their namespace registered in src/i18n/request.ts.
# Exit 1 if unregistered namespace found. Exit 0 otherwise.
set -euo pipefail

DIFF_BASE="${1:-origin/main}"
# The app moved to apps/web (#362) and this path did not follow it, so the
# grep below has been reading a file that does not exist: every new namespace
# was reported unregistered, correctly registered or not. The legacy location
# is still accepted so the check keeps working on older branches.
I18N_CONFIG="apps/web/src/i18n/request.ts"
[[ -f "$I18N_CONFIG" ]] || I18N_CONFIG="src/i18n/request.ts"

if [[ ! -f "$I18N_CONFIG" ]]; then
  echo "❌ Cannot find the i18n configuration (looked in apps/web/src and src)."
  exit 1
fi

ERRORS=0

new_json_files=$(git diff "$DIFF_BASE"... --name-only --diff-filter=A -- 'messages/*/*.json' 'apps/web/messages/*/*.json' 2>/dev/null || true)

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
