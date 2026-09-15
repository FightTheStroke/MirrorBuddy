#!/usr/bin/env bash
# =============================================================================
# RELEASE BRUTAL - All checks, minimal output, issues file for AI
# Usage: ./scripts/release-brutal.sh [--json]
# Output: isolated per-run log directory, printed with the result.
# =============================================================================
set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"
# shellcheck source=lib/build-lock.sh
source "$(dirname "$0")/lib/build-lock.sh"

JSON_MODE=false
[ "${1:-}" = "--json" ] && JSON_MODE=true

umask 077
RUN_DIR=$(mktemp -d "${TMPDIR:-/tmp}/mirrorbuddy-release.XXXXXX")
RESULTS_FILE="$RUN_DIR/results"
ISSUES_FILE="$RUN_DIR/issues.md"
touch "$RESULTS_FILE"
trap 'rm -f "$RESULTS_FILE"' EXIT

TOTAL_FAILED=0
START=$(date +%s)

pass() { echo "$1:PASS" >>"$RESULTS_FILE"; }
fail() {
	echo "$1:FAIL" >>"$RESULTS_FILE"
	TOTAL_FAILED=$((TOTAL_FAILED + 1))
	echo "## $1" >>"$ISSUES_FILE"
	[ -n "${2:-}" ] && echo -e "$2\n" >>"$ISSUES_FILE"
}

echo "# Release Brutal - Issues to Fix" >"$ISSUES_FILE"
echo "Generated: $(date)" >>"$ISSUES_FILE"
echo "" >>"$ISSUES_FILE"

# =============================================================================
# PHASE 0: ENVIRONMENT VARIABLES CHECK
# =============================================================================
if [ -z "${DATABASE_URL:-}" ] && [ -z "${TEST_DATABASE_URL:-}" ] && [ ! -f ".env" ]; then
	fail "env-vars-db" "DATABASE_URL/TEST_DATABASE_URL not set and .env not found."
else
	pass "env-vars-db"
fi

if [ -z "${NODE_ENV:-}" ]; then
	fail "env-vars-node" "NODE_ENV is not set. Set NODE_ENV=test or NODE_ENV=production."
else
	pass "env-vars-node"
fi

if [ -z "${SUPABASE_CA_CERT:-}" ] && [ ! -f "config/supabase-chain.pem" ]; then
	fail "env-vars-ssl" "SUPABASE_CA_CERT not set and config/supabase-chain.pem not found."
else
	pass "env-vars-ssl"
fi

# =============================================================================
# PHASE 0.5: VERCEL/SENTRY CONFIGURATION CHECK
# =============================================================================
if command -v vercel &>/dev/null; then
	./scripts/verify-vercel-env.sh >"$RUN_DIR/vercel-env.log" 2>&1 && pass "vercel-env" || fail "vercel-env" "\`\`\`\n$(tail -20 "$RUN_DIR/vercel-env.log")\n\`\`\`"
else
	fail "vercel-env" "Vercel CLI missing: required metadata check cannot run."
fi

if [ ! -f "apps/web/vercel.json" ]; then
	fail "vercel-region" "apps/web/vercel.json not found"
elif rg -q '"regions"\s*:\s*\[[^]]*"fra1"' apps/web/vercel.json; then
	pass "vercel-region"
else
	fail "vercel-region" "apps/web/vercel.json must include EU pinning: \"regions\": [\"fra1\"]"
fi

./scripts/verify-sentry-config.sh >"$RUN_DIR/sentry-config.log" 2>&1 && pass "sentry-config" || fail "sentry-config" "\`\`\`\n$(tail -20 "$RUN_DIR/sentry-config.log")\n\`\`\`"

# =============================================================================
# PHASE 1: INSTANT CHECKS (uses shared lib)
# =============================================================================
exec_docs_exist
[ "$_EXIT" -eq 0 ] && pass "docs" || fail "docs" "$(cat "$_OUTPUT")"
rm -f "$_OUTPUT"

exec_hygiene
[ "$_EXIT" -eq 0 ] && pass "hygiene" || fail "hygiene" "\`\`\`\n$(cat "$_OUTPUT")\n\`\`\`"
rm -f "$_OUTPUT"

check_ts_rigor
if [ "$_EXIT" -eq 0 ]; then
	pass "ts-ignore"
	pass "any-type"
else
	fail "type-safety-inspection" "$(cat "$_OUTPUT")"
fi
rm -f "$_OUTPUT"

# =============================================================================
# PHASE 2: PARALLEL STATIC ANALYSIS
# =============================================================================
npm run lint >"$RUN_DIR/lint.log" 2>&1 &
PID_LINT=$!
npm run typecheck >"$RUN_DIR/typecheck.log" 2>&1 &
PID_TYPE=$!
pnpm audit --audit-level=high >"$RUN_DIR/audit.log" 2>&1 &
PID_AUDIT=$!

