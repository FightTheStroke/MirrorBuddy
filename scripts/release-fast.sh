#!/usr/bin/env bash
# =============================================================================
# RELEASE FAST (PR-like)
# Fast, high-signal checks for local iteration and PR gating.
#
# Goals:
# - Catch obvious regressions quickly
# - Avoid long-running full E2E / mobile / perf / docs audits
#
# Usage:
#   npm run release:fast
# =============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "=========================================="
echo " RELEASE FAST (PR-LIKE) - MIRRORBUDDY"
echo "=========================================="
echo ""

echo -e "${BLUE}[1/5] Lint + typecheck...${NC}"
npm run lint
npm run typecheck
echo -e "${GREEN}✓ Static checks passed${NC}"

echo ""
echo -e "${BLUE}[2/5] i18n completeness...${NC}"
npm run i18n:check
echo -e "${GREEN}✓ i18n passed${NC}"

echo ""
echo -e "${BLUE}[3/5] Unit tests...${NC}"
npm run test:unit
echo -e "${GREEN}✓ Unit tests passed${NC}"

echo ""
echo -e "${BLUE}[4/5] E2E smoke...${NC}"
npm run test:e2e:smoke
echo -e "${GREEN}✓ Smoke E2E passed${NC}"

echo ""
echo -e "${BLUE}[5/5] Build (optional parity)...${NC}"
npm run build
echo -e "${GREEN}✓ Build passed${NC}"

echo ""
echo -e "${GREEN}✓ RELEASE FAST PASSED${NC}"
echo ""

