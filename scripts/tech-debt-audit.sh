#!/bin/bash
#
# Technical Debt Audit Report
# Plan 091 - Debt Prevention System
#
# Run: npm run debt:check
#

set -e

echo "🔍 Technical Debt Audit Report"
echo "=============================="
echo ""

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Counters
WARNINGS=0
ERRORS=0

# 1. Check for backup files
echo "📁 Checking for backup files (.bak, .old, .tmp)..."
BACKUP_FILES=$(find . -type f \( -name "*.bak" -o -name "*.old" -o -name "*.tmp" \) 2>/dev/null | grep -v node_modules | head -20 || true)
if [ -n "$BACKUP_FILES" ]; then
    echo -e "${RED}❌ Found backup files:${NC}"
    echo "$BACKUP_FILES"
    ((ERRORS++)) || true
else
    echo -e "${GREEN}✓ No backup files found${NC}"
fi
echo ""

# 2. Check TODO/FIXME without issues
echo "📝 Checking TODO/FIXME without issue references..."
TODO_COUNT=$(grep -rn --include="*.ts" --include="*.tsx" -E '\b(TODO|FIXME)\b' src/ 2>/dev/null | grep -v '#[0-9]' | grep -v 'issue' | wc -l | tr -d ' ' || echo "0")
if [ "$TODO_COUNT" -gt 10 ]; then
    echo -e "${RED}❌ Too many TODO/FIXME without issues: $TODO_COUNT (max: 10)${NC}"
    grep -rn --include="*.ts" --include="*.tsx" -E '\b(TODO|FIXME)\b' src/ 2>/dev/null | grep -v '#[0-9]' | grep -v 'issue' | head -10
    ((ERRORS++)) || true
elif [ "$TODO_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  TODO/FIXME without issues: $TODO_COUNT${NC}"
    ((WARNINGS++)) || true
else
    echo -e "${GREEN}✓ All TODO/FIXME have issue references${NC}"
fi
echo ""

# 3. Count @deprecated functions
echo "⚠️  Counting @deprecated functions..."
DEPRECATED_COUNT=$(grep -rn '@deprecated' src/ 2>/dev/null | wc -l | tr -d ' ' || echo "0")
if [ "$DEPRECATED_COUNT" -gt 15 ]; then
    echo -e "${RED}❌ High @deprecated count: $DEPRECATED_COUNT (schedule cleanup)${NC}"
    ((ERRORS++)) || true
elif [ "$DEPRECATED_COUNT" -gt 5 ]; then
    echo -e "${YELLOW}⚠️  @deprecated count: $DEPRECATED_COUNT${NC}"
    ((WARNINGS++)) || true
else
    echo -e "${GREEN}✓ @deprecated count: $DEPRECATED_COUNT${NC}"
fi
echo ""

# 4. Check outdated dependencies (quick)
echo "📦 Checking for outdated dependencies..."
OUTDATED=$(npm outdated --json 2>/dev/null | head -20 || echo "{}")
OUTDATED_COUNT=$(echo "$OUTDATED" | grep -c '"current"' 2>/dev/null || echo "0")
if [ "$OUTDATED_COUNT" -gt 20 ]; then
    echo -e "${YELLOW}⚠️  $OUTDATED_COUNT packages are outdated${NC}"
    ((WARNINGS++)) || true
else
    echo -e "${GREEN}✓ Dependencies mostly up to date${NC}"
fi
echo ""

# 5. Check for large files (>400 lines)
echo "📏 Checking for large files (>400 lines)..."
LARGE_FILES=0
while IFS= read -r f; do
    if [ -f "$f" ]; then
        LINES=$(wc -l < "$f" 2>/dev/null || echo "0")
        if [ "$LINES" -gt 400 ]; then
            echo "  ⚠️  $f: $LINES lines"
            ((LARGE_FILES++)) || true
        fi
    fi
done < <(find src -name "*.ts" -o -name "*.tsx" 2>/dev/null)

if [ "$LARGE_FILES" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  $LARGE_FILES files exceed 400 lines${NC}"
    ((WARNINGS++)) || true
else
    echo -e "${GREEN}✓ All files within line limits${NC}"
fi
echo ""

# Summary
echo "=============================="
echo "📊 Summary"
if [ "$ERRORS" -gt 0 ]; then
    echo -e "${RED}❌ Errors: $ERRORS${NC}"
fi
if [ "$WARNINGS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
fi
if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
    echo -e "${GREEN}✓ No technical debt issues found!${NC}"
fi

# Exit code
if [ "$ERRORS" -gt 0 ]; then
    exit 1
fi
exit 0
