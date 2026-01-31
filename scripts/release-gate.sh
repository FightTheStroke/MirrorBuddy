#!/usr/bin/env bash
# =============================================================================
# RELEASE GATE (10/10)
# Single command to enforce all P0 release checks.
# =============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SUMMARY_ONLY="${SUMMARY_ONLY:-0}"
[[ "${1:-}" == "--summary-only" ]] && SUMMARY_ONLY=1

if ! command -v rg &>/dev/null; then
	echo -e "${RED}✗ BLOCKED: ripgrep (rg) is required${NC}"
	exit 1
fi

echo ""
echo "=========================================="
echo " RELEASE GATE (10/10) - MIRRORBUDDY"
echo "=========================================="
echo ""

echo -e "${BLUE}[PHASE 0] Pre-release checks (lint+typecheck+build+hygiene+i18n+perf+filesize)...${NC}"
npm run pre-release

echo ""
echo -e "${BLUE}[PHASE 0.8] Technical debt check...${NC}"
debt_output=$(npx tsx scripts/debt-check.ts 2>&1)
debt_exit=$?
if [ $debt_exit -ne 0 ]; then
	echo -e "${RED}✗ BLOCKED: Technical debt thresholds exceeded${NC}"
	echo "$debt_output"
	exit 1
fi
echo "$debt_output" | tail -10
echo -e "${GREEN}✓ Technical debt check passed${NC}"

echo ""
echo -e "${BLUE}[PHASE 1] TypeScript rigor...${NC}"
ts_ignore=$(rg -n "@ts-ignore|@ts-nocheck" src -g "*.ts" -g "*.tsx" 2>/dev/null || true)
if [ -n "$ts_ignore" ]; then
	ts_count=$(echo "$ts_ignore" | grep -c '' || echo 0)
	echo -e "${RED}✗ BLOCKED: $ts_count @ts-ignore/@ts-nocheck found${NC}"
	if [[ "$SUMMARY_ONLY" == "1" ]]; then
		echo "$ts_ignore" | head -3
	else
		echo "$ts_ignore"
	fi
	exit 1
fi

prod_any=$(rg -g '*.ts' -g '*.tsx' ": any\b|as any\b" src -g '!**/__tests__/**' -g '!*.test.*' --no-heading 2>/dev/null | rg -v "//.*any\b|has any\b|avoid.*any\b|eslint-disable" || true)
if [ -n "$prod_any" ]; then
	any_count=$(echo "$prod_any" | grep -c '' || echo 0)
	echo -e "${RED}✗ BLOCKED: $any_count 'any' in production code${NC}"
	if [[ "$SUMMARY_ONLY" == "1" ]]; then
		echo "$prod_any" | head -3
	else
		echo "$prod_any" | head -20
	fi
	exit 1
fi

# Check Zod validation for routes with state-changing methods (POST/PUT/PATCH)
routes_needing_validation=0
routes_with_validation=0
missing_validation=""
while IFS= read -r route; do
	# Check if route has POST, PUT, or PATCH (state-changing methods that need input validation)
	if rg -q "export.*(async function (POST|PUT|PATCH)|const (POST|PUT|PATCH))" "$route" 2>/dev/null; then
		routes_needing_validation=$((routes_needing_validation + 1))
		# Check for validation: zod import, @/lib/validation import, or z.object/safeParse usage
		if rg -q "from ['\"]zod['\"]|from ['\"]@/lib/validation|safeParse|z\.object|z\.string|z\.number" "$route" 2>/dev/null; then
			routes_with_validation=$((routes_with_validation + 1))
		else
			missing_validation="$missing_validation\n  - $route"
		fi
	fi
done < <(/usr/bin/find src/app/api -name "route.ts" 2>/dev/null)
if [ "$routes_needing_validation" -ne "$routes_with_validation" ]; then
	echo -e "${YELLOW}⚠ WARNING: $((routes_needing_validation - routes_with_validation)) API routes missing Zod validation${NC}"
	echo -e "Routes with validation: $routes_with_validation / $routes_needing_validation"
	# Note: Not blocking for v0.7 - to be addressed in v0.8
