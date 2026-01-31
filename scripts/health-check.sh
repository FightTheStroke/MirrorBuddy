#!/usr/bin/env bash
set -euo pipefail

# health-check.sh - Single project health triage (~15 lines output)
# Aggregates: build, debt, compliance, i18n, git status
#
# Usage:
#   ./scripts/health-check.sh              # Full triage (~15 lines)
#   ./scripts/health-check.sh --drill ci   # Drill into CI details
#   ./scripts/health-check.sh --drill debt # Drill into debt details
#   ./scripts/health-check.sh --drill i18n # Drill into i18n details
#   ./scripts/health-check.sh --drill comp # Drill into compliance details

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

MODE="${1:---triage}"
DRILL="${2:-}"

# Drill mode: run the specific tool with full output
if [[ "$MODE" == "--drill" ]]; then
	case "$DRILL" in
	ci) ./scripts/ci-summary.sh --full ;;
	debt) npx tsx scripts/debt-check.ts ;;
	i18n) npx tsx scripts/i18n-sync-namespaces.ts ;;
	comp) npx tsx scripts/compliance-check.ts ;;
	*)
		echo "Usage: --drill [ci|debt|i18n|comp]"
		exit 1
		;;
	esac
	exit $?
fi

# Triage mode: aggregate all checks, minimal output
echo "=== Project Health ==="
ERRORS=0
WARNINGS=0

# 1. Build (lint + typecheck + build)
ci_tmp=$(mktemp)
if ./scripts/ci-summary.sh >"$ci_tmp" 2>&1; then
	ci_warns=$(grep -c '\[WARN\]' "$ci_tmp" || true)
	if [[ "$ci_warns" -gt 0 ]]; then
		grep '\[WARN\]' "$ci_tmp"
		WARNINGS=$((WARNINGS + ci_warns))
	else
		echo "[PASS] Build (lint + typecheck + build)"
	fi
else
	grep '\[FAIL\]' "$ci_tmp" || echo "[FAIL] Build"
	ERRORS=$((ERRORS + 1))
fi
rm -f "$ci_tmp"

# 2. Debt
debt_tmp=$(mktemp)
if npx tsx scripts/debt-check.ts --summary >"$debt_tmp" 2>&1; then
	echo "[PASS] Debt ($(grep -oE '[0-9]+/[0-9]+' "$debt_tmp" | tr '\n' ', ' | sed 's/,$//'))"
else
	grep '❌' "$debt_tmp" | head -2
	ERRORS=$((ERRORS + 1))
fi
rm -f "$debt_tmp"

# 3. Compliance
comp_tmp=$(mktemp)
if npx tsx scripts/compliance-check.ts --fail-only >"$comp_tmp" 2>&1; then
	summary=$(grep 'Summary:' "$comp_tmp" || true)
	echo "[PASS] Compliance${summary:+ (${summary#*: })}"
else
	grep '\[FAIL\]' "$comp_tmp" | head -3
	ERRORS=$((ERRORS + 1))
fi
rm -f "$comp_tmp"

# 4. i18n sync
i18n_tmp=$(mktemp)
if npx tsx scripts/i18n-sync-namespaces.ts --quiet >"$i18n_tmp" 2>&1; then
	cat "$i18n_tmp"
else
	cat "$i18n_tmp"
	WARNINGS=$((WARNINGS + 1))
fi
rm -f "$i18n_tmp"

# 5. Git status
branch=$(git branch --show-current 2>/dev/null || echo "unknown")
dirty=$(git status --porcelain 2>/dev/null | grep -c '' || true)
if [[ "$dirty" -eq 0 ]]; then
	echo "[PASS] Git: clean, on $branch"
else
	echo "[WARN] Git: $dirty uncommitted changes, on $branch"
	WARNINGS=$((WARNINGS + 1))
fi

# Summary
echo "---"
if [[ "$ERRORS" -gt 0 ]]; then
	echo "BLOCKED: $ERRORS check(s) failed. Run --drill <section> for details."
	exit 1
elif [[ "$WARNINGS" -gt 0 ]]; then
	echo "OK with $WARNINGS warning(s)."
	exit 0
else
	echo "ALL CLEAN"
	exit 0
fi
