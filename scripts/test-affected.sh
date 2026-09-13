#!/usr/bin/env bash
# scripts/test-affected.sh — Run tests for affected areas only
#
# Usage:
#   ./scripts/test-affected.sh              # Auto-detect from git diff
#   ./scripts/test-affected.sh --all        # Run everything
#   ./scripts/test-affected.sh --dry-run    # Show what would run
#
# Compares current branch to main (or HEAD~1 on main) to detect changed areas,
# then runs only the relevant test suites. Always includes a baseline regression
# check (a11y unit + security unit) to prevent cross-cutting regressions.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

DRY_RUN=false
RUN_ALL=false

for arg in "$@"; do
	case "$arg" in
	--dry-run) DRY_RUN=true ;;
	--all) RUN_ALL=true ;;
	esac
done

changes_file=$(mktemp)
trap 'rm -f "$changes_file"' EXIT

# Include the branch delta and local work; Git failures are not empty changes.
if git rev-parse --verify main &>/dev/null && [ "$(git rev-parse --abbrev-ref HEAD)" != "main" ]; then
	git diff --name-only -z main...HEAD >"$changes_file"
else
	git diff --name-only -z HEAD~1 >"$changes_file"
fi
git diff --name-only -z HEAD >>"$changes_file"
git ls-files --others --exclude-standard -z >>"$changes_file"

if [[ ! -s "$changes_file" ]]; then
	echo "No changes detected, running baseline only."
fi

# Classify affected areas
HAS_SRC=false
HAS_UI=false
HAS_MOBILE=false
HAS_PRISMA=false
HAS_SAFETY=false
HAS_E2E=false
HAS_CONFIG=false

while IFS= read -r -d '' file; do
	file="${file#apps/web/}"
	case "$file" in
	src/* | packages/*/src/*) HAS_SRC=true ;;
	esac
	case "$file" in
	src/app/* | src/components/* | src/styles/* | public/* | messages/* | packages/ui/src/* | packages/accessibility/src/* | packages/ui/package.json | packages/accessibility/package.json)
		HAS_UI=true
		HAS_SRC=true
		;;
	esac
	case "$file" in
	src/lib/native/* | src/components/mobile/* | ios/* | android/* | capacitor.config.ts | packages/ui/src/* | packages/accessibility/src/* | packages/ui/package.json | packages/accessibility/package.json)
		HAS_MOBILE=true
		HAS_SRC=true
		;;
	esac
	case "$file" in
	src/lib/safety/* | src/lib/ai/* | src/lib/privacy/* | src/lib/compliance/* | src/data/maestri/* | packages/safety/src/* | packages/ai-providers/src/* | packages/maestri/src/*)
		HAS_SAFETY=true
		HAS_SRC=true
		;;
	esac
	case "$file" in
	e2e/* | playwright.config*.ts)
		HAS_E2E=true
		;;
	prisma/* | prisma.config.ts)
		HAS_PRISMA=true
		;;
	package.json | packages/*/package.json | pnpm-lock.yaml | tsconfig*.json | eslint.config.mjs | eslint-local-rules/* | next.config.ts | vitest.config.ts | .github/*)
		HAS_CONFIG=true
		;;
	esac
done <"$changes_file"

echo "=== Affected Areas ==="
echo "  src:    $HAS_SRC"
echo "  ui:     $HAS_UI"
echo "  mobile: $HAS_MOBILE"
echo "  prisma: $HAS_PRISMA"
echo "  safety: $HAS_SAFETY"
echo "  e2e:    $HAS_E2E"
echo "  config: $HAS_CONFIG"
echo ""

PASS=0
FAIL=0

run_suite() {
	local name="$1"
	shift
	if $DRY_RUN; then
		echo "[DRY-RUN] Would run: $name ($*)"
		return 0
	fi
	echo "--- Running: $name ---"
	if "$@"; then
		PASS=$((PASS + 1))
		echo "  PASS: $name"
	else
		FAIL=$((FAIL + 1))
		echo "  FAIL: $name"
	fi
}

# ==========================================================
# BASELINE (always runs) — mandatory regression check
# ==========================================================
echo "=== Baseline Regression Tests ==="
run_suite "Unit tests (safety)" npm run test:unit -- safety --reporter=verbose --retry=0
run_suite "Unit tests (accessibility)" npm run test:unit -- accessibility --reporter=verbose --retry=0

# ==========================================================
# TARGETED (conditional) — run only affected suites
# ==========================================================
echo ""
echo "=== Targeted Tests ==="

if $RUN_ALL || $HAS_SRC || $HAS_CONFIG; then
	run_suite "Full unit tests" npm run test:unit -- --retry=0
fi

if $RUN_ALL || $HAS_UI; then
	run_suite "Smoke E2E" npm run test:e2e:smoke
fi

if $RUN_ALL || $HAS_SAFETY; then
	run_suite "LLM safety tests" npm run test:unit -- jailbreak-detector content-filter safety.test --reporter=verbose --retry=0
fi

if $RUN_ALL || $HAS_PRISMA; then
	echo "  [INFO] Prisma changes detected — verify migrations locally with: npx prisma migrate dev"
fi

if $RUN_ALL || $HAS_MOBILE; then
	echo "  [INFO] Mobile changes detected — run: npm run build:mobile:web"
fi

if $RUN_ALL || $HAS_E2E; then
	run_suite "E2E collection" env E2E_TESTS=1 npx playwright test \
		--config "$PROJECT_DIR/apps/web/playwright.config.iteration.ts" --list --reporter=list
fi

# ==========================================================
# Summary
# ==========================================================
echo ""
echo "=== Results ==="
echo "  Passed: $PASS"
echo "  Failed: $FAIL"

if $DRY_RUN; then
	echo "Dry run only: no test suites were executed."
	exit 0
fi

if [ "$FAIL" -gt 0 ]; then
	echo ""
	echo "FAILURE: $FAIL test suite(s) failed."
	exit 1
fi

echo "All affected test suites passed."
