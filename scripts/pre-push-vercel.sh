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

SCRIPT_DIR_PPV="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/build-lock.sh
source "$SCRIPT_DIR_PPV/lib/build-lock.sh"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

echo ""
echo "=========================================="
echo " VERCEL PRE-PUSH CHECK"
echo "=========================================="
echo ""

START_TIME=$(date +%s)

# =============================================================================
# PHASE 1/5: MIGRATION & PROXY CONSISTENCY
# =============================================================================
echo -e "${BLUE}[1/5] Checking migration & proxy consistency...${NC}"

# Verify all migrations are named correctly (with timestamp)
INVALID_MIGRATIONS=$(ls prisma/migrations 2>/dev/null | /usr/bin/grep -v "^[0-9]\{14\}_" | /usr/bin/grep -v "migration_lock.toml" | /usr/bin/grep -v ".DS_Store" || true)
if [ -n "$INVALID_MIGRATIONS" ]; then
	echo -e "${RED}✗ Invalid migration folder names (must be YYYYMMDDHHMMSS_name):${NC}"
	echo "$INVALID_MIGRATIONS"
	echo -e "${YELLOW}Fix: Rename to include timestamp, e.g., 20260120120000_my_migration${NC}"
	exit 1
fi
echo -e "${GREEN}✓ Migration naming OK${NC}"

# Schema drift: every model/enum in prisma/schema/ must have a migration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if ! "$SCRIPT_DIR/check-schema-drift.sh" >"$TEMP_DIR/drift.log" 2>&1; then
	echo -e "${RED}✗ Schema drift detected - models without migrations${NC}"
	/usr/bin/grep "MISSING:" "$TEMP_DIR/drift.log" | head -10
	echo -e "${YELLOW}Fix: npx prisma migrate dev --name <name> --create-only${NC}"
	exit 1
fi
echo -e "${GREEN}✓ Schema drift OK${NC}"

# Check for duplicate proxy.ts files (Next.js 16 requirement - ADR 0066)
if [ -f "./proxy.ts" ]; then
	echo -e "${RED}✗ Root /proxy.ts found - FORBIDDEN when app is in /src/${NC}"
	echo -e "${YELLOW}Fix: Delete /proxy.ts - only /src/proxy.ts should exist${NC}"
	exit 1
fi
echo -e "${GREEN}✓ Proxy architecture OK${NC}"

# =============================================================================
# PHASE 2/5: FRESH PRISMA (simulates Vercel)
# =============================================================================
echo -e "${BLUE}[2/5] Simulating Vercel fresh Prisma...${NC}"

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
# PHASE 3/5: PRODUCTION BUILD
# =============================================================================
echo -e "${BLUE}[3/5] Production build (fresh Prisma)...${NC}"

acquire_build_lock

# Disable Sentry wrapper locally (Sentry+Turbopack bug with Next.js 16)
# Sentry works fine on Vercel where Turbopack behaves differently
if ! DISABLE_SENTRY_BUILD=true npm run build >"$TEMP_DIR/build.log" 2>&1; then
	release_build_lock
	echo -e "${RED}✗ Build failed${NC}"
	cat "$TEMP_DIR/build.log"
	exit 1
fi
release_build_lock
echo -e "${GREEN}✓ Build passed${NC}"

# =============================================================================
# PHASE 4/5: .env ↔ REQUIRED_VARS ALIGNMENT (ADR 0138)
# =============================================================================
echo -e "${BLUE}[4/5] Env var alignment (.env vs REQUIRED_VARS)...${NC}"

# Required env vars for production (single source of truth — ADR 0138)
REQUIRED_VARS=(
	# Core
	"DATABASE_URL" "DIRECT_URL" "SESSION_SECRET"
	"ADMIN_EMAIL" "ADMIN_PASSWORD" "CRON_SECRET"
	"TOKEN_ENCRYPTION_KEY" "PII_ENCRYPTION_KEY" "IP_HASH_SALT"
	# Azure AI
	"AZURE_OPENAI_API_KEY" "AZURE_OPENAI_ENDPOINT"
	"AZURE_OPENAI_CHAT_DEPLOYMENT" "AZURE_OPENAI_EMBEDDING_DEPLOYMENT"
	"AZURE_OPENAI_REALTIME_ENDPOINT" "AZURE_OPENAI_REALTIME_API_KEY"
	"AZURE_OPENAI_REALTIME_DEPLOYMENT" "AZURE_OPENAI_TTS_DEPLOYMENT"
	# Email
	"RESEND_API_KEY" "FROM_EMAIL" "SUPPORT_EMAIL"
	# Auth & OAuth
	"GOOGLE_CLIENT_ID" "GOOGLE_CLIENT_SECRET"
	"NEXT_PUBLIC_GOOGLE_CLIENT_ID" "NEXTAUTH_URL"
	# Push notifications
	"NEXT_PUBLIC_VAPID_PUBLIC_KEY" "VAPID_PRIVATE_KEY" "VAPID_SUBJECT"
	# Rate limiting
	"UPSTASH_REDIS_REST_URL" "UPSTASH_REDIS_REST_TOKEN"
	# Supabase
	"NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY"
	# Observability
	"NEXT_PUBLIC_SENTRY_DSN" "SENTRY_AUTH_TOKEN" "SENTRY_ORG" "SENTRY_PROJECT"
	"GRAFANA_CLOUD_PROMETHEUS_URL" "GRAFANA_CLOUD_PROMETHEUS_USER"
	"GRAFANA_CLOUD_API_KEY" "GRAFANA_CLOUD_PUSH_INTERVAL"
	# LiveKit
	"LIVEKIT_URL" "LIVEKIT_API_KEY" "LIVEKIT_API_SECRET" "NEXT_PUBLIC_LIVEKIT_URL"
	# Stripe
	"STRIPE_SECRET_KEY" "STRIPE_WEBHOOK_SECRET" "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
	# Misc
	"PROTECTED_USERS" "TRIAL_BUDGET_LIMIT_EUR" "BRAVE_SEARCH_API_KEY"
	# Public URLs
	"NEXT_PUBLIC_SITE_URL" "NEXT_PUBLIC_APP_URL"
	# Model defaults - optional, have code fallbacks
	"DEFAULT_CHAT_MODEL" "DEFAULT_CHAT_MODEL_EDU" "DEFAULT_CHAT_MODEL_PRO"
	"DEFAULT_DEMO_MODEL" "DEFAULT_EXTRACTOR_MODEL"
	# GPT-5 deployment names
	"AZURE_OPENAI_GPT5_NANO_DEPLOYMENT" "AZURE_OPENAI_GPT5_MINI_DEPLOYMENT"
	"AZURE_OPENAI_GPT52_CHAT_DEPLOYMENT" "AZURE_OPENAI_GPT52_EDU_DEPLOYMENT"
	"AZURE_OPENAI_REALTIME_DEPLOYMENT_MINI"
)

