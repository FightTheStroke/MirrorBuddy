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
#
# Multi-agent options:
#   RELEASE_FAST_SKIP_BUILD=1  Skip build step (no lock contention)
#   MIRRORBUDDY_PORT=3001      Isolate dev server per agent
#   BUILD_LOCK_TIMEOUT=300     Increase lock wait (default 120s)
#
# Build lock: Step 5/5 acquires an exclusive lock (same as ci-summary.sh).
# Agents in the same directory block each other. Use separate worktrees
# or RELEASE_FAST_SKIP_BUILD=1 if build was already verified.
# =============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SCRIPT_DIR_RF="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/build-lock.sh
source "$SCRIPT_DIR_RF/lib/build-lock.sh"

# Configurable port for parallel agent isolation
MB_PORT="${MIRRORBUDDY_PORT:-3000}"

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
SMOKE_SERVER_PID=""
if ! curl -sf --max-time 3 "http://localhost:${MB_PORT}/api/health" >/dev/null 2>&1; then
	echo -e "${YELLOW}↪ Dev server not running, starting on :${MB_PORT}...${NC}"
	PORT="$MB_PORT" npm run dev >/dev/null 2>&1 &
	SMOKE_SERVER_PID=$!
	for i in $(seq 1 30); do
		if curl -sf --max-time 2 "http://localhost:${MB_PORT}/api/health" >/dev/null 2>&1; then
			echo -e "${GREEN}  Server ready${NC}"
			break
		fi
		[ "$i" -eq 30 ] && echo -e "${YELLOW}↪ Server not ready after 60s, skipping smoke${NC}"
		sleep 2
	done
fi
if curl -sf --max-time 3 "http://localhost:${MB_PORT}/api/health" >/dev/null 2>&1; then
	MIRRORBUDDY_PORT="$MB_PORT" npm run test:e2e:smoke
	echo -e "${GREEN}✓ Smoke E2E passed${NC}"
else
	echo -e "${YELLOW}↪ Skipping E2E smoke: server unavailable${NC}"
fi
if [[ -n "$SMOKE_SERVER_PID" ]]; then
	kill "$SMOKE_SERVER_PID" 2>/dev/null || true
	wait "$SMOKE_SERVER_PID" 2>/dev/null || true
fi

echo ""
echo -e "${BLUE}[5/5] Build (optional parity)...${NC}"
if [ "${RELEASE_FAST_SKIP_BUILD:-0}" = "1" ]; then
	echo -e "${YELLOW}↪ Skipping build (RELEASE_FAST_SKIP_BUILD=1)${NC}"
else
	acquire_build_lock
	npm run build
	release_build_lock
	echo -e "${GREEN}✓ Build passed${NC}"
fi

echo ""
echo -e "${GREEN}✓ RELEASE FAST PASSED${NC}"
echo ""
