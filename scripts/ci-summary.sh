#!/usr/bin/env bash
set -euo pipefail

# ci-summary.sh - Compact CI diagnostics (token-efficient)
# ALL output captured silently. Only structured summary printed.
# Target: ~10-30 lines output regardless of codebase size.
#
# Usage:
#   ./scripts/ci-summary.sh                 # lint + typecheck + build + unsafe queries
#   ./scripts/ci-summary.sh --quick         # lint + typecheck ONLY (~30s vs ~3min)
#   ./scripts/ci-summary.sh --full          # + unit tests
#   ./scripts/ci-summary.sh --lint          # lint only
#   ./scripts/ci-summary.sh --types         # typecheck only
#   ./scripts/ci-summary.sh --build         # build only
#   ./scripts/ci-summary.sh --unit          # unit tests only
#   ./scripts/ci-summary.sh --i18n          # i18n check only
#   ./scripts/ci-summary.sh --unsafe-queries# unsafe query check only
#   ./scripts/ci-summary.sh --links         # markdown link check only
#   ./scripts/ci-summary.sh --migrations    # schema drift check only
#   ./scripts/ci-summary.sh --e2e           # E2E tests (requires running app)
#   ./scripts/ci-summary.sh --a11y          # Accessibility tests (requires running app)
#
# For AI agents: use --quick during development, default/--full for Thor/pre-commit.

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
		while IFS= read -r line; do result "  $line"; done <<<"$details"
	fi
}

# Parse Playwright JSON report for failed test details (max 10 failures, 3 lines each)
parse_pw_json() {
	local json_file="$1"
	[[ -f "$json_file" ]] || return 0
	node -e '
const fs = require("fs");
const r = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const failed = (r.suites || []).flatMap(function gather(s) {
  const own = (s.specs || []).flatMap(sp =>
    sp.tests.filter(t => t.status === "unexpected" || t.status === "flaky")
      .map(t => ({
        title: sp.title,
        file: sp.file + ":" + sp.line,
        error: (t.results[0]?.error?.message || "").split("\n")[0].slice(0, 120)
      }))
  );
  return own.concat((s.suites || []).flatMap(gather));
});
failed.slice(0, 10).forEach(f => {
  console.log(f.file + " " + f.title);
  if (f.error) console.log("  " + f.error);
});
' "$json_file" 2>/dev/null || true
}

run_lint() {
	local tmp
	tmp=$(mktemp)
	if npm run lint >"$tmp" 2>&1; then
		local wc
		wc=$(strip_ansi "$tmp" | grep -c " warning " || true)
		if [[ "$wc" -gt 0 ]]; then
			WARNINGS=$((WARNINGS + wc))
			result "[WARN] Lint ($wc warnings)"
			local d
			d=$(strip_ansi "$tmp" | grep " warning " |
				sed 's/.*warning  //' | sort | uniq -c | sort -rn | head -5)
			result_details "$d"
		else
			result "[PASS] Lint"
		fi
	else
		local ec
		ec=$(strip_ansi "$tmp" | grep -c " error " || true)
		ERRORS=$((ERRORS + 1))
		result "[FAIL] Lint ($ec errors)"
		local d
		d=$(strip_ansi "$tmp" | grep " error " | head -10)
		result_details "$d"
	fi
	rm -f "$tmp"
}

run_typecheck() {
	local tmp
	tmp=$(mktemp)
	if npm run typecheck >"$tmp" 2>&1; then
		result "[PASS] Typecheck"
	else
		local ec
		ec=$(strip_ansi "$tmp" | grep -c "error TS" || true)
		ERRORS=$((ERRORS + 1))
		result "[FAIL] Typecheck ($ec errors)"
		local d
		d=$(strip_ansi "$tmp" | grep "error TS" |
			sed 's/.*\(error TS[0-9]*:.*\)/\1/' | sort | uniq -c | sort -rn | head -10)
		result_details "$d"
	fi
	rm -f "$tmp"
}

run_build() {
	local tmp
	tmp=$(mktemp)
	if npm run build >"$tmp" 2>&1; then
		local wc
		wc=$(strip_ansi "$tmp" | grep -ciE "^warn" || true)
		if [[ "$wc" -gt 0 ]]; then
			WARNINGS=$((WARNINGS + wc))
			result "[WARN] Build ($wc warnings)"
			local d
			d=$(strip_ansi "$tmp" | grep -iE "^warn" | head -5)
			result_details "$d"
		else
			result "[PASS] Build"
		fi
	else
		ERRORS=$((ERRORS + 1))
		result "[FAIL] Build"
		local d
		d=$(strip_ansi "$tmp" |
			grep -iE "^error|Error:|Type error|Module not found" | head -10)
		result_details "$d"
	fi
	rm -f "$tmp"
}

run_unit() {
	local tmp
	tmp=$(mktemp)
	if npm run test:unit >"$tmp" 2>&1; then
		local s
		s=$(strip_ansi "$tmp" | grep -E "Test(s| Files).*passed" | tail -1)
		result "[PASS] Unit${s:+ ($s)}"
	else
		ERRORS=$((ERRORS + 1))
		local fc
		fc=$(strip_ansi "$tmp" | grep -cE "^ *(FAIL|×)" || true)
		result "[FAIL] Unit ($fc failures)"
		# Only actual failures - skip act() warnings, HTMLMediaElement noise
		local d
		d=$(strip_ansi "$tmp" |
			grep -E "^ *FAIL |^ *× |AssertionError|Expected.*Received" |
			grep -v "act()" | grep -v "HTMLMediaElement" | head -15)
		result_details "$d"
	fi
	rm -f "$tmp"
}

