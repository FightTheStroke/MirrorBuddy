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

DRY_RUN=false
RUN_ALL=false

for arg in "$@"; do
	case "$arg" in
	--dry-run) DRY_RUN=true ;;
	--all) RUN_ALL=true ;;
	esac
done

# Detect changed files
if git rev-parse --verify main &>/dev/null && [ "$(git rev-parse --abbrev-ref HEAD)" != "main" ]; then
	CHANGED=$(git diff --name-only main...HEAD 2>/dev/null || echo "")
else
	CHANGED=$(git diff --name-only HEAD~1 2>/dev/null || echo "")
fi

if [ -z "$CHANGED" ]; then
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

while IFS= read -r file; do
	case "$file" in
	src/app/* | src/components/* | src/styles/* | public/* | messages/*)
		HAS_UI=true
		HAS_SRC=true
		;;
	src/lib/native/* | src/components/mobile/* | ios/* | android/* | capacitor.config.ts)
		HAS_MOBILE=true
		HAS_SRC=true
		;;
	src/lib/safety/* | src/lib/ai/* | src/lib/privacy/* | src/lib/compliance/* | src/data/maestri/*)
		HAS_SAFETY=true
		HAS_SRC=true
		;;
	e2e/* | playwright.config*.ts)
		HAS_E2E=true
		;;
	prisma/*)
		HAS_PRISMA=true
		;;
	package.json | package-lock.json | tsconfig*.json | eslint.config.mjs | eslint-local-rules/* | next.config.ts | vitest.config.ts)
		HAS_CONFIG=true
		;;
	src/*)
		HAS_SRC=true
		;;
	esac
done <<<"$CHANGED"

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
run_suite "Unit tests (safety)" npm run test:unit -- safety --reporter=verbose
run_suite "Unit tests (accessibility)" npm run test:unit -- accessibility --reporter=verbose

# ==========================================================
# TARGETED (conditional) — run only affected suites
# ==========================================================
echo ""
echo "=== Targeted Tests ==="

if $RUN_ALL || $HAS_SRC || $HAS_CONFIG; then
	run_suite "Full unit tests" npm run test:unit
fi

if $RUN_ALL || $HAS_UI; then
	run_suite "Smoke E2E" npm run test:e2e:smoke
fi

if $RUN_ALL || $HAS_SAFETY; then
	run_suite "LLM safety tests" npm run test:unit -- jailbreak-detector content-filter safety.test --reporter=verbose
fi

if $RUN_ALL || $HAS_PRISMA; then
	echo "  [INFO] Prisma changes detected — verify migrations locally with: npx prisma migrate dev"
fi

if $RUN_ALL || $HAS_MOBILE; then
	echo "  [INFO] Mobile changes detected — run: npm run build:mobile:web"
fi

if $RUN_ALL || $HAS_E2E; then
	echo "  [INFO] E2E test files changed — consider running: npm run test:e2e"
fi

# ==========================================================
# Summary
# ==========================================================
echo ""
echo "=== Results ==="
echo "  Passed: $PASS"
echo "  Failed: $FAIL"

if [ "$FAIL" -gt 0 ]; then
	echo ""
	echo "FAILURE: $FAIL test suite(s) failed."
	exit 1
fi

echo "All affected test suites passed."
