#!/usr/bin/env bash
# Service Restart Runbook - MirrorBuddy
# Redeploys the latest commit to Vercel production.
# Plan 105 - W5-Alerting [T5-05]
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
DRY_RUN=false

[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true && echo -e "${YELLOW}DRY RUN MODE${NC}"

echo "=== Service Restart Runbook ==="
echo "Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

# Step 1: Show current deployment info
echo -e "${YELLOW}Step 1: Current deployment status...${NC}"
if $DRY_RUN; then
	echo "  [DRY RUN] Would run: vercel ls --limit 3"
else
	if command -v vercel &>/dev/null; then
		vercel ls --limit 3 2>/dev/null || echo "  Could not list deployments"
	else
		echo -e "${RED}  ERROR: vercel CLI not installed${NC}"
		echo "  Install: npm i -g vercel"
		exit 1
	fi
fi

# Step 2: Trigger redeploy
echo ""
echo -e "${YELLOW}Step 2: Redeploying latest commit to production...${NC}"
if $DRY_RUN; then
	echo "  [DRY RUN] Would run: vercel --prod"
else
	vercel --prod --yes 2>&1 | tail -5
	echo -e "${GREEN}  Redeploy triggered${NC}"
fi

# Step 3: Wait and verify health
echo ""
echo -e "${YELLOW}Step 3: Waiting 45s for deployment...${NC}"
if ! $DRY_RUN; then
	sleep 45
fi

HEALTH_URL="${PRODUCTION_URL:-https://mirrorbuddy.app}/api/health"
echo -e "${YELLOW}Step 4: Verifying health endpoint...${NC}"
if $DRY_RUN; then
	echo "  [DRY RUN] Would curl $HEALTH_URL"
else
	HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")
	if [[ "$HTTP_CODE" == "200" ]]; then
		echo -e "${GREEN}  Health: OK ($HTTP_CODE)${NC}"
	else
		echo -e "${RED}  Health: FAILED ($HTTP_CODE)${NC}"
		echo "  Consider running: bash scripts/runbooks/rollback.sh"
		exit 1
	fi
fi

echo ""
echo -e "${GREEN}=== Service restart complete ===${NC}"
