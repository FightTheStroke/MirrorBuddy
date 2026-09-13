#!/usr/bin/env bash
set -euo pipefail

# ci-summary.sh - Compact CI diagnostics with retained failure logs.
#
# Usage:
#   ./scripts/ci-summary.sh                 # lint + typecheck + build + unsafe queries
#   ./scripts/ci-summary.sh --quick         # lint + typecheck (no build lock)
#   ./scripts/ci-summary.sh --full          # default + units + reachability
#   ./scripts/ci-summary.sh --all           # all checks, including browser tests
#   ./scripts/ci-summary.sh --lint          # lint only
#   ./scripts/ci-summary.sh --types         # typecheck only
#   ./scripts/ci-summary.sh --build         # build only
#   ./scripts/ci-summary.sh --unit          # unit tests only
#   ./scripts/ci-summary.sh --i18n          # locale check only
#   ./scripts/ci-summary.sh --roster        # character roster check
#   ./scripts/ci-summary.sh --unsafe-queries # application raw SQL check
#   ./scripts/ci-summary.sh --links         # markdown link check
#   ./scripts/ci-summary.sh --migrations    # schema drift check
#   ./scripts/ci-summary.sh --reachability  # unreachable-file guard
#   ./scripts/ci-summary.sh --e2e [args...] # Playwright tests (local test runtime)
#   ./scripts/ci-summary.sh --a11y          # accessibility browser project
#
# Only build modes acquire the existing per-directory build lock.
# Prefer --quick or targeted modes while another agent owns the browser server.
# The default lock timeout is 120 seconds; BUILD_LOCK_TIMEOUT can override it.
# Failed output stays in a private, uniquely named local log printed in the
# summary; successful temporary logs are removed. No logs are uploaded here.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

# shellcheck source=lib/build-lock.sh
source "$SCRIPT_DIR/lib/build-lock.sh"
# shellcheck source=lib/ci-summary-diagnostics.sh
source "$SCRIPT_DIR/lib/ci-summary-diagnostics.sh"

MODE="${1:---default}"
ERRORS=0
WARNINGS=0
RESULTS=""

run_lint() { run_logged "Lint" npm run lint; }
run_typecheck() { run_logged "Typecheck" npm run typecheck; }
run_unit() { run_logged "Unit" npm run test:unit; }
run_i18n() { run_logged "i18n" npm run i18n:check; }
run_roster() { run_logged "roster" npm run roster:check; }
run_unsafe_query_check() { run_logged "Unsafe queries" scan_unsafe_queries; }
run_link_check() { run_logged "Links" "$SCRIPT_DIR/check-links.sh"; }
run_migrations() { run_logged "Migrations" "$SCRIPT_DIR/check-schema-drift.sh"; }
run_reachability() { run_logged "Reachability" npx tsx scripts/check-reachability.ts; }

run_build() {
	acquire_build_lock
	run_logged "Build" npm run build
	release_build_lock
}

run_e2e() {
	# Retain the old single-string option form, without pathname expansion.
	if [[ $# -eq 1 && "$1" == --* && "$1" == *" "* ]]; then
		local legacy_args
		read -r -a legacy_args <<<"$1"
		run_e2e "${legacy_args[@]}"
		return
	fi
	run_logged "E2E" env E2E_TESTS=1 npx playwright test \
		--config "$PROJECT_DIR/apps/web/playwright.config.iteration.ts" "$@"
}

run_a11y() {
	run_logged "A11y" env E2E_TESTS=1 npx playwright test \
		--config "$PROJECT_DIR/apps/web/playwright.config.iteration.ts" --project=a11y
}

run_default() {
	run_lint
	run_typecheck
	run_build
	run_unsafe_query_check
}

if [[ "$MODE" == "--help" ]]; then
	awk '/^# ci-summary/,/^[^#]/{if(/^#/) print substr($0,3)}' "${BASH_SOURCE[0]}"
	exit 0
fi

echo "=== CI Summary ==="
case "$MODE" in
--lint) run_lint ;;
--types) run_typecheck ;;
--build) run_build ;;
--unit) run_unit ;;
--i18n) run_i18n ;;
--roster) run_roster ;;
--unsafe-queries) run_unsafe_query_check ;;
--links) run_link_check ;;
--migrations) run_migrations ;;
--reachability) run_reachability ;;
--e2e) shift; run_e2e "$@" ;;
--a11y) run_a11y ;;
--quick) run_lint; run_typecheck ;;
--full) run_default; run_unit; run_reachability ;;
--all)
	run_default
	run_unit
	run_i18n
	run_roster
	run_migrations
	run_reachability
	run_link_check
	run_e2e
	run_a11y
	;;
*) run_default ;;
esac

echo "$RESULTS"
if [[ "$ERRORS" -gt 0 ]]; then
	echo "BLOCKED: $ERRORS step(s) failed"
	exit 1
elif [[ "$WARNINGS" -gt 0 ]]; then
	echo "OK with $WARNINGS warning(s)"
else
	echo "ALL CLEAN"
fi
