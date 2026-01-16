#!/usr/bin/env bash
# =============================================================================
# PERFORMANCE CHECK SCRIPT
# Validates performance patterns before release.
# Part of the pre-release pipeline (Phase 4).
#
# Usage: ./scripts/perf-check.sh
# =============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

FAILED=0
WARNINGS=0

echo ""
echo "=========================================="
echo " PERFORMANCE VALIDATION"
echo "=========================================="
echo ""

# =============================================================================
# CHECK 1: Avatar Image Format (must be WebP)
# =============================================================================
echo -e "${BLUE}[1/6] Checking avatar image formats...${NC}"

# Check for non-WebP images in maestri folder
NON_WEBP=$(find public/maestri -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) 2>/dev/null)
if [ -n "$NON_WEBP" ]; then
    echo -e "${RED}✗ Found non-WebP avatars (should be converted):${NC}"
    echo "$NON_WEBP"
    FAILED=1
else
    WEBP_COUNT=$(find public/maestri -name "*.webp" 2>/dev/null | wc -l | tr -d ' ')
    echo -e "${GREEN}✓ All $WEBP_COUNT avatars are WebP format${NC}"
fi

# =============================================================================
# CHECK 2: Memory Leak Patterns - EventSource
# =============================================================================
echo -e "${BLUE}[2/6] Checking EventSource cleanup patterns...${NC}"

# Find files with EventSource that DON'T have cleanup
# Skip: utility files that return EventSource (cleanup in caller), test files
ES_ISSUES=""
ES_COUNT=0

# Use ripgrep if available, else grep
if command -v rg &> /dev/null; then
    ES_FILE_LIST=$(rg -l "new EventSource" src/ --glob "*.ts" --glob "*.tsx" 2>/dev/null || true)
else
    ES_FILE_LIST=$(grep -rl "new EventSource" src/ --include="*.ts" --include="*.tsx" 2>/dev/null || true)
fi

for file in $ES_FILE_LIST; do
    # Skip test files
    if [[ "$file" =~ \.test\. ]] || [[ "$file" =~ __tests__ ]]; then
        continue
    fi

    ES_COUNT=$((ES_COUNT + 1))

    # Check if file has .close() call
    if grep -q "\.close()" "$file" 2>/dev/null; then
        continue
    fi

    # Check if it's a utility that returns EventSource (cleanup responsibility is on caller)
    # Pattern: function returns the EventSource variable
    if grep -qE "return\s+(es|eventSource|source)" "$file" 2>/dev/null; then
        # Get the directory to find the main file that imports this utility
        DIR=$(dirname "$file")
        # Check if there's a file in same directory or parent with cleanup
        RELATED_FILES=$(find "$DIR" -maxdepth 2 -name "*.ts" -o -name "*.tsx" 2>/dev/null)
        HAS_CLEANUP=0
        for related in $RELATED_FILES; do
            if [ "$related" != "$file" ] && grep -q "\.close()" "$related" 2>/dev/null; then
                HAS_CLEANUP=1
                break
            fi
        done
        if [ $HAS_CLEANUP -eq 1 ]; then
            continue
        fi
    fi

    ES_ISSUES="$ES_ISSUES\n  - $file (missing .close())"
done

if [ -n "$ES_ISSUES" ]; then
    echo -e "${RED}✗ EventSource without cleanup:${NC}"
    echo -e "$ES_ISSUES"
    FAILED=1
else
    echo -e "${GREEN}✓ All $ES_COUNT EventSource usages have cleanup${NC}"
fi

# =============================================================================
# CHECK 3: Memory Leak Patterns - Event Listeners
# =============================================================================
echo -e "${BLUE}[3/6] Checking event listener cleanup patterns...${NC}"

# Find files with addEventListener
LISTENER_ISSUES=0
if command -v rg &> /dev/null; then
    # Files with addEventListener but no removeEventListener
    ADD_LISTENER_FILES=$(rg -l "addEventListener" src/ --glob "*.ts" --glob "*.tsx" 2>/dev/null || true)
    for file in $ADD_LISTENER_FILES; do
        if ! rg -q "removeEventListener" "$file" 2>/dev/null; then
            # Exclude test files and type definitions
            if [[ ! "$file" =~ \.test\. ]] && [[ ! "$file" =~ \.d\.ts ]]; then
                echo -e "${YELLOW}  ⚠ $file has addEventListener without removeEventListener${NC}"
                WARNINGS=$((WARNINGS + 1))
            fi
        fi
    done
else
    ADD_LISTENER_FILES=$(grep -rl "addEventListener" src/ --include="*.ts" --include="*.tsx" 2>/dev/null || true)
    for file in $ADD_LISTENER_FILES; do
        if ! grep -q "removeEventListener" "$file" 2>/dev/null; then
            if [[ ! "$file" =~ \.test\. ]] && [[ ! "$file" =~ \.d\.ts ]]; then
                echo -e "${YELLOW}  ⚠ $file has addEventListener without removeEventListener${NC}"
                WARNINGS=$((WARNINGS + 1))
            fi
        fi
    done
fi

