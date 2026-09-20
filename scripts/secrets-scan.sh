#!/usr/bin/env bash
# =============================================================================
# SECRETS SCAN - Detect sensitive data committed to repository
# Usage: ./scripts/secrets-scan.sh [--fix] [--json] [--strict]
# Part of: app-release-manager hardening checks
#
# Modes:
#   default  - Production-safe checks (ignores known-safe patterns)
#   --strict - All patterns, includes warnings
#
# Exit codes:
#   0 - no blocking findings
#   1 - findings (critical, or any issue under --strict)
#   2 - the scan could not be performed (fail closed)
#
# Requires ripgrep (rg) built with PCRE2; see SETUP.md prerequisites.
# Reports list categories and file locations only, never matched values.
# =============================================================================
set -uo pipefail
cd "$(dirname "$0")/.."

FIX_MODE=false
JSON_MODE=false
STRICT_MODE=false
for arg in "$@"; do
	[ "$arg" = "--fix" ] && FIX_MODE=true
	[ "$arg" = "--json" ] && JSON_MODE=true
	[ "$arg" = "--strict" ] && STRICT_MODE=true
done

CRITICAL_ISSUES=0
WARNING_ISSUES=0
CRITICAL_BLOCKS=()
WARNING_BLOCKS=()
CRITICAL_CATEGORIES=()
REPORT_FILE=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Fail closed: the scan could not be trusted, so never report a pass.
fatal() {
	[ -n "$REPORT_FILE" ] && rm -f "$REPORT_FILE"
	echo "secrets-scan: $1" >&2
	echo "secrets-scan: scan aborted; no pass is implied" >&2
	exit 2
}

command -v rg >/dev/null 2>&1 || fatal "ripgrep (rg) is required but was not found on PATH"

REPORT_FILE=$(mktemp "${TMPDIR:-/tmp}/secrets-scan-report.XXXXXX") || fatal "could not create a private report file"
chmod 600 "$REPORT_FILE" || fatal "could not restrict the report file permissions"

