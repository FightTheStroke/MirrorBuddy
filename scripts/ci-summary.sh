#!/usr/bin/env bash
set -euo pipefail

# ci-summary.sh - Compact CI diagnostics for token-efficient log reading
# Runs lint, typecheck, build (optionally unit tests) and outputs ONLY
# errors/warnings in a compact summary. Designed to be read by Claude
# instead of full verbose logs.
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

# Colors (only if terminal supports it)
if [[ -t 1 ]]; then
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'
  BOLD='\033[1m'; NC='\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; BOLD=''; NC=''
fi

MODE="${1:---default}"
TOTAL_ERRORS=0
TOTAL_WARNINGS=0
SUMMARY=""

# --- Helper functions ---

add_summary() {
  local step="$1" status="$2" errors="$3" details="$4"
  if [[ "$status" == "PASS" ]]; then
    SUMMARY+="${GREEN}PASS${NC} ${step}"
  elif [[ "$status" == "WARN" ]]; then
    SUMMARY+="${YELLOW}WARN${NC} ${step} (${errors} warnings)"
  else
    SUMMARY+="${RED}FAIL${NC} ${step} (${errors} errors)"
  fi
  SUMMARY+=$'\n'
  if [[ -n "$details" ]]; then
    SUMMARY+="$details"$'\n'
  fi
}

run_lint() {
  echo -e "${BOLD}[1/4] Lint${NC}"
  local tmpfile
  tmpfile=$(mktemp)

  if npm run lint 2>&1 | tee "$tmpfile" | tail -1 > /dev/null 2>&1; then
    local warn_count
    warn_count=$(grep -c "warning" "$tmpfile" 2>/dev/null || echo "0")
    if [[ "$warn_count" -gt 0 ]]; then
      local details
      details=$(grep -E "warning|error" "$tmpfile" | head -20)
      TOTAL_WARNINGS=$((TOTAL_WARNINGS + warn_count))
      add_summary "Lint" "WARN" "$warn_count" "$details"
    else
      add_summary "Lint" "PASS" "0" ""
    fi
  else
    local err_count details
    err_count=$(grep -c "error" "$tmpfile" 2>/dev/null || echo "?")
    details=$(grep -E "error|warning" "$tmpfile" | head -30)
    TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
    add_summary "Lint" "FAIL" "$err_count" "$details"
  fi
  rm -f "$tmpfile"
}

run_typecheck() {
  echo -e "${BOLD}[2/4] Typecheck${NC}"
  local tmpfile
  tmpfile=$(mktemp)

  if npm run typecheck 2>&1 > "$tmpfile"; then
    add_summary "Typecheck" "PASS" "0" ""
  else
    local err_count details
    err_count=$(grep -c "error TS" "$tmpfile" 2>/dev/null || echo "?")
    # Show unique error codes + first occurrence
    details=$(grep "error TS" "$tmpfile" | \
      sed 's/.*\(error TS[0-9]*\)/\1/' | \
      sort | uniq -c | sort -rn | head -15)
    TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
    add_summary "Typecheck" "FAIL" "$err_count" "$details"
  fi
  rm -f "$tmpfile"
}

run_build() {
  echo -e "${BOLD}[3/4] Build${NC}"
  local tmpfile
  tmpfile=$(mktemp)

  if npm run build 2>&1 > "$tmpfile"; then
    local warn_count
    warn_count=$(grep -ci "warn" "$tmpfile" 2>/dev/null || echo "0")
    if [[ "$warn_count" -gt 0 ]]; then
      local details
      details=$(grep -i "warn" "$tmpfile" | head -10)
      TOTAL_WARNINGS=$((TOTAL_WARNINGS + warn_count))
      add_summary "Build" "WARN" "$warn_count" "$details"
    else
      add_summary "Build" "PASS" "0" ""
    fi
  else
    local details
    details=$(grep -iE "error|failed|Error:" "$tmpfile" | head -20)
    TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
    add_summary "Build" "FAIL" "?" "$details"
  fi
  rm -f "$tmpfile"
}

run_unit() {
  echo -e "${BOLD}[4/4] Unit tests${NC}"
  local tmpfile
  tmpfile=$(mktemp)

  if npm run test:unit 2>&1 > "$tmpfile"; then
    local pass_line
    pass_line=$(grep -E "Tests.*passed|Test Files" "$tmpfile" | tail -1)
    add_summary "Unit tests" "PASS" "0" "$pass_line"
  else
    local details
    details=$(grep -E "FAIL|✗|AssertionError|Error|×" "$tmpfile" | head -20)
    TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
    add_summary "Unit tests" "FAIL" "?" "$details"
  fi
  rm -f "$tmpfile"
}

run_i18n() {
  echo -e "${BOLD}[i18n] Check${NC}"
  local tmpfile
  tmpfile=$(mktemp)

  if npm run i18n:check 2>&1 > "$tmpfile"; then
    add_summary "i18n check" "PASS" "0" ""
  else
    local details
    details=$(grep -iE "missing|error|mismatch|warn" "$tmpfile" | head -20)
    TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
    add_summary "i18n check" "FAIL" "?" "$details"
  fi
  rm -f "$tmpfile"
}

# --- Main ---

echo -e "${BOLD}=== CI Summary ===${NC}"
echo ""

case "$MODE" in
  --lint)   run_lint ;;
  --types)  run_typecheck ;;
  --build)  run_build ;;
  --unit)   run_unit ;;
  --i18n)   run_i18n ;;
  --full)   run_lint; run_typecheck; run_build; run_unit ;;
  *)        run_lint; run_typecheck; run_build ;;
esac

echo ""
echo -e "${BOLD}=== Results ===${NC}"
echo -e "$SUMMARY"

if [[ "$TOTAL_ERRORS" -gt 0 ]]; then
  echo -e "${RED}${BOLD}BLOCKED: ${TOTAL_ERRORS} step(s) failed${NC}"
  exit 1
elif [[ "$TOTAL_WARNINGS" -gt 0 ]]; then
  echo -e "${YELLOW}${BOLD}OK with ${TOTAL_WARNINGS} warning(s)${NC}"
  exit 0
else
  echo -e "${GREEN}${BOLD}ALL CLEAN${NC}"
  exit 0
fi
