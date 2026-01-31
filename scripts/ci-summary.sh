#!/usr/bin/env bash
set -euo pipefail

# ci-summary.sh - Compact CI diagnostics (token-efficient)
# ALL output captured silently. Only structured summary printed.
# Target: ~10-30 lines output regardless of codebase size.
#
# Usage:
#   ./scripts/ci-summary.sh          # lint + typecheck + build
#   ./scripts/ci-summary.sh --full   # + unit tests
#   ./scripts/ci-summary.sh --lint   # lint only
#   ./scripts/ci-summary.sh --types  # typecheck only
#   ./scripts/ci-summary.sh --build  # build only
#   ./scripts/ci-summary.sh --unit   # unit tests only
#   ./scripts/ci-summary.sh --i18n   # i18n check only

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

MODE="${1:---default}"
ERRORS=0
WARNINGS=0
RESULTS=""

strip_ansi() { perl -pe 's/\e\[[0-9;]*m//g' "$1"; }

result() { RESULTS+="$1"$'\n'; }

# Append indented detail lines from a variable (avoids subshell pipe issue)
result_details() {
  local details="$1"
  if [[ -n "$details" ]]; then
    while IFS= read -r line; do result "  $line"; done <<< "$details"
  fi
}

run_lint() {
  local tmp; tmp=$(mktemp)
  if npm run lint > "$tmp" 2>&1; then
    local wc; wc=$(strip_ansi "$tmp" | grep -c " warning " || true)
    if [[ "$wc" -gt 0 ]]; then
      WARNINGS=$((WARNINGS + wc))
      result "[WARN] Lint ($wc warnings)"
      local d; d=$(strip_ansi "$tmp" | grep " warning " | \
        sed 's/.*warning  //' | sort | uniq -c | sort -rn | head -5)
      result_details "$d"
    else
      result "[PASS] Lint"
    fi
  else
    local ec; ec=$(strip_ansi "$tmp" | grep -c " error " || true)
    ERRORS=$((ERRORS + 1))
    result "[FAIL] Lint ($ec errors)"
    local d; d=$(strip_ansi "$tmp" | grep " error " | head -10)
    result_details "$d"
  fi
  rm -f "$tmp"
}

run_typecheck() {
  local tmp; tmp=$(mktemp)
  if npm run typecheck > "$tmp" 2>&1; then
    result "[PASS] Typecheck"
  else
    local ec; ec=$(strip_ansi "$tmp" | grep -c "error TS" || true)
    ERRORS=$((ERRORS + 1))
    result "[FAIL] Typecheck ($ec errors)"
    local d; d=$(strip_ansi "$tmp" | grep "error TS" | \
      sed 's/.*\(error TS[0-9]*:.*\)/\1/' | sort | uniq -c | sort -rn | head -10)
    result_details "$d"
  fi
  rm -f "$tmp"
}

run_build() {
  local tmp; tmp=$(mktemp)
  if npm run build > "$tmp" 2>&1; then
    local wc; wc=$(strip_ansi "$tmp" | grep -ciE "^warn" || true)
    if [[ "$wc" -gt 0 ]]; then
      WARNINGS=$((WARNINGS + wc))
      result "[WARN] Build ($wc warnings)"
      local d; d=$(strip_ansi "$tmp" | grep -iE "^warn" | head -5)
      result_details "$d"
    else
      result "[PASS] Build"
    fi
  else
    ERRORS=$((ERRORS + 1))
    result "[FAIL] Build"
    local d; d=$(strip_ansi "$tmp" | \
      grep -iE "^error|Error:|Type error|Module not found" | head -10)
    result_details "$d"
  fi
  rm -f "$tmp"
}

run_unit() {
  local tmp; tmp=$(mktemp)
  if npm run test:unit > "$tmp" 2>&1; then
    local s; s=$(strip_ansi "$tmp" | grep -E "Test(s| Files).*passed" | tail -1)
    result "[PASS] Unit${s:+ ($s)}"
  else
    ERRORS=$((ERRORS + 1))
    local fc; fc=$(strip_ansi "$tmp" | grep -cE "^ *(FAIL|×)" || true)
    result "[FAIL] Unit ($fc failures)"
    # Only actual failures - skip act() warnings, HTMLMediaElement noise
    local d; d=$(strip_ansi "$tmp" | \
      grep -E "^ *FAIL |^ *× |AssertionError|Expected.*Received" | \
      grep -v "act()" | grep -v "HTMLMediaElement" | head -15)
    result_details "$d"
  fi
  rm -f "$tmp"
}

run_i18n() {
  local tmp; tmp=$(mktemp)
  if npm run i18n:check > "$tmp" 2>&1; then
    result "[PASS] i18n"
  else
    ERRORS=$((ERRORS + 1))
    result "[FAIL] i18n"
    local d; d=$(strip_ansi "$tmp" | grep -iE "missing|mismatch|error" | head -10)
    result_details "$d"
  fi
  rm -f "$tmp"
}

# --- Main ---
echo "=== CI Summary ==="

case "$MODE" in
  --lint)   run_lint ;;
  --types)  run_typecheck ;;
  --build)  run_build ;;
  --unit)   run_unit ;;
  --i18n)   run_i18n ;;
  --full)   run_lint; run_typecheck; run_build; run_unit ;;
  *)        run_lint; run_typecheck; run_build ;;
esac

echo "$RESULTS"
if [[ "$ERRORS" -gt 0 ]]; then
  echo "BLOCKED: $ERRORS step(s) failed"; exit 1
elif [[ "$WARNINGS" -gt 0 ]]; then
  echo "OK with $WARNINGS warning(s)"; exit 0
else
  echo "ALL CLEAN"; exit 0
fi
