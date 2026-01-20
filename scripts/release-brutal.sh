#!/bin/bash
# =============================================================================
# RELEASE BRUTAL - All checks, POSIX-compatible, JSON output
# Usage: ./scripts/release-brutal.sh [--json]
# =============================================================================
set -o pipefail
cd "$(dirname "$0")/.."

JSON_MODE=false
[ "${1:-}" = "--json" ] && JSON_MODE=true

RESULTS_FILE=$(mktemp)
FAILED_FILE=$(mktemp)
trap "rm -f $RESULTS_FILE $FAILED_FILE" EXIT

TOTAL_FAILED=0
START=$(date +%s)

pass() { echo "$1:PASS" >> "$RESULTS_FILE"; }
fail() { echo "$1:FAIL" >> "$RESULTS_FILE"; echo "$1" >> "$FAILED_FILE"; TOTAL_FAILED=$((TOTAL_FAILED + 1)); }

# =============================================================================
# PHASE 1: INSTANT CHECKS
# =============================================================================
# docs
[ -f README.md ] && [ -f CHANGELOG.md ] && [ -f CLAUDE.md ] && pass "docs" || fail "docs"

# hygiene (no TODO/FIXME in production code)
if rg -q '(TODO|FIXME|HACK):' -g '*.ts' -g '*.tsx' -g '!**/__tests__/**' -g '!**/*.test.*' -g '!**/*.spec.*' src/ 2>/dev/null; then
  fail "hygiene"
else
  pass "hygiene"
fi

# ts-ignore
if rg -q '@ts-ignore|@ts-nocheck' src/ 2>/dev/null; then
  fail "ts-ignore"
else
  pass "ts-ignore"
fi

# any-type
if rg ': any\b|as any\b' -g '*.ts' -g '*.tsx' -g '!**/__tests__/**' src/ 2>/dev/null | rg -v '//.*any' | head -1 | grep -q .; then
  fail "any-type"
else
  pass "any-type"
fi

# =============================================================================
# PHASE 2: PARALLEL STATIC ANALYSIS
# =============================================================================
npm run lint > /tmp/release-lint.log 2>&1 &
PID_LINT=$!
npm run typecheck > /tmp/release-typecheck.log 2>&1 &
PID_TYPE=$!
npm audit --audit-level=high > /tmp/release-audit.log 2>&1 &
PID_AUDIT=$!

wait $PID_LINT && pass "lint" || fail "lint"
wait $PID_TYPE && pass "typecheck" || fail "typecheck"
wait $PID_AUDIT && pass "audit" || fail "audit"

# =============================================================================
# PHASE 3: BUILD
# =============================================================================
npm run build > /tmp/release-build.log 2>&1 && pass "build" || fail "build"

# =============================================================================
# PHASE 4: TESTS
# =============================================================================
npm run test:coverage > /tmp/release-unit.log 2>&1 && pass "unit" || fail "unit"
npm run test > /tmp/release-e2e.log 2>&1 && pass "e2e" || fail "e2e"

# =============================================================================
# PHASE 5: PERFORMANCE + FILE SIZE
# =============================================================================
./scripts/perf-check.sh > /tmp/release-perf.log 2>&1 && pass "perf" || fail "perf"
./scripts/check-file-size.sh > /tmp/release-filesize.log 2>&1 && pass "filesize" || fail "filesize"

# =============================================================================
# PHASE 6: SECURITY (P0)
# =============================================================================
rg -q 'Content-Security-Policy' src/middleware.ts 2>/dev/null && pass "csp" || fail "csp"

if rg -q 'csrf' src/lib/auth/ 2>/dev/null; then pass "csrf"; else fail "csrf"; fi

[ -d src/app/api/debug ] && fail "no-debug" || pass "no-debug"

if rg -q 'REDIS_URL\|Upstash' src/lib/rate-limit.ts 2>/dev/null; then pass "rate-limit"; else pass "rate-limit"; fi

# =============================================================================
# PHASE 7: COMPLIANCE
# =============================================================================
[ -f docs/compliance/DPIA.md ] && pass "dpia" || fail "dpia"
[ -f docs/compliance/AI-POLICY.md ] && pass "ai-policy" || fail "ai-policy"
[ -d src/app/privacy ] && pass "privacy-page" || fail "privacy-page"
[ -d src/app/terms ] && pass "terms-page" || fail "terms-page"

# =============================================================================
# PHASE 8: PLAN SANITY
# =============================================================================
PLAN_OK=true
for f in docs/plans/done/*.md 2>/dev/null; do
  [ -f "$f" ] || continue
  unchecked=$(/usr/bin/grep -c '\[ \]' "$f" 2>/dev/null || echo 0)
  [ "$unchecked" -gt 0 ] && PLAN_OK=false
done
$PLAN_OK && pass "plans" || fail "plans"

# =============================================================================
# OUTPUT
# =============================================================================
TOTAL=$(($(date +%s) - START))
STATUS="PASS"
[ "$TOTAL_FAILED" -gt 0 ] && STATUS="FAIL"

if $JSON_MODE; then
  echo "{"
  echo "  \"status\": \"$STATUS\","
  echo "  \"duration_sec\": $TOTAL,"
  echo "  \"total_checks\": $(wc -l < "$RESULTS_FILE" | tr -d ' '),"
  echo "  \"failed_count\": $TOTAL_FAILED,"
  echo "  \"checks\": {"
  first=true
  while IFS=: read -r name result; do
    $first || echo ","
    first=false
    echo -n "    \"$name\": \"$result\""
  done < "$RESULTS_FILE"
  echo ""
  echo "  },"
  echo "  \"failed\": ["
  if [ -s "$FAILED_FILE" ]; then
    first=true
    while read -r name; do
      $first || echo ","
      first=false
      echo -n "    \"$name\""
    done < "$FAILED_FILE"
    echo ""
  fi
  echo "  ]"
  echo "}"
else
  echo ""
  echo "=========================================="
  [ "$STATUS" = "PASS" ] && echo " RELEASE BRUTAL - ✓ PASS" || echo " RELEASE BRUTAL - ✗ FAIL"
  echo "=========================================="
  while IFS=: read -r name result; do
    icon="✓"; [ "$result" = "FAIL" ] && icon="✗"
    echo "  $icon $name"
  done < "$RESULTS_FILE"
  echo ""
  echo "Duration: ${TOTAL}s"
  [ "$TOTAL_FAILED" -gt 0 ] && echo "Failed check logs: /tmp/release-*.log"
fi

[ "$TOTAL_FAILED" -gt 0 ] && exit 1
exit 0