# Scan roots: monorepo layout. Missing optional roots are skipped, never scanned
# blindly, because a non-existent path makes ripgrep exit with an error.
CODE_ROOTS=()
for candidate in apps/web/src packages/*/src; do
	[ -d "$candidate" ] && CODE_ROOTS+=("$candidate")
done
[ ${#CODE_ROOTS[@]} -eq 0 ] && fatal "no application source root found (expected apps/web/src)"
SCRIPT_ROOTS=()
[ -d scripts ] && SCRIPT_ROOTS+=(scripts)
E2E_ROOTS=()
[ -d apps/web/e2e ] && E2E_ROOTS+=(apps/web/e2e)
LIB_ROOTS=()
for candidate in apps/web/src/lib apps/web/src/app/api; do
	[ -d "$candidate" ] && LIB_ROOTS+=("$candidate")
done

ALL_ROOTS=("${CODE_ROOTS[@]}")
[ ${#SCRIPT_ROOTS[@]} -gt 0 ] && ALL_ROOTS+=("${SCRIPT_ROOTS[@]}")
[ ${#E2E_ROOTS[@]} -gt 0 ] && ALL_ROOTS+=("${E2E_ROOTS[@]}")
TEST_ROOTS=("${CODE_ROOTS[@]}")
[ ${#E2E_ROOTS[@]} -gt 0 ] && TEST_ROOTS+=("${E2E_ROOTS[@]}")

COMMON_EXCLUDES=(-g '!.env.example' -g '!*.md' -g '!node_modules/**' -g '!.next/**' -g '!secrets-scan.sh')

# List matching FILES only (-l): raw matching lines are never materialised, so no
# secret value can reach stdout, stderr or the report. No pipe, so no SIGPIPE.
MATCHES=""
search() {
	local pattern="$1"
	shift
	local status
	MATCHES=$(rg -l -e "$pattern" "$@" 2>/dev/null)
	status=$?
	[ "$status" -gt 1 ] && fatal "pattern evaluation failed (ripgrep exit $status)"
	[ "$status" -eq 1 ] && MATCHES=""
	return 0
}

add_finding() {
	local severity="$1" category="$2" description="$3" files="$4"
	local locations="" count=0 file
	while IFS= read -r file; do
		[ -z "$file" ] && continue
		count=$((count + 1))
		[ "$count" -le 3 ] && locations="$locations- $file"$'\n'
	done <<<"$files"
	[ "$count" -gt 3 ] && locations="$locations- ... and $((count - 3)) more file(s)"$'\n'
	local block="## $category"$'\n'"**Issue**: $description"$'\n'"**Files**:"$'\n'"$locations"
	if [ "$severity" = critical ]; then
		CRITICAL_BLOCKS+=("$block")
		CRITICAL_CATEGORIES+=("$category")
		CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
	else
		WARNING_BLOCKS+=("$block")
		WARNING_ISSUES=$((WARNING_ISSUES + 1))
	fi
}

scan_category() {
	local severity="$1" category="$2" description="$3" pattern="$4"
	shift 4
	search "$pattern" "$@"
	[ -n "$MATCHES" ] && add_finding "$severity" "$category" "$description" "$MATCHES"
	return 0
}

# =============================================================================
# CRITICAL: These BLOCK release
# =============================================================================
echo -n "Scanning for API keys..."
scan_category critical "Resend API Key" "Real Resend API key detected" \
	're_[a-zA-Z0-9]{20,}' "${COMMON_EXCLUDES[@]}" "${ALL_ROOTS[@]}"
scan_category critical "Sentry DSN" "Real Sentry DSN with key detected" \
	'https://[a-f0-9]{32}@[a-z0-9-]+\.ingest\.' "${COMMON_EXCLUDES[@]}" "${ALL_ROOTS[@]}"
scan_category critical "Vercel IDs" "Real Vercel project/team ID in code" \
	'(prj_|team_)[a-zA-Z0-9]{20,}' "${COMMON_EXCLUDES[@]}" -g '!.vercel/**' "${ALL_ROOTS[@]}"
# Leading hyphens require an explicit -e pattern, handled by search().
scan_category critical "Private Keys" "Private key embedded in code" \
	'-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----' "${COMMON_EXCLUDES[@]}" "${ALL_ROOTS[@]}"
scan_category critical "JWT Tokens" "Hardcoded JWT token detected" \
	'eyJ[a-zA-Z0-9_-]{50,}\.eyJ[a-zA-Z0-9_-]{50,}\.' "${COMMON_EXCLUDES[@]}" -g '!*.test.*' "${ALL_ROOTS[@]}"
# Negative lookahead needs the PCRE2 engine (-P).
scan_category critical "Database Password" "Password in connection string" \
	'postgres://[^:]+:[^@]{8,}@(?!localhost)' -P "${COMMON_EXCLUDES[@]}" "${ALL_ROOTS[@]}"
if [ ${#SCRIPT_ROOTS[@]} -gt 0 ]; then
	scan_category critical "Personal Username" "Personal username in scripts" \
		'postgresql://roberdan@|postgres\..*:.*@aws' "${COMMON_EXCLUDES[@]}" "${SCRIPT_ROOTS[@]}"
fi
echo " done"

# =============================================================================
# WARNINGS: These are flagged but don't block (unless --strict)
# =============================================================================
echo -n "Scanning for hardcoded URLs..."
# IGNORED: src/app/admin/page.tsx dashboard link constant, grafana-dashboards
# config docs, and commented-out lines (the (?!\s*//) guard).
scan_category warning "Grafana URL" "Hardcoded Grafana dashboard URL" \
	'^(?!\s*//).*mirrorbuddy\.grafana\.net' -P "${COMMON_EXCLUDES[@]}" \
	-g '!docs/**' -g '!**/src/app/admin/page.tsx' -g '!**/grafana-dashboards/*.json' \
	"${CODE_ROOTS[@]}"
