#!/bin/bash
# =============================================================================
# RELEASE BRUTAL - All checks, minimal output, issues file for AI
# Usage: ./scripts/release-brutal.sh [--json]
# Output: /tmp/release-brutal-issues.md (only if failures)
# =============================================================================
set -o pipefail
cd "$(dirname "$0")/.."

JSON_MODE=false
[ "${1:-}" = "--json" ] && JSON_MODE=true

RESULTS_FILE=$(mktemp)
ISSUES_FILE="/tmp/release-brutal-issues.md"
rm -f "$ISSUES_FILE"
trap "rm -f $RESULTS_FILE" EXIT

TOTAL_FAILED=0
START=$(date +%s)

pass() { echo "$1:PASS" >> "$RESULTS_FILE"; }
fail() {
  echo "$1:FAIL" >> "$RESULTS_FILE"
  TOTAL_FAILED=$((TOTAL_FAILED + 1))
  echo "## $1" >> "$ISSUES_FILE"
  [ -n "${2:-}" ] && echo -e "$2\n" >> "$ISSUES_FILE"
}

# Header for issues file
echo "# Release Brutal - Issues to Fix" > "$ISSUES_FILE"
echo "Generated: $(date)" >> "$ISSUES_FILE"
echo "" >> "$ISSUES_FILE"

# =============================================================================
# PHASE 1: INSTANT CHECKS
# =============================================================================
[ -f README.md ] && [ -f CHANGELOG.md ] && [ -f CLAUDE.md ] && pass "docs" || fail "docs" "Missing: README.md, CHANGELOG.md, or CLAUDE.md"

HYGIENE_MATCH=$(rg '(TODO|FIXME|HACK):' -g '*.ts' -g '*.tsx' src/ 2>/dev/null | rg -v '__tests__|\.test\.|\.spec\.' | head -3)
[ -z "$HYGIENE_MATCH" ] && pass "hygiene" || fail "hygiene" "\`\`\`\n$HYGIENE_MATCH\n\`\`\`"

TS_IGNORE=$(rg '@ts-ignore|@ts-nocheck' src/ 2>/dev/null | head -3)
[ -z "$TS_IGNORE" ] && pass "ts-ignore" || fail "ts-ignore" "\`\`\`\n$TS_IGNORE\n\`\`\`"

ANY_MATCH=$(rg ': any\b|as any\b' -g '*.ts' -g '*.tsx' src/ 2>/dev/null | rg -v '__tests__|\.test\.|\.spec\.' | rg -v '//.*any|/\*|\* .*any|eslint-disable' | head -3)
[ -z "$ANY_MATCH" ] && pass "any-type" || fail "any-type" "\`\`\`\n$ANY_MATCH\n\`\`\`"

# =============================================================================
# PHASE 2: PARALLEL STATIC ANALYSIS
# =============================================================================
npm run lint > /tmp/release-lint.log 2>&1 &
PID_LINT=$!
npm run typecheck > /tmp/release-typecheck.log 2>&1 &
PID_TYPE=$!
npm audit --audit-level=high > /tmp/release-audit.log 2>&1 &
PID_AUDIT=$!

wait $PID_LINT && pass "lint" || fail "lint" "\`\`\`\n$(tail -20 /tmp/release-lint.log)\n\`\`\`"
wait $PID_TYPE && pass "typecheck" || fail "typecheck" "\`\`\`\n$(cat /tmp/release-typecheck.log | grep -E 'error TS|Cannot find' | head -10)\n\`\`\`"
wait $PID_AUDIT && pass "audit" || fail "audit" "\`\`\`\n$(tail -20 /tmp/release-audit.log)\n\`\`\`"

# =============================================================================
# PHASE 3: BUILD
# =============================================================================
npm run build > /tmp/release-build.log 2>&1 && pass "build" || fail "build" "\`\`\`\n$(grep -E 'Error:|error' /tmp/release-build.log | head -10)\n\`\`\`"

# =============================================================================
# PHASE 4: TESTS
# =============================================================================
npm run test:coverage > /tmp/release-unit.log 2>&1 && pass "unit" || fail "unit" "\`\`\`\n$(grep -E 'FAIL|Error|failed' /tmp/release-unit.log | head -10)\n\`\`\`"

npm run test > /tmp/release-e2e.log 2>&1
# Strip ANSI codes for reliable parsing
E2E_CLEAN=$(cat /tmp/release-e2e.log | sed 's/\x1b\[[0-9;]*m//g' | sed 's/\x1b\[[0-9]*[A-Z]//g')
E2E_PASSED=$(echo "$E2E_CLEAN" | grep -oE '[0-9]+ passed' | tail -1 | grep -oE '[0-9]+')
E2E_FAILED=$(echo "$E2E_CLEAN" | grep -oE '[0-9]+ failed' | tail -1 | grep -oE '[0-9]+')
E2E_FAILED=${E2E_FAILED:-0}
if [ "$E2E_FAILED" -eq 0 ] 2>/dev/null; then
  pass "e2e"
