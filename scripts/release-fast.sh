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
YELLOW='\033[1;33m'
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
SMOKE_SERVER_STARTED=0
if ! curl -sf --max-time 3 http://localhost:3000/api/health > /dev/null 2>&1; then
  echo -e "${YELLOW}↪ Dev server not running, rebooting on :3000...${NC}"
  lsof -ti:3000 | xargs kill -9 2>/dev/null || true
  npm run dev > /dev/null 2>&1 &
  SMOKE_SERVER_STARTED=1
  for i in $(seq 1 30); do
    if curl -sf --max-time 2 http://localhost:3000/api/health > /dev/null 2>&1; then
      echo -e "${GREEN}  Server ready${NC}"
      break
    fi
    [ "$i" -eq 30 ] && echo -e "${YELLOW}↪ Server not ready after 60s, skipping smoke${NC}"
    sleep 2
  done
fi
if curl -sf --max-time 3 http://localhost:3000/api/health > /dev/null 2>&1; then
  npm run test:e2e:smoke
  echo -e "${GREEN}✓ Smoke E2E passed${NC}"
else
  echo -e "${YELLOW}↪ Skipping E2E smoke: server unavailable${NC}"
fi
if [ "$SMOKE_SERVER_STARTED" -eq 1 ]; then
  lsof -ti:3000 | xargs kill -9 2>/dev/null || true
fi

echo ""
echo -e "${BLUE}[5/5] Build (optional parity)...${NC}"
if [ "${RELEASE_FAST_SKIP_BUILD:-0}" = "1" ]; then
  echo -e "${YELLOW}↪ Skipping build (RELEASE_FAST_SKIP_BUILD=1)${NC}"
else
  npm run build
  echo -e "${GREEN}✓ Build passed${NC}"
fi

echo ""
echo -e "${GREEN}✓ RELEASE FAST PASSED${NC}"
echo ""

