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
# PHASE 0: MIGRATION CONSISTENCY CHECK
# =============================================================================
echo -e "${BLUE}[0/5] Checking migration consistency...${NC}"

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
# PHASE 1: SIMULATE FRESH PRISMA (like Vercel)
# =============================================================================
echo -e "${BLUE}[1/5] Simulating Vercel fresh Prisma...${NC}"

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
echo -e "${BLUE}[2/5] Parallel checks (lint, typecheck, audit)...${NC}"

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
echo -e "${BLUE}[3/5] Production build (fresh Prisma)...${NC}"

# Disable Sentry wrapper locally (Sentry+Turbopack bug with Next.js 16)
# Sentry works fine on Vercel where Turbopack behaves differently
if ! DISABLE_SENTRY_BUILD=true npm run build > "$TEMP_DIR/build.log" 2>&1; then
    echo -e "${RED}✗ Build failed${NC}"
    cat "$TEMP_DIR/build.log"
    exit 1
fi
echo -e "${GREEN}✓ Build passed${NC}"

# =============================================================================
# PHASE 4: VERCEL ENV VARS CHECK
# =============================================================================
echo -e "${BLUE}[4/6] Vercel environment variables...${NC}"

# Skip Vercel env check in worktrees (not linked to Vercel project)
if [ "${SKIP_VERCEL_ENV_CHECK:-}" = "1" ]; then
    echo -e "${YELLOW}⚠ Vercel env check skipped (SKIP_VERCEL_ENV_CHECK=1)${NC}"
# Check if vercel CLI is available
elif command -v vercel &> /dev/null; then
    # Required env vars for production
    REQUIRED_VARS=(
        "DATABASE_URL"
        "ADMIN_EMAIL"
        "ADMIN_PASSWORD"
        "SESSION_SECRET"
        "CRON_SECRET"
        "SUPABASE_CA_CERT"
        "AZURE_OPENAI_API_KEY"
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
    # This catches values incorrectly added with echo instead of printf
    vercel env pull "$TEMP_DIR/vercel-env.txt" --environment=production > /dev/null 2>&1 || true
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
# PHASE 5: QUALITY CHECKS (CI parity)
# =============================================================================
echo -e "${BLUE}[5/6] Quality checks...${NC}"

# CSRF Check: Ensure client-side POST/PUT/DELETE use csrfFetch (ADR 0053)
# ESLint already catches this, but explicit check provides clear error message
# Check: files with fetch() and POST/PUT/DELETE that don't import csrfFetch
CSRF_FILES=$(grep -rl "method.*POST\|method.*PUT\|method.*DELETE" src/components src/lib/hooks src/lib/stores src/lib/voice src/lib/tools src/lib/safety 2>/dev/null | grep -v "\.test\." | grep -v "__tests__" | grep -v "webrtc-" | grep -v "handlers/" | grep -v "server-" || true)
CSRF_VIOLATIONS=""
for file in $CSRF_FILES; do
    # If file has plain fetch( but no csrfFetch import, it's a violation
    if grep -q "[^a-zA-Z]fetch(" "$file" 2>/dev/null && ! grep -q "csrfFetch\|from.*csrf-client" "$file" 2>/dev/null; then
        CSRF_VIOLATIONS="$CSRF_VIOLATIONS\n$file"
    fi
done
if [ -n "$CSRF_VIOLATIONS" ]; then
    echo -e "${RED}✗ CSRF violation: Use csrfFetch for POST/PUT/DELETE requests${NC}"
    echo -e "${YELLOW}See ADR 0053: Vercel Runtime Constraints${NC}"
    echo -e "$CSRF_VIOLATIONS"
    exit 1
fi
echo -e "${GREEN}✓ CSRF protection OK${NC}"

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
# PHASE 6: SECRETS EXPOSURE CHECK
# =============================================================================
echo -e "${BLUE}[6/6] Secrets exposure check...${NC}"

# Check for exposed secrets in tracked files (excluding safe locations)
# Excludes: .env files, examples, tests, docs, CI configs (contain patterns for detection)
EXPOSED_SECRETS=""
for pattern in "sk_live_" "sk_test_" "GOCSPX-" "glc_ey" "re_[A-Za-z0-9]{20,}"; do
    FOUND=$(git grep -l "$pattern" -- ':!.env*' ':!*.example' ':!node_modules' ':!*.test.ts' ':!*.test.tsx' ':!__tests__' ':!docs/' ':!.github/' ':!scripts/' 2>/dev/null || true)
    if [ -n "$FOUND" ]; then
        EXPOSED_SECRETS="$EXPOSED_SECRETS\n$pattern found in: $FOUND"
    fi
done

if [ -n "$EXPOSED_SECRETS" ]; then
    echo -e "${RED}✗ Potential secrets exposed in tracked files:${NC}"
    echo -e "$EXPOSED_SECRETS"
    exit 1
fi
echo -e "${GREEN}✓ No exposed secrets${NC}"

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
