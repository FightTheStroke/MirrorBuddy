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

if ! command -v rg &> /dev/null; then
  echo -e "${RED}✗ BLOCKED: ripgrep (rg) is required${NC}"
  exit 1
fi

echo ""
echo "=========================================="
echo " RELEASE GATE (10/10) - MIRRORBUDDY"
echo "=========================================="
echo ""

echo -e "${BLUE}[PHASE 0] Pre-release checks...${NC}"
npm run pre-release

echo ""
echo -e "${BLUE}[PHASE 1] TypeScript rigor...${NC}"
ts_ignore=$(rg -n "@ts-ignore|@ts-nocheck" src -g "*.ts" -g "*.tsx" 2>/dev/null || true)
if [ -n "$ts_ignore" ]; then
  echo -e "${RED}✗ BLOCKED: @ts-ignore/@ts-nocheck found${NC}"
  echo "$ts_ignore"
  exit 1
fi

prod_any=$(rg --type ts --type tsx ": any\b|as any\b" src -g '!**/__tests__/**' -g '!*.test.*' --no-heading 2>/dev/null | rg -v "//.*any\b|has any\b|avoid.*any\b" || true)
if [ -n "$prod_any" ]; then
  echo -e "${RED}✗ BLOCKED: 'any' in production code${NC}"
  echo "$prod_any" | head -20
  exit 1
fi

api_routes=$(find src/app/api -name "route.ts" 2>/dev/null | wc -l | tr -d ' ')
zod_routes=$(rg -l "from ['\"]zod['\"]" src/app/api/**/route.ts 2>/dev/null | wc -l | tr -d ' ')
if [ "$api_routes" -ne "$zod_routes" ]; then
  echo -e "${RED}✗ BLOCKED: $((api_routes - zod_routes)) API routes missing Zod validation${NC}"
  echo "API routes with Zod: $zod_routes / $api_routes"
  exit 1
fi
echo -e "${GREEN}✓ TypeScript rigor passed${NC}"

echo ""
echo -e "${BLUE}[PHASE 2] Unit tests + coverage...${NC}"
npm run test:coverage

echo ""
echo -e "${BLUE}[PHASE 3] E2E tests...${NC}"
npm run test

echo ""
echo -e "${BLUE}[PHASE 4] Performance (warnings=fail)...${NC}"
perf_output=$(./scripts/perf-check.sh 2>&1 || true)
echo "$perf_output"
if echo "$perf_output" | rg -q "PERFORMANCE CHECKS FAILED"; then
  exit 1
fi
if echo "$perf_output" | rg -q "PASSED WITH WARNINGS"; then
  echo -e "${RED}✗ BLOCKED: performance warnings are not allowed${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Performance checks strict${NC}"

echo ""
echo -e "${BLUE}[PHASE 5] File size strict...${NC}"
./scripts/check-file-size.sh --strict

echo ""
echo -e "${BLUE}[PHASE 6] Plan sanity...${NC}"
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
