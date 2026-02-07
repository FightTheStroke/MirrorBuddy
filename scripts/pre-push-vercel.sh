#!/usr/bin/env bash
# =============================================================================
# PRE-PUSH VERCEL SIMULATION
# Simulates Vercel's fresh build environment to catch deployment-breaking
# issues before pushing. Focuses on what ONLY this hook can catch.
#
# Redundant checks removed (covered elsewhere):
# - lint/typecheck: pre-commit (lint-staged) + build (implicit)
# - npm audit: dependency-review.yml (PR) + weekly-security-audit.yml
# - CSRF/TODOs/console.log: ESLint rules in pre-commit
# - secrets: secrets-scan.sh in pre-commit
#
# Usage: ./scripts/pre-push-vercel.sh
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo ""
echo "=========================================="
echo " VERCEL PRE-PUSH CHECK"
echo "=========================================="
echo ""

START_TIME=$(date +%s)

# =============================================================================
# PHASE 0: .next/lock GUARD
# Prevents "Unable to acquire lock at .next/lock" when next dev/build is running
# =============================================================================
if [ -f ".next/lock" ]; then
	# Check for active Next.js processes (build or dev)
	NEXT_PIDS=$(pgrep -f 'next (build|dev)' 2>/dev/null || true)
	if [ -n "$NEXT_PIDS" ]; then
		echo -e "${RED}✗ Active Next.js process detected (PIDs: ${NEXT_PIDS//$'\n'/, })${NC}"
		echo -e "${YELLOW}  .next/lock is held by a running next build or next dev.${NC}"
		echo -e "${YELLOW}  Stop the process first:  kill ${NEXT_PIDS//$'\n'/ }${NC}"
		echo -e "${YELLOW}  Or wait for it to finish, then push again.${NC}"
		exit 1
	else
		echo -e "${YELLOW}⚠ Stale .next/lock found (no active Next.js process). Removing...${NC}"
		rm -f ".next/lock"
	fi
fi

# =============================================================================
# PHASE 1/4: MIGRATION & PROXY CONSISTENCY
# =============================================================================
echo -e "${BLUE}[1/4] Checking migration & proxy consistency...${NC}"

# Verify all migrations are named correctly (with timestamp)
INVALID_MIGRATIONS=$(ls prisma/migrations 2>/dev/null | grep -v "^[0-9]\{14\}_" | grep -v "migration_lock.toml" | grep -v ".DS_Store" || true)
if [ -n "$INVALID_MIGRATIONS" ]; then
	echo -e "${RED}✗ Invalid migration folder names (must be YYYYMMDDHHMMSS_name):${NC}"
	echo "$INVALID_MIGRATIONS"
	echo -e "${YELLOW}Fix: Rename to include timestamp, e.g., 20260120120000_my_migration${NC}"
	exit 1
fi
echo -e "${GREEN}✓ Migration naming OK${NC}"

# Check for duplicate proxy.ts files (Next.js 16 requirement - ADR 0066)
if [ -f "./proxy.ts" ]; then
	echo -e "${RED}✗ Root /proxy.ts found - FORBIDDEN when app is in /src/${NC}"
	echo -e "${YELLOW}Fix: Delete /proxy.ts - only /src/proxy.ts should exist${NC}"
	exit 1
fi
echo -e "${GREEN}✓ Proxy architecture OK${NC}"

# =============================================================================
# PHASE 2/4: FRESH PRISMA (simulates Vercel)
# =============================================================================
echo -e "${BLUE}[2/4] Simulating Vercel fresh Prisma...${NC}"

# Delete cached Prisma client to simulate Vercel's fresh build
rm -rf node_modules/.prisma 2>/dev/null || true

# Regenerate Prisma client
if ! npx prisma generate >"$TEMP_DIR/prisma.log" 2>&1; then
	echo -e "${RED}✗ Prisma generate failed${NC}"
	cat "$TEMP_DIR/prisma.log"
	exit 1
fi
echo -e "${GREEN}✓ Prisma generated fresh${NC}"

# =============================================================================
# PHASE 3/4: PRODUCTION BUILD
# =============================================================================
echo -e "${BLUE}[3/4] Production build (fresh Prisma)...${NC}"

# Disable Sentry wrapper locally (Sentry+Turbopack bug with Next.js 16)
# Sentry works fine on Vercel where Turbopack behaves differently
if ! DISABLE_SENTRY_BUILD=true npm run build >"$TEMP_DIR/build.log" 2>&1; then
	echo -e "${RED}✗ Build failed${NC}"
	cat "$TEMP_DIR/build.log"
	exit 1
fi
echo -e "${GREEN}✓ Build passed${NC}"

# =============================================================================
# PHASE 4/4: VERCEL ENV VARS CHECK
# =============================================================================
echo -e "${BLUE}[4/4] Vercel environment variables...${NC}"

# Skip Vercel env check in worktrees (not linked to Vercel project)
if [ "${SKIP_VERCEL_ENV_CHECK:-}" = "1" ]; then
	echo -e "${YELLOW}⚠ Vercel env check skipped (SKIP_VERCEL_ENV_CHECK=1)${NC}"
# Check if vercel CLI is available
elif command -v vercel &>/dev/null; then
	# Required env vars for production
	REQUIRED_VARS=(
		"DATABASE_URL"
		"ADMIN_EMAIL"
		"ADMIN_PASSWORD"
		"SESSION_SECRET"
		"CRON_SECRET"
		"SUPABASE_CA_CERT"
		"AZURE_OPENAI_API_KEY"
		"NEXT_PUBLIC_SITE_URL"
	)

	VERCEL_VARS=$(vercel env ls 2>/dev/null | awk '{print $1}' | tail -n +3 || echo "")
	MISSING_VARS=""

	for var in "${REQUIRED_VARS[@]}"; do
		if ! echo "$VERCEL_VARS" | grep -q "^$var$"; then
			MISSING_VARS="$MISSING_VARS $var"
		fi
	done

	if [ -n "$MISSING_VARS" ]; then
		echo -e "${RED}✗ Missing Vercel env vars:${NC}$MISSING_VARS"
		echo -e "${YELLOW}Add with: vercel env add <name> production${NC}"
		exit 1
	fi
	echo -e "${GREEN}✓ Vercel env vars OK${NC}"

	# Check for corrupted env vars (literal \n at end)
	vercel env pull "$TEMP_DIR/vercel-env.txt" --environment=production >/dev/null 2>&1 || true
	if [ -f "$TEMP_DIR/vercel-env.txt" ]; then
		CORRUPTED_VARS=$(grep '\\n"$' "$TEMP_DIR/vercel-env.txt" | cut -d'=' -f1 || true)
		if [ -n "$CORRUPTED_VARS" ]; then
			echo -e "${RED}✗ Env vars with literal \\n (corrupted):${NC}"
			echo "$CORRUPTED_VARS"
			echo -e "${YELLOW}Fix: vercel env rm <name> production && printf '%s' 'value' | vercel env add <name> production${NC}"
			exit 1
		fi
		echo -e "${GREEN}✓ No corrupted env vars${NC}"
	fi
else
	echo -e "${YELLOW}⚠ Vercel CLI not found, skipping env check${NC}"
fi

# =============================================================================
# SUMMARY
# =============================================================================
END_TIME=$(date +%s)
TOTAL=$((END_TIME - START_TIME))

echo ""
echo "=========================================="
echo -e "${GREEN} ✓ PRE-PUSH VERCEL CHECK PASSED${NC}"
echo " Total time: ${TOTAL}s"
echo "=========================================="
echo ""
echo "Safe to push to GitHub/Vercel."