if [ ${#LIB_ROOTS[@]} -gt 0 ]; then
	scan_category warning "Production URL" "Hardcoded mirrorbuddy.org in lib/api" \
		'^(?!.*(example\.com|mailto:)).*mirrorbuddy\.org' -P "${COMMON_EXCLUDES[@]}" \
		-g '!docs/**' "${LIB_ROOTS[@]}"
fi
scan_category warning "Personal Email" "Personal email in code comments" \
	'(roberdan|mariodanfts)@' "${COMMON_EXCLUDES[@]}" -g '!docs/**' "${CODE_ROOTS[@]}"
scan_category warning "Test Focus" ".only() left in tests" \
	'\.only\(' -g '*.test.ts' -g '*.test.tsx' -g '*.spec.ts' "${TEST_ROOTS[@]}"
scan_category warning "Debugger" "debugger statement in code" \
	'^\s*debugger;?\s*$' "${COMMON_EXCLUDES[@]}" "${CODE_ROOTS[@]}"
echo " done"

# =============================================================================
# OUTPUT
# =============================================================================
{
	echo "# Secrets Scan Report"
	echo "Generated: $(date)"
	echo "Mode: $([ "$STRICT_MODE" = true ] && echo 'STRICT' || echo 'NORMAL')"
	echo ""
	echo "Categories and file locations only; matched values are never recorded."
	echo ""
} >"$REPORT_FILE"

if [ ${#CRITICAL_BLOCKS[@]} -gt 0 ]; then
	echo "# Critical Issues (BLOCKING)" >>"$REPORT_FILE"
	echo "" >>"$REPORT_FILE"
	for block in "${CRITICAL_BLOCKS[@]}"; do
		echo "$block" >>"$REPORT_FILE"
	done
fi
if [ ${#WARNING_BLOCKS[@]} -gt 0 ]; then
	echo "# Warnings (Non-blocking)" >>"$REPORT_FILE"
	echo "" >>"$REPORT_FILE"
	for block in "${WARNING_BLOCKS[@]}"; do
		echo "$block" >>"$REPORT_FILE"
	done
fi

TOTAL_ISSUES=$((CRITICAL_ISSUES + WARNING_ISSUES))
if [ "$STRICT_MODE" = true ]; then
	EXIT_ISSUES=$TOTAL_ISSUES
else
	EXIT_ISSUES=$CRITICAL_ISSUES
fi

if $JSON_MODE; then
	echo "{\"status\":\"$([ $EXIT_ISSUES -eq 0 ] && echo PASS || echo FAIL)\",\"critical\":$CRITICAL_ISSUES,\"warnings\":$WARNING_ISSUES,\"report\":\"$REPORT_FILE\"}"
else
	echo ""
	if [ "$CRITICAL_ISSUES" -eq 0 ] && [ "$WARNING_ISSUES" -eq 0 ]; then
		echo -e "${GREEN}✓ SECRETS SCAN PASS${NC} - No sensitive data detected"
		rm -f "$REPORT_FILE"
	elif [ "$CRITICAL_ISSUES" -eq 0 ]; then
		echo -e "${YELLOW}⚠ SECRETS SCAN PASS (with warnings)${NC}"
		echo -e "  Warnings: $WARNING_ISSUES (non-blocking)"
		echo "  Report: $REPORT_FILE"
	else
		echo -e "${RED}✗ SECRETS SCAN FAIL${NC}"
		echo -e "  ${RED}Critical: $CRITICAL_ISSUES (BLOCKING)${NC}"
		[ "$WARNING_ISSUES" -gt 0 ] && echo -e "  ${YELLOW}Warnings: $WARNING_ISSUES${NC}"
		echo "  Report: $REPORT_FILE"
		echo ""
		echo "Critical issues found:"
		for category in "${CRITICAL_CATEGORIES[@]}"; do
			echo "  - $category"
		done
		if $FIX_MODE; then
			echo ""
			echo -e "${CYAN}Fix suggestions:${NC}"
			echo "  1. Move hardcoded values to .env"
			echo "  2. Use process.env.VARIABLE_NAME"
			echo "  3. Check git history: git log -p --all -S 'pattern'"
			echo "  4. Remove from history if needed: git filter-branch or BFG"
		fi
	fi
fi

[ "$EXIT_ISSUES" -gt 0 ] && exit 1
exit 0
