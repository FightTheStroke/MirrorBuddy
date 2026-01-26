#!/usr/bin/env bash
# =============================================================================
# PRE-RELEASE CHECK SCRIPT - PARALLELIZED FOR M3 MAX
# Runs all automated quality gates before release.
# Optimized for Apple Silicon with parallel execution.
#
# Usage: npm run pre-release
# =============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Temp directory for parallel job results
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo ""
echo "=========================================="
echo " CONVERGIO EDU - PRE-RELEASE CHECKS"
echo " Parallelized for M3 Max (14 cores)"
echo "=========================================="
echo ""

START_TIME=$(date +%s)

# =============================================================================
# PHASE 1: INSTANT CHECKS (< 1 second)
# =============================================================================
echo -e "${BLUE}[PHASE 1] Instant checks...${NC}"

# Redirect metadata lint (a11y guard)
if [ -f "./scripts/lint-redirect-metadata.tsx" ]; then
    if ! npx tsx ./scripts/lint-redirect-metadata.tsx; then
        echo -e "${RED}✗ Redirect metadata lint failed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Redirect metadata lint passed${NC}"
fi

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

# Code hygiene with ripgrep (much faster than grep)
# Exclude: logger.ts, test files, JSDoc comments (: * ), intentional demo sandboxing
if command -v rg &> /dev/null; then
    TODO_COUNT=$(rg -c "(TODO|FIXME|HACK|XXX):" src/ -g '*.ts' -g '*.tsx' 2>/dev/null | rg -v "__tests__" | rg -v "\.test\." | rg -v "\.spec\." | awk -F: '{sum+=$2} END {print sum+0}')
    # Filter console.* calls: exclude logger, test files, JSDoc comments (: * ), demo-html-builder
    CONSOLE_COUNT=$(rg "console\.(log|warn|error|debug|info)\(" src/ -g '*.ts' -g '*.tsx' 2>/dev/null | rg -v "__tests__" | rg -v "\.test\." | rg -v "\.spec\." | rg -v "logger" | rg -v ": \*" | rg -v "demo-html-builder" | /usr/bin/wc -l | tr -d ' ')
else
    TODO_COUNT=$(/usr/bin/grep -rE "(TODO|FIXME|HACK|XXX):" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | /usr/bin/grep -v "__tests__" | /usr/bin/grep -v "\.test\." | /usr/bin/wc -l | tr -d ' ')
    CONSOLE_COUNT=$(/usr/bin/grep -rE "console\.(log|warn|error|debug|info)\(" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | /usr/bin/grep -v "logger" | /usr/bin/grep -v "__tests__" | /usr/bin/grep -v "\.test\." | /usr/bin/grep -v ": \*" | /usr/bin/wc -l | tr -d ' ')
fi

if [ "$TODO_COUNT" -gt 0 ]; then
    echo -e "${RED}✗ Found $TODO_COUNT TODO/FIXME markers${NC}"
    rg "(TODO|FIXME|HACK|XXX):" src/ -g '*.ts' -g '*.tsx' 2>/dev/null | head -5
    exit 1
fi
if [ "$CONSOLE_COUNT" -gt 0 ]; then
    echo -e "${RED}✗ Found $CONSOLE_COUNT console.* calls (use logger)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Code hygiene passed${NC}"

PHASE1_TIME=$(date +%s)
echo -e "${BLUE}   Phase 1: $((PHASE1_TIME - START_TIME))s${NC}"
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
    npm audit --audit-level=high > "$TEMP_DIR/audit.log" 2>&1
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
if ! npm run build > "$TEMP_DIR/build.log" 2>&1; then
    echo -e "${RED}✗ Build failed${NC}"
    cat "$TEMP_DIR/build.log"
    exit 1
fi
echo -e "${GREEN}✓ Build successful${NC}"

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
    echo -e "${YELLOW}⚠ perf-check.sh not found, skipping${NC}"
fi

PHASE4_TIME=$(date +%s)
echo -e "${BLUE}   Phase 4: $((PHASE4_TIME - PHASE3_TIME))s${NC}"
echo ""

# =============================================================================
# PHASE 5: FILE SIZE VALIDATION (warning only)
# =============================================================================
echo -e "${BLUE}[PHASE 5] File size validation...${NC}"

if [ -f "./scripts/check-file-size.sh" ]; then
    ./scripts/check-file-size.sh || true  # Non-blocking, just report
else
    echo -e "${YELLOW}⚠ check-file-size.sh not found, skipping${NC}"
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
echo " Phase 1 (instant):   $((PHASE1_TIME - START_TIME))s"
echo " Phase 2 (parallel):  $((PHASE2_TIME - PHASE1_TIME))s"
echo " Phase 3 (build):     $((PHASE3_TIME - PHASE2_TIME))s"
echo " Phase 4 (perf):      $((PHASE4_TIME - PHASE3_TIME))s"
echo " Phase 5 (size):      $((PHASE5_TIME - PHASE4_TIME))s"
echo " ─────────────────────────"
echo " Total:               ${TOTAL}s"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Run E2E tests: npm run test"
echo "  2. Create release: npm run version:patch"
echo ""
