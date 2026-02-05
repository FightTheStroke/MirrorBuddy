#!/usr/bin/env bash
# Cache Flush Runbook - MirrorBuddy
# Clears in-memory caches by triggering a Vercel redeploy.
# No Redis/Upstash currently in use; all caches are in-memory (serverless).
# Plan 105 - W5-Alerting [T5-05]
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
DRY_RUN=false

[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true && echo -e "${YELLOW}DRY RUN MODE${NC}"

echo "=== Cache Flush Runbook ==="
echo "Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""
echo "MirrorBuddy uses in-memory caches only (no Redis)."
echo "Flushing = redeploying all serverless functions."
echo ""

# Step 1: Trigger redeploy
echo -e "${YELLOW}Step 1: Triggering Vercel redeploy...${NC}"
if $DRY_RUN; then
	echo "  [DRY RUN] Would run: vercel --prod"
else
	if command -v vercel &>/dev/null; then
		vercel --prod --yes 2>&1 | tail -5
		echo -e "${GREEN}  Redeploy triggered${NC}"
	else
		echo -e "${RED}  ERROR: vercel CLI not installed${NC}"
		echo "  Install: npm i -g vercel"
		exit 1
	fi
fi

# Step 2: Wait and verify
echo ""
echo -e "${YELLOW}Step 2: Waiting 30s for deployment...${NC}"
if ! $DRY_RUN; then
	sleep 30
fi

HEALTH_URL="${PRODUCTION_URL:-https://mirrorbuddy.app}/api/health"
echo -e "${YELLOW}Step 3: Verifying health endpoint...${NC}"
if $DRY_RUN; then
	echo "  [DRY RUN] Would curl $HEALTH_URL"
else
	HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")
	if [[ "$HTTP_CODE" == "200" ]]; then
		echo -e "${GREEN}  Health: OK ($HTTP_CODE) - Caches cleared${NC}"
	else
		echo -e "${RED}  Health: FAILED ($HTTP_CODE)${NC}"
		echo "  Check Vercel dashboard for deployment status"
	fi
fi

echo ""
echo -e "${GREEN}=== Cache flush complete ===${NC}"
