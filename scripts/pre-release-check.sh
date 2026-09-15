#!/usr/bin/env bash
# =============================================================================
# PRE-RELEASE CHECK SCRIPT - PARALLELIZED FOR M3 MAX
# Runs all automated quality gates before release.
# Optimized for Apple Silicon with parallel execution.
#
# NOTE: set -e intentionally omitted — script uses background PIDs with
# manual exit code checks. set -e would break the wait+check pattern.
#
# Usage: npm run pre-release
# =============================================================================
set -uo pipefail

SCRIPT_DIR_PR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/build-lock.sh
source "$SCRIPT_DIR_PR/lib/build-lock.sh"
source "$SCRIPT_DIR_PR/lib/checks.sh"
cd "$SCRIPT_DIR_PR/.."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Temp directory for parallel job results
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

echo ""
echo "=========================================="
echo " MIRRORBUDDY - PRE-RELEASE CHECKS"
echo " Parallelized for M3 Max (14 cores)"
echo "=========================================="
echo ""

START_TIME=$(date +%s)

# =============================================================================
# PHASE 1: INSTANT CHECKS (< 1 second)
# =============================================================================
echo -e "${BLUE}[PHASE 1] Instant checks...${NC}"

# Documentation check (instant)
MISSING_DOCS=""
for doc in "README.md" "CHANGELOG.md" "CONTRIBUTING.md" "CLAUDE.md"; do
    [ ! -f "$doc" ] && MISSING_DOCS="$MISSING_DOCS $doc"
done
if [ -n "$MISSING_DOCS" ]; then
    echo -e "${RED}✗ Missing docs:$MISSING_DOCS${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Documentation exists${NC}"

exec_hygiene
cat "$_OUTPUT"
rm -f "$_OUTPUT"
if [ "$_EXIT" -ne 0 ]; then
    echo -e "${RED}✗ Code hygiene inspection failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Code hygiene passed${NC}"

PHASE1_TIME=$(date +%s)
echo -e "${BLUE}   Phase 1: $((PHASE1_TIME - START_TIME))s${NC}"
echo ""

# =============================================================================
# PHASE 1.5: i18n VALIDATION
# =============================================================================
echo -e "${BLUE}[PHASE 1.5] i18n completeness check...${NC}"

if ! npx tsx scripts/i18n-check.ts > "$TEMP_DIR/i18n.log" 2>&1; then
    echo -e "${RED}✗ i18n check failed${NC}"
    cat "$TEMP_DIR/i18n.log"
    exit 1
fi
cat "$TEMP_DIR/i18n.log"
echo -e "${GREEN}✓ i18n completeness passed${NC}"

PHASE1_5_TIME=$(date +%s)
echo -e "${BLUE}   Phase 1.5: $((PHASE1_5_TIME - PHASE1_TIME))s${NC}"
echo ""

# =============================================================================
# PHASE 2: PARALLEL STATIC ANALYSIS
# =============================================================================
echo -e "${BLUE}[PHASE 2] Parallel static analysis (lint + typecheck + audit)...${NC}"

# Run all three in parallel
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
    pnpm audit --audit-level=high > "$TEMP_DIR/audit.log" 2>&1
    echo $? > "$TEMP_DIR/audit.exit"
) &
AUDIT_PID=$!

# Wait for all with progress indicator
echo -n "   Running: "
while kill -0 $LINT_PID 2>/dev/null || kill -0 $TYPE_PID 2>/dev/null || kill -0 $AUDIT_PID 2>/dev/null; do
    echo -n "."
    sleep 0.5
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

PHASE2_TIME=$(date +%s)
echo -e "${BLUE}   Phase 2: $((PHASE2_TIME - PHASE1_TIME))s${NC}"
echo ""

# =============================================================================
# PHASE 3: PRODUCTION BUILD (uses all cores via Next.js)
# =============================================================================
echo -e "${BLUE}[PHASE 3] Production build...${NC}"

# Next.js automatically uses available cores
acquire_build_lock
if ! npm run build > "$TEMP_DIR/build.log" 2>&1; then
    release_build_lock
    echo -e "${RED}✗ Build failed${NC}"
    cat "$TEMP_DIR/build.log"
    exit 1
fi
if ! node "$SCRIPT_DIR_PR/prepare-standalone.mjs" > "$TEMP_DIR/standalone.log" 2>&1; then
    release_build_lock
    echo -e "${RED}✗ Standalone preparation failed${NC}"
    cat "$TEMP_DIR/standalone.log"
    exit 1
fi
release_build_lock
echo -e "${GREEN}✓ Build successful; standalone assets prepared${NC}"

PHASE3_TIME=$(date +%s)
echo -e "${BLUE}   Phase 3: $((PHASE3_TIME - PHASE2_TIME))s${NC}"
echo ""

# =============================================================================
# PHASE 4: PERFORMANCE VALIDATION
# =============================================================================
echo -e "${BLUE}[PHASE 4] Performance validation...${NC}"

if [ -f "./scripts/perf-check.sh" ]; then
    if ! ./scripts/perf-check.sh; then
        echo -e "${RED}✗ Performance checks failed${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Required perf-check.sh not found${NC}"
    exit 1
fi

PHASE4_TIME=$(date +%s)
echo -e "${BLUE}   Phase 4: $((PHASE4_TIME - PHASE3_TIME))s${NC}"
echo ""

# =============================================================================
# PHASE 5: FILE SIZE VALIDATION (warning only)
# =============================================================================
echo -e "${BLUE}[PHASE 5] File size validation...${NC}"

if [ -f "./scripts/check-file-size.sh" ]; then
    if ! ./scripts/check-file-size.sh; then
        echo -e "${RED}✗ File-size inventory failed${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Required check-file-size.sh not found${NC}"
    exit 1
fi

PHASE5_TIME=$(date +%s)
echo -e "${BLUE}   Phase 5: $((PHASE5_TIME - PHASE4_TIME))s${NC}"
echo ""

# =============================================================================
# SUMMARY
# =============================================================================
END_TIME=$(date +%s)
TOTAL=$((END_TIME - START_TIME))

echo "=========================================="
echo -e "${GREEN} ✓ ALL PRE-RELEASE CHECKS PASSED${NC}"
echo ""
echo " Phase 1 (instant):     $((PHASE1_TIME - START_TIME))s"
echo " Phase 1.5 (i18n):      $((PHASE1_5_TIME - PHASE1_TIME))s"
echo " Phase 2 (parallel):    $((PHASE2_TIME - PHASE1_5_TIME))s"
echo " Phase 3 (build):       $((PHASE3_TIME - PHASE2_TIME))s"
echo " Phase 4 (perf):        $((PHASE4_TIME - PHASE3_TIME))s"
echo " Phase 5 (size):        $((PHASE5_TIME - PHASE4_TIME))s"
echo " ─────────────────────────"
echo " Total:                 ${TOTAL}s"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Set the final release version before complete verification."
echo "  2. Run npm run release:gate for native evidence; it runs the browser tests."
echo "  3. After independent approval, publish and verify production."
echo ""
