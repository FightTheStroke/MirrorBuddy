#!/usr/bin/env bash
set -euo pipefail

# Run real related unit tests and collect changed browser specs from repo root.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

changes_file=$(mktemp)
cleanup() {
	for temporary in "$changes_file" "${unit_log:-}" "${unit_report:-}"; do
		if [[ -n "$temporary" ]]; then rm -f "$temporary"; fi
	done
}
trap cleanup EXIT
git diff --cached --name-only --diff-filter=ACMRD -z >"$changes_file"

unit_files=()
browser_specs=()
unit_count=0
browser_count=0
browser_changes=false
collect_all=false
full_unit=false

while IFS= read -r -d '' file; do
	case "$file" in
	apps/web/e2e/* | e2e/* | apps/web/playwright.config*.ts | playwright.config*.ts)
		browser_changes=true
		if [[ "$file" == *.spec.ts && -f "$file" ]]; then
			browser_specs[$browser_count]="$file"
			browser_count=$((browser_count + 1))
		else
			collect_all=true
		fi
		;;
	package.json | pnpm-lock.yaml | tsconfig*.json | apps/web/package.json | packages/*/package.json | apps/web/vitest.config.ts | vitest.config.ts)
		full_unit=true
		;;
	scripts/smart-test.sh | scripts/test-affected.sh | .github/workflows/ci.yml)
		unit_files[$unit_count]="$PROJECT_DIR/scripts/__tests__/smart-test-selection.test.ts"
		unit_count=$((unit_count + 1))
		unit_files[$unit_count]="$PROJECT_DIR/scripts/__tests__/smart-test-empty-selection.test.ts"
		unit_count=$((unit_count + 1))
		;;
	scripts/ci-summary.sh | scripts/lib/ci-summary-diagnostics.sh)
		unit_files[$unit_count]="$PROJECT_DIR/scripts/__tests__/ci-summary-diagnostics.test.ts"
		unit_count=$((unit_count + 1))
		;;
	apps/web/src/* | src/* | packages/* | scripts/*)
		if [[ "$file" == *.ts || "$file" == *.tsx ]]; then
			if [[ -f "$file" ]]; then
				unit_files[$unit_count]="$PROJECT_DIR/$file"
				unit_count=$((unit_count + 1))
			else
				full_unit=true
			fi
		fi
		;;
	esac
done <"$changes_file"

run_full_unit() {
	echo "Running the full unit suite; related coverage is insufficient or configuration changed."
	npx vitest run --root apps/web --passWithNoTests=false --retry=0 --reporter=dot
}

if $full_unit; then
	run_full_unit
elif [[ "$unit_count" -gt 0 ]]; then
	echo "Running tests related to $unit_count staged files..."
	unit_report=$(mktemp)
	unit_log=$(mktemp)
	status=0
	# A scalar outputFile overrides the app config's shared report path.
	npx vitest related "${unit_files[@]}" --run --root apps/web \
		--passWithNoTests=false --retry=0 --reporter=dot --reporter=json \
		"--outputFile=$unit_report" >"$unit_log" 2>&1 || status=$?
	cat "$unit_log"
	if [[ "$status" -ne 0 ]]; then
		if [[ "$status" -eq 1 && -s "$unit_report" ]] &&
			grep -q 'No test files found' "$unit_log" &&
			! grep -qiE 'Unhandled|Startup Error|Failed Suites|Failed Tests|error:' "$unit_log" &&
			node -e '
const report = JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"));
const empty = report && typeof report === "object" && report.success === false
  && report.numTotalTestSuites === 0 && report.numTotalTests === 0
  && report.numFailedTestSuites === 0 && report.numFailedTests === 0
  && Array.isArray(report.testResults) && report.testResults.length === 0;
process.exit(empty ? 0 : 1);
' "$unit_report"; then
			run_full_unit
		else
			exit "$status"
		fi
	fi
fi

if $browser_changes; then
	echo "Collecting browser tests without launching a browser or server..."
	# Shared fixtures/configuration can affect any configured project.
	if $collect_all; then
		E2E_TESTS=1 npx playwright test --config "$PROJECT_DIR/apps/web/playwright.config.iteration.ts" \
			--list --reporter=list
	else
		E2E_TESTS=1 npx playwright test --config "$PROJECT_DIR/apps/web/playwright.config.iteration.ts" \
			--list --reporter=list "${browser_specs[@]}"
	fi
fi

if ! $full_unit && [[ "$unit_count" -eq 0 ]] && ! $browser_changes; then
	echo "No relevant staged source or browser files - skipping tests."
fi
