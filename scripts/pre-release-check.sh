#!/usr/bin/env bash
# =============================================================================
# PRE-RELEASE CHECK SCRIPT
# Runs all automated quality gates before release.
# Exit on first failure (fail-fast).
#
# Usage: npm run pre-release
# =============================================================================

set -e  # Exit on first error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "=========================================="
echo " CONVERGIO EDU - PRE-RELEASE CHECKS"
echo "=========================================="
echo ""

# Track timing
START_TIME=$(date +%s)

# Phase 1: Static Analysis
echo -e "${YELLOW}[1/6] Running ESLint...${NC}"
npm run lint
LINT_EXIT=$?
if [ $LINT_EXIT -ne 0 ]; then
    echo -e "${RED}FAILED: ESLint found errors${NC}"
    exit 1
fi
echo -e "${GREEN}PASSED: ESLint (0 errors, 0 warnings)${NC}"
echo ""

echo -e "${YELLOW}[2/6] Running TypeScript check...${NC}"
npm run typecheck
TYPE_EXIT=$?
if [ $TYPE_EXIT -ne 0 ]; then
    echo -e "${RED}FAILED: TypeScript found errors${NC}"
    exit 1
fi
echo -e "${GREEN}PASSED: TypeScript (0 errors)${NC}"
echo ""

# Phase 2: Security
echo -e "${YELLOW}[3/6] Running security audit...${NC}"
npm audit --audit-level=high
AUDIT_EXIT=$?
if [ $AUDIT_EXIT -ne 0 ]; then
    echo -e "${RED}FAILED: Security vulnerabilities found${NC}"
    exit 1
fi
echo -e "${GREEN}PASSED: Security audit (0 high/critical vulnerabilities)${NC}"
echo ""

# Phase 3: Documentation
echo -e "${YELLOW}[4/6] Checking required documentation...${NC}"
MISSING_DOCS=""
for doc in "README.md" "CHANGELOG.md" "CONTRIBUTING.md" "CLAUDE.md"; do
    if [ ! -f "$doc" ]; then
        MISSING_DOCS="$MISSING_DOCS $doc"
    fi
done
if [ -n "$MISSING_DOCS" ]; then
    echo -e "${RED}FAILED: Missing documentation:$MISSING_DOCS${NC}"
    exit 1
fi
echo -e "${GREEN}PASSED: All required documentation exists${NC}"
echo ""

# Phase 4: Code Hygiene
echo -e "${YELLOW}[5/6] Checking code hygiene...${NC}"
# Check for TODO/FIXME in source code (excluding tests and docs)
TODO_COUNT=$(grep -rE "(TODO|FIXME|HACK|XXX):" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules" | wc -l | tr -d ' ')
if [ "$TODO_COUNT" -gt 0 ]; then
    echo -e "${RED}FAILED: Found $TODO_COUNT TODO/FIXME markers in src/${NC}"
    grep -rE "(TODO|FIXME|HACK|XXX):" src/ --include="*.ts" --include="*.tsx" | head -10
    exit 1
fi

# Check for console.log in production code (excluding logger.ts and tests)
CONSOLE_COUNT=$(grep -rE "console\.(log|warn|error|debug|info)\(" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "logger.ts" | grep -v ".spec.ts" | grep -v ".test.ts" | grep -v "node_modules" | wc -l | tr -d ' ')
if [ "$CONSOLE_COUNT" -gt 0 ]; then
    echo -e "${RED}FAILED: Found $CONSOLE_COUNT console.* calls in src/ (use logger instead)${NC}"
    grep -rE "console\.(log|warn|error|debug|info)\(" src/ --include="*.ts" --include="*.tsx" | grep -v "logger.ts" | grep -v ".spec.ts" | head -10
    exit 1
fi
echo -e "${GREEN}PASSED: Code hygiene (0 TODO/FIXME, 0 console.*)${NC}"
echo ""

# Phase 5: Build
echo -e "${YELLOW}[6/6] Running production build...${NC}"
npm run build > /dev/null 2>&1
BUILD_EXIT=$?
if [ $BUILD_EXIT -ne 0 ]; then
    echo -e "${RED}FAILED: Production build failed${NC}"
    npm run build
    exit 1
fi
echo -e "${GREEN}PASSED: Production build successful${NC}"
echo ""

# Summary
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "=========================================="
echo -e "${GREEN} ALL PRE-RELEASE CHECKS PASSED${NC}"
echo " Duration: ${DURATION}s"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Run E2E tests: npm run test"
echo "  2. Manual testing of critical flows"
echo "  3. Create release: npm run version:patch"
echo ""
