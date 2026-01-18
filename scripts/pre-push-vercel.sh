#!/usr/bin/env bash
# =============================================================================
# PRE-PUSH VERCEL SIMULATION
# Simulates Vercel's fresh build environment to catch Prisma type issues
# before pushing. Runs in ~30s on M3 Max.
#
# Usage: ./scripts/pre-push-vercel.sh
#        OR as git hook: cp scripts/pre-push-vercel.sh .git/hooks/pre-push
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
# PHASE 1: SIMULATE FRESH PRISMA (like Vercel)
# =============================================================================
echo -e "${BLUE}[1/4] Simulating Vercel fresh Prisma...${NC}"

# Delete cached Prisma client to simulate Vercel's fresh build
rm -rf node_modules/.prisma 2>/dev/null || true

# Regenerate Prisma client
if ! npx prisma generate > "$TEMP_DIR/prisma.log" 2>&1; then
    echo -e "${RED}✗ Prisma generate failed${NC}"
    cat "$TEMP_DIR/prisma.log"
    exit 1
fi
echo -e "${GREEN}✓ Prisma generated fresh${NC}"

# =============================================================================
# PHASE 2: PARALLEL CHECKS (lint + typecheck + audit)
# =============================================================================
echo -e "${BLUE}[2/4] Parallel checks (lint, typecheck, audit)...${NC}"

(
    npm run lint > "$TEMP_DIR/lint.log" 2>&1
    echo $? > "$TEMP_DIR/lint.exit"
) &
LINT_PID=$!

(
    npm run typecheck > "$TEMP_DIR/typecheck.log" 2>&1
    echo $? > "$TEMP_DIR/typecheck.exit"
) &
TYPE_PID=$!

(
    npm audit --audit-level=high > "$TEMP_DIR/audit.log" 2>&1
    echo $? > "$TEMP_DIR/audit.exit"
) &
AUDIT_PID=$!

# Wait with progress
echo -n "   Running: "
while kill -0 $LINT_PID 2>/dev/null || kill -0 $TYPE_PID 2>/dev/null || kill -0 $AUDIT_PID 2>/dev/null; do
    echo -n "."
    sleep 0.3
done
echo " done"

# Check results
LINT_EXIT=$(cat "$TEMP_DIR/lint.exit" 2>/dev/null || echo 1)
TYPE_EXIT=$(cat "$TEMP_DIR/typecheck.exit" 2>/dev/null || echo 1)
AUDIT_EXIT=$(cat "$TEMP_DIR/audit.exit" 2>/dev/null || echo 1)

FAILED=0

if [ "$LINT_EXIT" -ne 0 ]; then
    echo -e "${RED}✗ ESLint failed${NC}"
    cat "$TEMP_DIR/lint.log"
    FAILED=1
else
    echo -e "${GREEN}✓ ESLint passed${NC}"
fi

if [ "$TYPE_EXIT" -ne 0 ]; then
    echo -e "${RED}✗ TypeScript failed${NC}"
    cat "$TEMP_DIR/typecheck.log"
    FAILED=1
else
    echo -e "${GREEN}✓ TypeScript passed${NC}"
fi

if [ "$AUDIT_EXIT" -ne 0 ]; then
    echo -e "${RED}✗ Security audit failed${NC}"
    cat "$TEMP_DIR/audit.log"
    FAILED=1
else
    echo -e "${GREEN}✓ Security audit passed${NC}"
fi

[ $FAILED -ne 0 ] && exit 1

# =============================================================================
# PHASE 3: BUILD (like Vercel)
# =============================================================================
echo -e "${BLUE}[3/4] Production build (fresh Prisma)...${NC}"

if ! npm run build > "$TEMP_DIR/build.log" 2>&1; then
    echo -e "${RED}✗ Build failed${NC}"
    cat "$TEMP_DIR/build.log"
    exit 1
fi
echo -e "${GREEN}✓ Build passed${NC}"

# =============================================================================
# PHASE 4: QUALITY CHECKS (CI parity)
# =============================================================================
echo -e "${BLUE}[4/4] Quality checks...${NC}"

# Check for TODOs in critical areas (same as CI)
CRITICAL=$(find src/lib/privacy src/lib/safety src/lib/security \( -name "*.ts" -o -name "*.tsx" \) -exec grep -nE '\bTODO\b|\bFIXME\b' {} + 2>/dev/null || true)
if [ -n "$CRITICAL" ]; then
    echo -e "${RED}✗ TODOs in critical areas${NC}"
    echo "$CRITICAL"
    exit 1
fi
echo -e "${GREEN}✓ No critical TODOs${NC}"

# Check for console.log (same as CI)
LOGS=$(find src/ \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/__tests__/*" ! -path "*/test/*" ! -name "*.test.ts" ! -name "*.test.tsx" ! -name "setup.ts" -exec grep -n "console\.log" {} + 2>/dev/null | grep -v "logger" | grep -v " \* " | grep -v "//" || true)
if [ -n "$LOGS" ]; then
    echo -e "${RED}✗ console.log found (use logger)${NC}"
    echo "$LOGS" | head -10
    exit 1
fi
echo -e "${GREEN}✓ No console.log${NC}"

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