if [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ Event listener patterns look good${NC}"
fi

# =============================================================================
# CHECK 4: Database N+1 Patterns
# =============================================================================
echo -e "${BLUE}[4/6] Checking for N+1 query patterns...${NC}"

# Look for await inside loops without $transaction
N1_PATTERNS=0
if command -v rg &> /dev/null; then
    # Find files with potential N+1: for/forEach with await prisma
    N1_FILES=$(rg -l "for.*\{" src/ -t ts 2>/dev/null | xargs -I{} sh -c 'rg -l "await.*prisma\." "{}" 2>/dev/null' || true)
    for file in $N1_FILES; do
        # Check if it uses $transaction
        if ! rg -q '\$transaction' "$file" 2>/dev/null; then
            # Check if it's actually a loop with await prisma inside
            if rg -q 'for\s*\(' "$file" 2>/dev/null && rg -q 'await.*prisma\.' "$file" 2>/dev/null; then
                echo -e "${YELLOW}  ⚠ $file may have N+1 pattern (consider \$transaction)${NC}"
                N1_PATTERNS=$((N1_PATTERNS + 1))
            fi
        fi
    done
fi

if [ $N1_PATTERNS -eq 0 ]; then
    echo -e "${GREEN}✓ No obvious N+1 patterns detected${NC}"
else
    WARNINGS=$((WARNINGS + N1_PATTERNS))
fi

# =============================================================================
# CHECK 5: Bundle Size (requires build)
# =============================================================================
echo -e "${BLUE}[5/6] Checking bundle size...${NC}"

if [ -d ".next" ]; then
    # Check for large chunks in OUR code (exclude node_modules, Next.js internals)
    # Only check .next/static/chunks (our actual application code)
    LARGE_CHUNKS=$(find .next/static/chunks -name "*.js" -size +500k 2>/dev/null | grep -v "node_modules" | head -5)
    if [ -n "$LARGE_CHUNKS" ]; then
        echo -e "${YELLOW}  ⚠ Large app chunks found (>500KB):${NC}"
        for chunk in $LARGE_CHUNKS; do
            SIZE=$(du -h "$chunk" | cut -f1)
            echo "    - $chunk ($SIZE)"
        done
        WARNINGS=$((WARNINGS + 1))
    else
        APP_SIZE=$(du -sh .next/static/chunks 2>/dev/null | cut -f1)
        echo -e "${GREEN}✓ No excessively large app chunks (total: $APP_SIZE)${NC}"
    fi
else
    echo -e "${YELLOW}  ⚠ No .next directory (run build first)${NC}"
fi

# =============================================================================
# CHECK 6: Lazy Loading for Heavy Dependencies
# =============================================================================
echo -e "${BLUE}[6/6] Checking lazy loading for heavy dependencies...${NC}"

LAZY_ISSUES=0

# Check KaTeX - should be dynamically imported
if command -v rg &> /dev/null; then
    KATEX_STATIC=$(rg "from 'katex'" src/ --glob "*.ts" --glob "*.tsx" 2>/dev/null | grep -v dynamic | grep -v "// lazy" || true)
else
    KATEX_STATIC=$(grep -r "from 'katex'" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v dynamic | grep -v "// lazy" || true)
fi
if [ -n "$KATEX_STATIC" ]; then
    echo -e "${RED}✗ KaTeX imported statically (should use dynamic import):${NC}"
    echo "$KATEX_STATIC"
    LAZY_ISSUES=$((LAZY_ISSUES + 1))
fi

# Check Recharts - components with static import must themselves be lazy-loaded
if command -v rg &> /dev/null; then
    RECHARTS_FILES=$(rg -l "from 'recharts'" src/ --glob "*.ts" --glob "*.tsx" 2>/dev/null || true)
else
    RECHARTS_FILES=$(grep -rl "from 'recharts'" src/ --include="*.ts" --include="*.tsx" 2>/dev/null || true)
fi
RECHARTS_NOT_LAZY=""

for file in $RECHARTS_FILES; do
    # Get the file name without extension for matching (works on both BSD and GNU sed)
    BASENAME=$(basename "$file" | sed 's/\.tsx$//' | sed 's/\.ts$//')

    # Check if this component is dynamically imported somewhere
    # Match patterns like: import('./chart-renderer') or import('@/components/.../chart-renderer')
    if command -v rg &> /dev/null; then
        IS_LAZY=$(rg "import\(['\"].*${BASENAME}" src/ --glob "*.ts" --glob "*.tsx" 2>/dev/null || true)
    else
        IS_LAZY=$(grep -rE "import\(['\"].*${BASENAME}" src/ --include="*.ts" --include="*.tsx" 2>/dev/null || true)
    fi

    if [ -z "$IS_LAZY" ]; then
        RECHARTS_NOT_LAZY="$RECHARTS_NOT_LAZY\n  - $file"
    fi
done

if [ -n "$RECHARTS_NOT_LAZY" ]; then
    echo -e "${RED}✗ Recharts components not lazy-loaded:${NC}"
    echo -e "$RECHARTS_NOT_LAZY"
    LAZY_ISSUES=$((LAZY_ISSUES + 1))
else
    # Count files (one per line from rg/grep -l output)
    RECHARTS_COUNT=$(echo "$RECHARTS_FILES" | grep -c . 2>/dev/null || echo 0)
    echo -e "${GREEN}✓ All $RECHARTS_COUNT Recharts components are lazy-loaded${NC}"
fi

if [ $LAZY_ISSUES -eq 0 ]; then
    echo -e "${GREEN}✓ Heavy dependencies are lazy-loaded${NC}"
else
    FAILED=1
fi

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo "=========================================="

if [ $FAILED -ne 0 ]; then
    echo -e "${RED} ✗ PERFORMANCE CHECKS FAILED${NC}"
    echo "   Fix blocking issues before release."
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW} ⚠ PERFORMANCE CHECKS PASSED WITH WARNINGS${NC}"
    echo "   $WARNINGS warning(s) - review recommended."
    exit 0
else
    echo -e "${GREEN} ✓ ALL PERFORMANCE CHECKS PASSED${NC}"
    exit 0
fi