# Dev-only vars to skip (must match fix-vercel-env-vars.sh SKIP_VARS)
SKIP_PATTERNS="DEV_DATABASE_URL|TEST_DATABASE_URL|TEST_DIRECT_URL|OLLAMA_URL|OLLAMA_MODEL|NODE_TLS_REJECT_UNAUTHORIZED|VERCEL_TOKEN|APPLE_ID|TEAM_ID|ITC_TEAM_ID|FASTLANE_USER|MATCH_GIT_URL|MATCH_PASSWORD|POSTGRES_DATABASE|POSTGRES_HOST|POSTGRES_PASSWORD|POSTGRES_USER|SUPABASE_JWT_SECRET|SUPABASE_PUBLISHABLE_KEY|SUPABASE_SECRET_KEY|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"

# Check .env vars are all in REQUIRED_VARS (runs ALWAYS, no Vercel CLI needed)
if [ -f ".env" ]; then
	REQUIRED_SET=$(printf '%s\n' "${REQUIRED_VARS[@]}")
	UNREGISTERED=""

	# Build associative array for O(1) lookup (avoids grep alias issues)
	declare -A REQUIRED_MAP
	for _rv in "${REQUIRED_VARS[@]}"; do REQUIRED_MAP[$_rv]=1; done

	while IFS= read -r line; do
		[[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
		vn="${line%%=*}"
		if [[ "$vn" =~ ^($SKIP_PATTERNS)$ ]]; then continue; fi
		vv="${line#*=}"
		if [ -z "$vv" ]; then continue; fi
		if [[ -z "${REQUIRED_MAP[$vn]+x}" ]]; then
			UNREGISTERED="$UNREGISTERED $vn"
		fi
	done <.env

	if [ -n "$UNREGISTERED" ]; then
		echo -e "${RED}✗ .env has vars not in REQUIRED_VARS:${NC}$UNREGISTERED"
		echo -e "${YELLOW}Add them to REQUIRED_VARS in this script (see ADR 0138)${NC}"
		exit 1
	fi
	echo -e "${GREEN}✓ .env aligned with REQUIRED_VARS${NC}"
else
	echo -e "${YELLOW}⚠ .env not found, skipping alignment check${NC}"
fi

# =============================================================================
# PHASE 5/5: VERCEL REMOTE ENV VARS
# =============================================================================
echo -e "${BLUE}[5/5] Vercel remote env vars...${NC}"

if [ "${SKIP_VERCEL_ENV_CHECK:-}" = "1" ]; then
	echo -e "${YELLOW}⚠ Vercel env check skipped (SKIP_VERCEL_ENV_CHECK=1)${NC}"
elif command -v vercel &>/dev/null; then
	VERCEL_VARS=$(vercel env ls 2>/dev/null | awk '{print $1}' | tail -n +3 || echo "")
	MISSING_VARS=""

	for var in "${REQUIRED_VARS[@]}"; do
		if ! echo "$VERCEL_VARS" | /usr/bin/grep -q "^$var$"; then
			MISSING_VARS="$MISSING_VARS $var"
		fi
	done

	if [ -n "$MISSING_VARS" ]; then
		echo -e "${RED}✗ Missing Vercel env vars:${NC}$MISSING_VARS"
		echo -e "${YELLOW}Fix: ./scripts/fix-vercel-env-vars.sh${NC}"
		exit 1
	fi
	echo -e "${GREEN}✓ Vercel env vars OK${NC}"

	# Check for corrupted env vars (literal \n at end)
	vercel env pull "$TEMP_DIR/vercel-env.txt" --environment=production >/dev/null 2>&1 || true
	if [ -f "$TEMP_DIR/vercel-env.txt" ]; then
		CORRUPTED_VARS=$(/usr/bin/grep '\\n"$' "$TEMP_DIR/vercel-env.txt" | cut -d'=' -f1 || true)
		if [ -n "$CORRUPTED_VARS" ]; then
			echo -e "${RED}✗ Env vars with literal \\n (corrupted):${NC}"
			echo "$CORRUPTED_VARS"
			echo -e "${YELLOW}Fix: ./scripts/fix-vercel-env-vars.sh${NC}"
			exit 1
		fi
		echo -e "${GREEN}✓ No corrupted env vars${NC}"
	fi
else
	echo -e "${YELLOW}⚠ Vercel CLI not found, skipping remote check${NC}"
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
