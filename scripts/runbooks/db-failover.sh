#!/usr/bin/env bash
# DB Failover Runbook - MirrorBuddy
# Diagnoses and recovers from database connectivity issues.
# Plan 105 - W5-Alerting [T5-05]
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
DRY_RUN=false

[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true && echo -e "${YELLOW}DRY RUN MODE${NC}"

echo "=== DB Failover Runbook ==="
echo "Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

# Step 1: Check pgBouncer (pooler) connectivity
echo -e "${YELLOW}Step 1: Testing pgBouncer connectivity (port 6543)...${NC}"
if [[ -z "${DATABASE_URL:-}" ]]; then
	echo -e "${RED}ERROR: DATABASE_URL not set. Source .env first.${NC}"
	echo "  Run: source .env && bash scripts/runbooks/db-failover.sh"
	exit 1
fi

if $DRY_RUN; then
	echo "  [DRY RUN] Would test: psql \$DATABASE_URL -c 'SELECT 1'"
else
	if psql "$DATABASE_URL" -c "SELECT 1" &>/dev/null; then
		echo -e "${GREEN}  pgBouncer: OK${NC}"
	else
		echo -e "${RED}  pgBouncer: FAILED${NC}"
		echo ""
		echo -e "${YELLOW}Step 2: Testing direct connection (port 5432)...${NC}"
		DIRECT_URL="${DATABASE_URL//:6543/:5432}"
		if psql "$DIRECT_URL" -c "SELECT 1" &>/dev/null; then
			echo -e "${GREEN}  Direct connection: OK${NC}"
			echo -e "${YELLOW}  ACTION: pgBouncer is down. Use direct URL temporarily.${NC}"
			echo "  Update DATABASE_URL in Vercel dashboard to use port 5432"
			echo "  Then redeploy: vercel --prod"
		else
			echo -e "${RED}  Direct connection: ALSO FAILED${NC}"
			echo "  ACTION: Database is unreachable. Check Supabase dashboard."
			echo "  URL: https://supabase.com/dashboard"
		fi
		exit 1
	fi
fi

# Step 3: Check connection pool stats
echo ""
echo -e "${YELLOW}Step 3: Checking active connections...${NC}"
if $DRY_RUN; then
	echo "  [DRY RUN] Would query pg_stat_activity"
else
	psql "$DATABASE_URL" -c "
    SELECT state, count(*)
    FROM pg_stat_activity
    WHERE datname = current_database()
    GROUP BY state
    ORDER BY count DESC;
  " 2>/dev/null || echo "  Could not query connection stats"
fi

# Step 4: Verify health endpoint
echo ""
echo -e "${YELLOW}Step 4: Verifying /api/health...${NC}"
HEALTH_URL="${PRODUCTION_URL:-https://mirrorbuddy.app}/api/health"
if $DRY_RUN; then
	echo "  [DRY RUN] Would curl $HEALTH_URL"
else
	HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")
	if [[ "$HTTP_CODE" == "200" ]]; then
		echo -e "${GREEN}  Health endpoint: OK ($HTTP_CODE)${NC}"
	else
		echo -e "${RED}  Health endpoint: FAILED ($HTTP_CODE)${NC}"
	fi
fi

echo ""
echo -e "${GREEN}=== Runbook complete ===${NC}"