run_i18n() {
	local tmp
	tmp=$(mktemp)
	if npm run i18n:check >"$tmp" 2>&1; then
		result "[PASS] i18n"
	else
		ERRORS=$((ERRORS + 1))
		result "[FAIL] i18n"
		local d
		d=$(strip_ansi "$tmp" | grep -iE "missing|mismatch|error" | head -10)
		result_details "$d"
	fi
	rm -f "$tmp"
}

run_e2e() {
	local tmp
	tmp=$(mktemp)
	local args="${1:-}"
	if E2E_TESTS=1 npx playwright test $args >"$tmp" 2>&1; then
		local s
		s=$(strip_ansi "$tmp" | grep -E "[0-9]+ passed" | tail -1)
		result "[PASS] E2E${s:+ ($s)}"
	else
		ERRORS=$((ERRORS + 1))
		local s
		s=$(strip_ansi "$tmp" | grep -E "[0-9]+ (passed|failed)" | tail -1)
		result "[FAIL] E2E${s:+ ($s)}"
		local d
		d=$(parse_pw_json "test-results/pw-results.json")
		if [[ -z "$d" ]]; then
			d=$(strip_ansi "$tmp" |
				grep -E "^\s+[0-9]+\)|Error:|expect\(|Timeout|\.spec\.ts:" |
				sed 's/^\s*//' | head -15)
		fi
		result_details "$d"
	fi
	rm -f "$tmp"
}

run_a11y() {
	local tmp
	tmp=$(mktemp)
	if E2E_TESTS=1 npx playwright test --project=a11y >"$tmp" 2>&1; then
		local s
		s=$(strip_ansi "$tmp" | grep -E "[0-9]+ passed" | tail -1)
		result "[PASS] A11y${s:+ ($s)}"
	else
		ERRORS=$((ERRORS + 1))
		local s
		s=$(strip_ansi "$tmp" | grep -E "[0-9]+ (passed|failed)" | tail -1)
		result "[FAIL] A11y${s:+ ($s)}"
		local d
		d=$(parse_pw_json "test-results/pw-results.json")
		if [[ -z "$d" ]]; then
			d=$(strip_ansi "$tmp" |
				grep -E "^\s+[0-9]+\)|violation|critical|serious|moderate|\[wcag" |
				sed 's/^\s*//' | head -15)
		fi
		result_details "$d"
	fi
	rm -f "$tmp"
}

run_unsafe_query_check() {
	local ALLOWLIST="$SCRIPT_DIR/.queryraw-allowlist"
	local EXCLUDE_ARGS=()

	if [[ -f "$ALLOWLIST" ]]; then
		while IFS= read -r excl; do
			[[ -n "$excl" && "$excl" != \#* ]] && EXCLUDE_ARGS+=(--exclude="$excl")
		done <"$ALLOWLIST"
	fi

	local FOUND
	if [[ ${#EXCLUDE_ARGS[@]} -gt 0 ]]; then
		FOUND=$(grep -r --include='*.ts' '\$queryRawUnsafe' "${EXCLUDE_ARGS[@]}" src/ 2>/dev/null || true)
	else
		FOUND=$(grep -r --include='*.ts' '\$queryRawUnsafe' src/ 2>/dev/null || true)
	fi

	if [[ -n "$FOUND" ]]; then
		local fc
		fc=$(echo "$FOUND" | wc -l | tr -d ' ')
		ERRORS=$((ERRORS + 1))
		result "[FAIL] Unsafe queries ($fc files with \$queryRawUnsafe)"
		result_details "$FOUND"
	else
		result "[PASS] Unsafe queries"
	fi
}

run_link_check() {
	local OUTPUT
	OUTPUT=$("$SCRIPT_DIR/check-links.sh" 2>&1) || true
	local EXIT=$?

	if [[ $EXIT -eq 0 ]]; then
		result "[PASS] Links"
	else
		result "[FAIL] Links"
		result_details "$OUTPUT"
		((ERRORS++))
	fi
}

run_migrations() {
	local tmp
	tmp=$(mktemp)
	if "$SCRIPT_DIR/check-schema-drift.sh" >"$tmp" 2>&1; then
		local s
		s=$(grep -oE 'all [0-9]+ models' "$tmp" || true)
		result "[PASS] Migrations${s:+ ($s)}"
	else
		ERRORS=$((ERRORS + 1))
		result "[FAIL] Migrations"
		local d
		d=$(grep "MISSING:" "$tmp" | head -10)
		result_details "$d"
	fi
	rm -f "$tmp"
}

# --- Main ---
echo "=== CI Summary ==="

case "$MODE" in
--lint) run_lint ;;
--types) run_typecheck ;;
--build) run_build ;;
--unit) run_unit ;;
--i18n) run_i18n ;;
--unsafe-queries) run_unsafe_query_check ;;
--links) run_link_check ;;
--migrations) run_migrations ;;
--e2e) run_e2e "${2:-}" ;;
--a11y) run_a11y ;;
--quick)
	run_lint
	run_typecheck
	;;
--full)
	run_lint
	run_typecheck
	run_build
	run_unsafe_query_check
	run_unit
	;;
--all)
	run_lint
	run_typecheck
	run_build
	run_unsafe_query_check
	run_unit
	run_i18n
	run_migrations
	run_link_check
	run_e2e
	run_a11y
	;;
*)
	run_lint
	run_typecheck
	run_build
	run_unsafe_query_check
	;;
esac

echo "$RESULTS"
if [[ "$ERRORS" -gt 0 ]]; then
	echo "BLOCKED: $ERRORS step(s) failed"
	exit 1
elif [[ "$WARNINGS" -gt 0 ]]; then
	echo "OK with $WARNINGS warning(s)"
	exit 0
else
	echo "ALL CLEAN"
	exit 0
fi