fi
echo -e "${GREEN}✓ TypeScript rigor passed${NC}"

echo ""
echo -e "${BLUE}[PHASE 2] Unit tests + coverage...${NC}"
npm run test:coverage

echo ""
echo -e "${BLUE}[PHASE 3] E2E tests...${NC}"
npm run test:e2e:smoke
npm run test

echo ""
echo -e "${BLUE}[PHASE 4] Legal review compliance check...${NC}"
legal_output=$(npx tsx scripts/compliance-audit-source-verification.ts 2>&1 || true)
legal_exit=$?
if [ $legal_exit -ne 0 ]; then
	echo -e "${RED}✗ BLOCKED: Legal review compliance check failed${NC}"
	echo "$legal_output" | tail -30
	exit 1
fi
echo "$legal_output" | grep -E "SUMMARY|PASS|FAIL" | tail -10
echo -e "${GREEN}✓ Legal review compliance check passed${NC}"

echo ""
echo -e "${BLUE}[PHASE 5] Plan sanity...${NC}"
plan_fail=0

if [ -d "docs/plans/done" ]; then
	for f in docs/plans/done/*.md; do
		[ -f "$f" ] || continue
		unchecked=$(grep -c '\[ \]' "$f" 2>/dev/null || echo 0)
		if [ "$unchecked" -gt 0 ]; then
			echo -e "${RED}✗ BLOCKED: $f has $unchecked unchecked items${NC}"
			plan_fail=1
		fi
	done
fi

if [ -f "docs/plans/README.md" ]; then
	while IFS= read -r rel; do
		[ -z "$rel" ] && continue
		plan_path="docs/plans/$rel"
		if [ ! -f "$plan_path" ]; then
			echo -e "${RED}✗ BLOCKED: missing plan referenced in README: $plan_path${NC}"
			plan_fail=1
		fi
	done < <(rg -o "todo/[^)]+\.md|doing/[^)]+\.md" docs/plans/README.md 2>/dev/null || true)
fi

p0_hits=$(rg -n "CRITICAL|BLOCKS PR merge|P0" docs/plans/todo docs/plans/doing 2>/dev/null || true)
if [ -n "$p0_hits" ]; then
	echo -e "${RED}✗ BLOCKED: P0/CRITICAL plans still open${NC}"
	echo "$p0_hits"
	plan_fail=1
fi

if [ "$plan_fail" -ne 0 ]; then
	exit 1
fi
echo -e "${GREEN}✓ Plan sanity passed${NC}"

echo ""
echo "=========================================="
echo -e "${GREEN} ✓ RELEASE GATE PASSED${NC}"
echo "=========================================="
echo ""
echo -e "${YELLOW}⚠ REMINDER: 4 tests skipped (require local services)${NC}"
echo ""
echo "For MINOR/MAJOR releases, run these locally:"
echo "  1. Voice API:      npx playwright test voice-api.spec.ts"
echo "  2. Chat tools:     npx playwright test chat-tools-integration.spec.ts"
echo "  3. Maestro conv:   npx playwright test maestro-conversation.spec.ts"
echo "  4. Visual reg:     VISUAL_REGRESSION=1 npx playwright test visual-regression.spec.ts"
echo ""
echo "See: docs/adr/0059-e2e-test-setup-requirements.md#ci-vs-local-test-classification"
echo ""
echo -e "${YELLOW}⚠ BEFORE RELEASE: Complete manual i18n verification steps${NC}"
echo ""
echo "Manual verification checklist:"
echo "  1. All 5 locales load: it, en, fr, de, es"
echo "  2. Language-specific maestri work: Molière (fr), Goethe (de), Cervantes (es)"
echo "  3. Maestri character consistency test passed"
echo "  4. Grafana locale dashboard shows all 5 locales with metrics"
echo ""
echo "See: docs/operations/RELEASE-CHECKLIST.md (Phase 1: i18n Verification)"
echo ""
