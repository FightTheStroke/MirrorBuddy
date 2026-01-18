#!/usr/bin/env bash
# =============================================================================
# FILE SIZE CHECK SCRIPT
# Validates that source files don't exceed 250 lines.
# Part of the pre-release pipeline.
#
# Usage: ./scripts/check-file-size.sh [--strict]
#   --strict  Exit with error if files exceed limit (default: warning only)
#
# Configuration: .file-line-limit.json
# =============================================================================

set -e

MAX_LINES=250
STRICT_MODE=0
OVER_COUNT=0
CONFIG_FILE=".file-line-limit.json"

# Parse arguments
[ "$1" = "--strict" ] && STRICT_MODE=1

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo "=========================================="
echo " FILE SIZE VALIDATION (max $MAX_LINES lines)"
echo "=========================================="
echo ""

# Load exempt files from config if it exists
EXEMPT_FILES=""
if [ -f "$CONFIG_FILE" ]; then
    # Extract exempt files - find the exemptFiles array and extract values
    IN_EXEMPT=0
    while IFS= read -r line; do
        if echo "$line" | grep -q '"exemptFiles"'; then
            IN_EXEMPT=1
            continue
        fi
        if [ $IN_EXEMPT -eq 1 ]; then
            if echo "$line" | grep -q '\]'; then
                break
            fi
            # Extract filename from JSON string
            filename=$(echo "$line" | sed 's/.*"\([^"]*\)".*/\1/' | tr -d ' ,')
            if [ -n "$filename" ] && [ "$filename" != "[" ]; then
                EXEMPT_FILES="$EXEMPT_FILES $filename"
            fi
        fi
    done < "$CONFIG_FILE"

    if [ -n "$EXEMPT_FILES" ]; then
        echo -e "${CYAN}Exempt files (from $CONFIG_FILE):${NC}"
        for exempt in $EXEMPT_FILES; do
            echo "  - $exempt"
        done
        echo ""
    fi
fi

# Function to check if file is exempt
is_exempt() {
    local file="$1"
    local basename=$(basename "$file")
    for exempt in $EXEMPT_FILES; do
        if [ "$basename" = "$exempt" ] || [ "$file" = "$exempt" ]; then
            return 0
        fi
    done
    return 1
}

# Find all source files from configured directories
# Include: src, scripts, .claude, docs, e2e, @docs, and root-level md files
FILES=$(/usr/bin/find src scripts .claude docs e2e @docs -type f \( \
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

# Also include root-level markdown files
ROOT_MD=$(/usr/bin/find . -maxdepth 1 -type f -name "*.md" 2>/dev/null || true)
FILES="$FILES $ROOT_MD"

OVER_LIMIT=""
CHECKED=0
EXEMPT_COUNT=0

for file in $FILES; do
    [ ! -f "$file" ] && continue

    # Check if file is exempt
    if is_exempt "$file"; then
        EXEMPT_COUNT=$((EXEMPT_COUNT + 1))
        continue
    fi

    LINES=$(awk 'END {print NR}' "$file" 2>/dev/null || echo 0)
    CHECKED=$((CHECKED + 1))

    if [ "$LINES" -gt "$MAX_LINES" ]; then
        OVER_LIMIT="$OVER_LIMIT\n  - $file ($LINES lines)"
        FAILED=1
    fi
done

if [ -n "$OVER_LIMIT" ]; then
    OVER_COUNT=$(echo -e "$OVER_LIMIT" | grep -c "^  -" || echo 0)
    echo -e "${YELLOW}Files exceeding $MAX_LINES lines ($OVER_COUNT):${NC}"
    echo -e "$OVER_LIMIT"
    echo ""
    echo -e "${YELLOW}Action: Split these files into smaller modules.${NC}"
else
    echo -e "${GREEN}All $CHECKED files are under $MAX_LINES lines${NC}"
fi

[ $EXEMPT_COUNT -gt 0 ] && echo -e "${CYAN}(Skipped $EXEMPT_COUNT exempt files)${NC}"

echo ""
echo "=========================================="

if [ $OVER_COUNT -gt 0 ]; then
    if [ $STRICT_MODE -eq 1 ]; then
        echo -e "${RED} FILE SIZE CHECK FAILED (strict mode)${NC}"
        exit 1
    else
        echo -e "${YELLOW} FILE SIZE CHECK: $OVER_COUNT files over limit${NC}"
        echo "   Run with --strict to enforce as blocking."
        exit 0
    fi
else
    echo -e "${GREEN} FILE SIZE CHECK PASSED${NC}"
    exit 0
fi
