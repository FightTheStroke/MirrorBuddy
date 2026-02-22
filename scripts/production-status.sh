#!/usr/bin/env bash
# production-status.sh — Check if MirrorBuddy production matches local version
# Usage: ./scripts/production-status.sh [--json]
set -euo pipefail

PROD_URL="https://mirrorbuddy.org"
JSON_MODE="${1:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Get local version from package.json
LOCAL_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")

# Get production version
PROD_RESPONSE=$(curl -sf "${PROD_URL}/api/version" 2>/dev/null || echo '{"error":"unreachable"}')
PROD_VERSION=$(echo "$PROD_RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('version','unknown'))" 2>/dev/null || echo "unreachable")
PROD_ENV=$(echo "$PROD_RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('environment','unknown'))" 2>/dev/null || echo "unknown")
BUILD_TIME=$(echo "$PROD_RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('buildTime','unknown'))" 2>/dev/null || echo "unknown")

# Get health status
HEALTH_RESPONSE=$(curl -sf "${PROD_URL}/api/health" 2>/dev/null || echo '{"status":"unreachable"}')
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('status','unknown'))" 2>/dev/null || echo "unreachable")
DB_STATUS=$(echo "$HEALTH_RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('checks',{}).get('database',{}).get('status','unknown'))" 2>/dev/null || echo "unknown")
DB_LATENCY=$(echo "$HEALTH_RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('checks',{}).get('database',{}).get('latency_ms','?'))" 2>/dev/null || echo "?")
AI_STATUS=$(echo "$HEALTH_RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('checks',{}).get('ai_provider',{}).get('status','unknown'))" 2>/dev/null || echo "unknown")

# Get latest CI run status
CI_STATUS="unknown"
CI_CONCLUSION="unknown"
if command -v gh &>/dev/null; then
  CI_INFO=$(gh api repos/FightTheStroke/MirrorBuddy/actions/runs --jq '.workflow_runs[] | select(.name == "CI" and .head_branch == "main") | "\(.status)|\(.conclusion // "")"' 2>/dev/null | head -1 || echo "unknown|unknown")
  CI_STATUS=$(echo "$CI_INFO" | cut -d'|' -f1)
  CI_CONCLUSION=$(echo "$CI_INFO" | cut -d'|' -f2)
fi

# Version alignment check
if [ "$LOCAL_VERSION" = "$PROD_VERSION" ]; then
  VERSION_ALIGNED="true"
  VERSION_ICON="✅"
else
  VERSION_ALIGNED="false"
  VERSION_ICON="⚠️"
fi

# JSON output
if [ "$JSON_MODE" = "--json" ]; then
  cat <<EOF
{
  "local_version": "$LOCAL_VERSION",
  "production_version": "$PROD_VERSION",
  "aligned": $VERSION_ALIGNED,
  "environment": "$PROD_ENV",
  "build_time": "$BUILD_TIME",
  "health": "$HEALTH_STATUS",
  "database": "$DB_STATUS",
  "db_latency_ms": "$DB_LATENCY",
  "ai_provider": "$AI_STATUS",
  "ci_status": "$CI_STATUS",
  "ci_conclusion": "$CI_CONCLUSION"
}
EOF
  exit 0
fi

# Human-readable output
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   MirrorBuddy Production Status          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${VERSION_ICON} Version alignment"
echo -e "     Local:      ${YELLOW}v${LOCAL_VERSION}${NC}"
echo -e "     Production: ${YELLOW}v${PROD_VERSION}${NC}"
if [ "$VERSION_ALIGNED" = "true" ]; then
  echo -e "     Status:     ${GREEN}ALIGNED${NC}"
else
  echo -e "     Status:     ${RED}MISALIGNED — deploy pending${NC}"
fi
echo ""

# Health
if [ "$HEALTH_STATUS" = "healthy" ]; then
  echo -e "  🟢 Health:     ${GREEN}${HEALTH_STATUS}${NC}"
else
  echo -e "  🔴 Health:     ${RED}${HEALTH_STATUS}${NC}"
fi

# Database
if [ "$DB_STATUS" = "pass" ]; then
  echo -e "  🟢 Database:   ${GREEN}connected${NC} (${DB_LATENCY}ms)"
else
  echo -e "  🔴 Database:   ${RED}${DB_STATUS}${NC}"
fi

# AI Provider
if [ "$AI_STATUS" = "pass" ]; then
  echo -e "  🟢 AI:         ${GREEN}operational${NC}"
else
  echo -e "  🔴 AI:         ${RED}${AI_STATUS}${NC}"
fi

# CI
if [ "$CI_CONCLUSION" = "success" ]; then
  echo -e "  🟢 CI (main):  ${GREEN}passing${NC}"
elif [ "$CI_STATUS" = "in_progress" ]; then
  echo -e "  🟡 CI (main):  ${YELLOW}running${NC}"
else
  echo -e "  🔴 CI (main):  ${RED}${CI_CONCLUSION}${NC}"
fi

echo ""
echo -e "  Build time:    ${BUILD_TIME}"
echo -e "  Environment:   ${PROD_ENV}"
echo ""