wait $PID_LINT && pass "lint" || fail "lint" "\`\`\`\n$(tail -20 "$RUN_DIR/lint.log")\n\`\`\`"
wait $PID_TYPE && pass "typecheck" || fail "typecheck" "\`\`\`\n$(grep -E 'error TS|Cannot find' "$RUN_DIR/typecheck.log" | head -10)\n\`\`\`"
wait $PID_AUDIT && pass "audit" || fail "audit" "\`\`\`\n$(tail -20 "$RUN_DIR/audit.log")\n\`\`\`"

# =============================================================================
# PHASE 3: BUILD
# =============================================================================
acquire_build_lock
npm run build >"$RUN_DIR/build.log" 2>&1 && pass "build" || fail "build" "\`\`\`\n$(grep -E 'Error:|error' "$RUN_DIR/build.log" | head -10)\n\`\`\`"
release_build_lock

# =============================================================================
# PHASE 4: TESTS
# =============================================================================
UNIT_EXIT=0
npm run test:coverage -- --reporter=dot --reporter=json --outputFile="$RUN_DIR/unit.json" >"$RUN_DIR/unit.log" 2>&1 || UNIT_EXIT=$?
[ "$UNIT_EXIT" -eq 0 ] && pass "unit" || fail "unit" "\`\`\`\n$(grep -E 'FAIL|Error|failed' "$RUN_DIR/unit.log" | head -10)\n\`\`\`"

npm run test >"$RUN_DIR/e2e.log" 2>&1
E2E_EXIT=$?
E2E_CLEAN=$(sed 's/\x1b\[[0-9;]*m//g; s/\x1b\[[0-9]*[A-Z]//g' "$RUN_DIR/e2e.log")
E2E_PASSED=$(echo "$E2E_CLEAN" | /usr/bin/grep -oE '[0-9]+ passed' | tail -1 | /usr/bin/grep -oE '[0-9]+')
E2E_FAILED=$(echo "$E2E_CLEAN" | /usr/bin/grep -oE '[0-9]+ failed' | tail -1 | /usr/bin/grep -oE '[0-9]+')
E2E_FAILED=${E2E_FAILED:-0}
E2E_PASSED=${E2E_PASSED:-0}
if [ "$E2E_EXIT" -eq 0 ] && [ "$E2E_PASSED" -gt 0 ] && [ "$E2E_FAILED" -eq 0 ] 2>/dev/null; then
	pass "e2e"
else
	FAILED_TESTS=$(echo "$E2E_CLEAN" | /usr/bin/grep -E "^\s+[0-9]+\)|Error:" | head -10)
	fail "e2e" "**Exit**: $E2E_EXIT, **Passed**: $E2E_PASSED, **Failed**: $E2E_FAILED\n\n\`\`\`\n$FAILED_TESTS\n\`\`\`"
fi

# =============================================================================
# PHASE 5: PERFORMANCE + FILE SIZE (uses shared lib)
# =============================================================================
exec_perf
[ "$_EXIT" -eq 0 ] && pass "perf" || fail "perf" "\`\`\`\n$(cat "$_OUTPUT")\n\`\`\`"
rm -f "$_OUTPUT"

exec_filesize
[ "$_EXIT" -eq 0 ] && pass "filesize" || fail "filesize" "\`\`\`\n$(cat "$_OUTPUT")\n\`\`\`"
rm -f "$_OUTPUT"

# =============================================================================
# PHASE 6: SECURITY
# =============================================================================
rg -q 'Content-Security-Policy' apps/web/src/proxy.ts && pass "csp" || fail "csp" "Missing CSP header in apps/web/src/proxy.ts"
rg -q 'csrf' apps/web/src/lib/auth/ && pass "csrf" || fail "csrf" "Missing CSRF protection in apps/web/src/lib/auth/"

DEBUG_UNSAFE=false
UNSAFE_ROUTE=""
if [ -d apps/web/src/app/api/debug ]; then
	for route in $(find apps/web/src/app/api/debug -name "route.ts"); do
		if ! /usr/bin/grep -q "NODE_ENV" "$route" 2>/dev/null; then
			DEBUG_UNSAFE=true
			UNSAFE_ROUTE="$route"
			break
		fi
	done
fi
$DEBUG_UNSAFE && fail "no-debug" "Unprotected: $UNSAFE_ROUTE" || pass "no-debug"
node scripts/check-rate-limit-evidence.mjs "$UNIT_EXIT" >"$RUN_DIR/rate-limit.log" 2>&1 <"$RUN_DIR/unit.json" &&
	pass "rate-limit" || fail "rate-limit" "$(cat "$RUN_DIR/rate-limit.log")"