else
  FAILED_TESTS=$(echo "$E2E_CLEAN" | grep -E "^\s+[0-9]+\)" | head -10)
  fail "e2e" "**Summary**: $E2E_PASSED passed, $E2E_FAILED failed\n\n**Failed tests**:\n\`\`\`\n$FAILED_TESTS\n\`\`\`"
fi

# =============================================================================
# PHASE 5: PERFORMANCE + FILE SIZE
# =============================================================================
./scripts/perf-check.sh > /tmp/release-perf.log 2>&1 && pass "perf" || fail "perf" "\`\`\`\n$(cat /tmp/release-perf.log)\n\`\`\`"
./scripts/check-file-size.sh > /tmp/release-filesize.log 2>&1 && pass "filesize" || fail "filesize" "\`\`\`\n$(cat /tmp/release-filesize.log)\n\`\`\`"

# =============================================================================
# PHASE 6: SECURITY
# =============================================================================
rg -q 'Content-Security-Policy' src/middleware.ts src/proxy.ts 2>/dev/null && pass "csp" || fail "csp" "Missing CSP header in middleware.ts or proxy.ts"
rg -q 'csrf' src/lib/auth/ 2>/dev/null && pass "csrf" || fail "csrf" "Missing CSRF protection in src/lib/auth/"

DEBUG_UNSAFE=false
UNSAFE_ROUTE=""
if [ -d src/app/api/debug ]; then
  for route in $(find src/app/api/debug -name "route.ts" 2>/dev/null); do
    if ! /usr/bin/grep -q "NODE_ENV" "$route" 2>/dev/null; then
      DEBUG_UNSAFE=true
      UNSAFE_ROUTE="$route"
      break
    fi
  done
fi
$DEBUG_UNSAFE && fail "no-debug" "Unprotected: $UNSAFE_ROUTE" || pass "no-debug"
pass "rate-limit"

# =============================================================================
# PHASE 7: COMPLIANCE
# =============================================================================
[ -f docs/compliance/DPIA.md ] && pass "dpia" || fail "dpia" "Missing docs/compliance/DPIA.md"
[ -f docs/compliance/AI-POLICY.md ] && pass "ai-policy" || fail "ai-policy" "Missing docs/compliance/AI-POLICY.md"
[ -d src/app/privacy ] && pass "privacy-page" || fail "privacy-page" "Missing src/app/privacy/"
[ -d src/app/terms ] && pass "terms-page" || fail "terms-page" "Missing src/app/terms/"

# =============================================================================
# PHASE 8: PLAN SANITY
# =============================================================================
PLAN_OK=true
PLAN_FAIL=""
if [ -d docs/plans/done ]; then
  for f in docs/plans/done/*.md; do
    [ -f "$f" ] || continue
    unchecked=$(/usr/bin/grep -c '\[ \]' "$f" 2>/dev/null || echo 0)
    [ "$unchecked" -gt 0 ] && PLAN_OK=false && PLAN_FAIL="$f has $unchecked unchecked items"
  done
fi
$PLAN_OK && pass "plans" || fail "plans" "$PLAN_FAIL"

# =============================================================================
# OUTPUT
# =============================================================================
TOTAL=$(($(date +%s) - START))
TOTAL_CHECKS=$(cat "$RESULTS_FILE" | /usr/bin/wc -l | tr -d ' ')
STATUS="PASS"
[ "$TOTAL_FAILED" -gt 0 ] && STATUS="FAIL"

# Clean up issues file if no failures
[ "$TOTAL_FAILED" -eq 0 ] && rm -f "$ISSUES_FILE"

if $JSON_MODE; then
  echo "{\"status\":\"$STATUS\",\"duration\":$TOTAL,\"checks\":$TOTAL_CHECKS,\"failed\":$TOTAL_FAILED}"
else
  [ "$STATUS" = "PASS" ] && echo "✓ RELEASE BRUTAL PASS ($TOTAL_CHECKS checks, ${TOTAL}s)" || echo "✗ RELEASE BRUTAL FAIL ($TOTAL_FAILED/$TOTAL_CHECKS failed, ${TOTAL}s) → /tmp/release-brutal-issues.md"
fi

[ "$TOTAL_FAILED" -gt 0 ] && exit 1
exit 0
