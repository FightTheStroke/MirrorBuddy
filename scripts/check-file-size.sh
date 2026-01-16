#!/usr/bin/env bash
# =============================================================================
# FILE SIZE CHECK SCRIPT
# Validates that source files don't exceed 250 lines.
# Part of the pre-release pipeline.
#
# Usage: ./scripts/check-file-size.sh [--strict]
#   --strict  Exit with error if files exceed limit (default: warning only)
# =============================================================================

set -e

MAX_LINES=250
STRICT_MODE=0
OVER_COUNT=0

# Parse arguments
[ "$1" = "--strict" ] && STRICT_MODE=1

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "=========================================="
echo " FILE SIZE VALIDATION (max $MAX_LINES lines)"
echo "=========================================="
echo ""

# Find all source files (excluding node_modules, .next, generated, etc.)
FILES=$(find src scripts .claude -type f \( \
    -name "*.ts" -o \
    -name "*.tsx" -o \
    -name "*.js" -o \
    -name "*.jsx" -o \
    -name "*.sh" -o \
    -name "*.md" \
    \) \
    ! -path "*/node_modules/*" \
    ! -path "*/.next/*" \
    ! -path "*/dist/*" \
    ! -path "*/build/*" \
    ! -path "*/generated/*" \
    ! -path "*/__tests__/*" \
    ! -name "*.test.*" \
    ! -name "*.spec.*" \
    2>/dev/null || true)

OVER_LIMIT=""
CHECKED=0

for file in $FILES; do
    [ ! -f "$file" ] && continue

    LINES=$(awk 'END {print NR}' "$file" 2>/dev/null || echo 0)
    CHECKED=$((CHECKED + 1))

    if [ "$LINES" -gt "$MAX_LINES" ]; then
        OVER_LIMIT="$OVER_LIMIT\n  - $file ($LINES lines)"
        FAILED=1
    fi
done

if [ -n "$OVER_LIMIT" ]; then
    OVER_COUNT=$(echo -e "$OVER_LIMIT" | grep -c "^  -" || echo 0)
    echo -e "${YELLOW}⚠ $OVER_COUNT files exceeding $MAX_LINES lines:${NC}"
    echo -e "$OVER_LIMIT"
    echo ""
    echo -e "${YELLOW}Action: Split these files into smaller modules.${NC}"
else
    echo -e "${GREEN}✓ All $CHECKED files are under $MAX_LINES lines${NC}"
fi

echo ""
echo "=========================================="

if [ $OVER_COUNT -gt 0 ]; then
    if [ $STRICT_MODE -eq 1 ]; then
        echo -e "${RED} ✗ FILE SIZE CHECK FAILED (strict mode)${NC}"
        exit 1
    else
        echo -e "${YELLOW} ⚠ FILE SIZE CHECK: $OVER_COUNT files over limit${NC}"
        echo "   Run with --strict to enforce as blocking."
        exit 0
    fi
else
    echo -e "${GREEN} ✓ FILE SIZE CHECK PASSED${NC}"
    exit 0
fi
