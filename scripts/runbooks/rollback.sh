#!/usr/bin/env bash
# Rollback Runbook - MirrorBuddy
# Promotes the previous Vercel deployment to production.
# Plan 105 - W5-Alerting [T5-05]
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
DRY_RUN=false

[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true && echo -e "${YELLOW}DRY RUN MODE${NC}"

echo "=== Rollback Runbook ==="
echo "Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

# Step 1: List recent deployments
echo -e "${YELLOW}Step 1: Recent deployments...${NC}"
if ! command -v vercel &>/dev/null; then
	echo -e "${RED}ERROR: vercel CLI not installed${NC}"
	echo "Install: npm i -g vercel"
	exit 1
fi

if $DRY_RUN; then
	echo "  [DRY RUN] Would run: vercel ls --limit 5"
else
	vercel ls --limit 5 2>/dev/null || echo "  Could not list deployments"
fi

# Step 2: Identify previous production deployment
echo ""
echo -e "${YELLOW}Step 2: Finding previous production deployment...${NC}"
if $DRY_RUN; then
	echo "  [DRY RUN] Would identify second-most-recent production URL"
	echo "  Then run: vercel promote <deployment-url>"
else
	# Get the second production deployment (the one before current)
	PREV_URL=$(vercel ls --limit 10 2>/dev/null |
		grep -i "production" |
		awk 'NR==2 {print $2}' || echo "")

	if [[ -z "$PREV_URL" ]]; then
		echo -e "${RED}  Could not find previous production deployment${NC}"
		echo "  Manual rollback: vercel promote <deployment-url>"
		echo "  List deployments: vercel ls --limit 10"
		exit 1
	fi

	echo "  Previous deployment: $PREV_URL"
	echo ""
	echo -e "${YELLOW}Step 3: Promoting previous deployment...${NC}"
	vercel promote "$PREV_URL" --yes 2>&1 | tail -3
	echo -e "${GREEN}  Rollback triggered${NC}"
fi

# Step 4: Verify health
echo ""
echo -e "${YELLOW}Step 4: Waiting 30s then verifying health...${NC}"
if ! $DRY_RUN; then
	sleep 30
fi

HEALTH_URL="${PRODUCTION_URL:-https://mirrorbuddy.app}/api/health"
if $DRY_RUN; then
	echo "  [DRY RUN] Would curl $HEALTH_URL"
else
	HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")
	if [[ "$HTTP_CODE" == "200" ]]; then
		echo -e "${GREEN}  Health: OK ($HTTP_CODE) - Rollback successful${NC}"
	else
		echo -e "${RED}  Health: FAILED ($HTTP_CODE)${NC}"
		echo "  Manual intervention required. Check Vercel dashboard."
	fi
fi

echo ""
echo -e "${GREEN}=== Rollback complete ===${NC}"