# =============================================================================
# PHASE 7: COMPLIANCE
# =============================================================================
[ -f docs/compliance/DPIA.md ] && pass "dpia" || fail "dpia" "Missing docs/compliance/DPIA.md"
[ -f docs/compliance/AI-POLICY.md ] && pass "ai-policy" || fail "ai-policy" "Missing docs/compliance/AI-POLICY.md"
[ -f 'apps/web/src/app/[locale]/privacy/page.tsx' ] && pass "privacy-page" || fail "privacy-page" "Missing localized privacy page"
[ -f 'apps/web/src/app/[locale]/terms/page.tsx' ] && pass "terms-page" || fail "terms-page" "Missing localized terms page"

COMPLIANCE_DOCS_FAIL=false
COMPLIANCE_DOCS_MISSING=""
for doc in "INCIDENT-RESPONSE-PLAN.md" "PILOT-RESEARCH-PROTOCOL.md" "VPAT-ACCESSIBILITY-REPORT.md" "SOC2-ISO27001-ROADMAP.md" "AI-ACT-CONFORMITY-ASSESSMENT.md"; do
	if [ ! -f "docs/compliance/$doc" ]; then
		COMPLIANCE_DOCS_FAIL=true
		COMPLIANCE_DOCS_MISSING="$COMPLIANCE_DOCS_MISSING\n- docs/compliance/$doc"
	fi
done
$COMPLIANCE_DOCS_FAIL && fail "compliance-docs" "Missing compliance documentation:$COMPLIANCE_DOCS_MISSING" || pass "compliance-docs"

npm run i18n:check >"$RUN_DIR/i18n.log" 2>&1 && pass "i18n-completeness" || fail "i18n-completeness" "\`\`\`\n$(tail -10 "$RUN_DIR/i18n.log")\n\`\`\`"

./scripts/check-architecture-diagrams.sh >"$RUN_DIR/arch-diagrams.log" 2>&1 && pass "arch-diagrams" || fail "arch-diagrams" "\`\`\`\n$(/usr/bin/grep -E '✗|FAIL|MISSING' "$RUN_DIR/arch-diagrams.log" | head -10)\n\`\`\`"

./scripts/doc-code-audit.sh >"$RUN_DIR/doc-code-audit.log" 2>&1 && pass "doc-code-audit" || fail "doc-code-audit" "\`\`\`\n$(/usr/bin/grep -E '✗ FAIL' "$RUN_DIR/doc-code-audit.log" | head -10)\n\`\`\`"

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
# PHASE 9: COMPLIANCE GATE SUMMARY (F-04)
# =============================================================================
COMPLIANCE_CHECKS=$(grep "^compliance\|^i18n\|^dpia\|^ai-policy\|^privacy\|^terms" "$RESULTS_FILE" 2>/dev/null || echo "")
COMPLIANCE_PASS=$(echo "$COMPLIANCE_CHECKS" | /usr/bin/grep -c ":PASS$" 2>/dev/null || echo 0)
COMPLIANCE_TOTAL=$(echo "$COMPLIANCE_CHECKS" | /usr/bin/wc -l | tr -d ' ')
[ "$COMPLIANCE_TOTAL" -gt 0 ] && echo "## Compliance Gate Summary" >>"$ISSUES_FILE" && echo "Passed: $COMPLIANCE_PASS/$COMPLIANCE_TOTAL compliance checks" >>"$ISSUES_FILE" && echo "" >>"$ISSUES_FILE"

# =============================================================================
# OUTPUT
# =============================================================================
TOTAL=$(($(date +%s) - START))
TOTAL_CHECKS=$(cat "$RESULTS_FILE" | /usr/bin/wc -l | tr -d ' ')
STATUS="PASS"
[ "$TOTAL_FAILED" -gt 0 ] && STATUS="FAIL"

[ "$TOTAL_FAILED" -eq 0 ] && rm -f "$ISSUES_FILE"

if $JSON_MODE; then
	echo "{\"status\":\"$STATUS\",\"duration\":$TOTAL,\"checks\":$TOTAL_CHECKS,\"failed\":$TOTAL_FAILED,\"logs\":\"$RUN_DIR\"}"
else
	[ "$STATUS" = "PASS" ] && echo "✓ RELEASE BRUTAL PASS ($TOTAL_CHECKS checks, ${TOTAL}s)" || echo "✗ RELEASE BRUTAL FAIL ($TOTAL_FAILED/$TOTAL_CHECKS failed, ${TOTAL}s) → $ISSUES_FILE"
fi

[ "$TOTAL_FAILED" -gt 0 ] && exit 1
exit 0
