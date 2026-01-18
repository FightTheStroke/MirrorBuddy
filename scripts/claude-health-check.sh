#!/bin/bash
# Claude Code optimization health check
# Run periodically or at start of long sessions

echo "=== Claude Code Health Check ==="
echo ""

# Helper to count lines (macOS compatible)
count_lines() {
    awk 'END{print NR}' "$1" 2>/dev/null || echo "0"
}

# 1. Check .claudeignore
echo "1. .claudeignore effectiveness:"
if [ -f .claudeignore ]; then
    lines=$(count_lines .claudeignore)
    echo "   Lines: $lines (target: 60+)"
    if [ "$lines" -lt 60 ]; then
        echo "   ⚠️  Consider adding more patterns"
    else
        echo "   ✓ OK"
    fi
else
    echo "   ⚠️  .claudeignore not found!"
fi
echo ""

# 2. Check rules loaded
echo "2. Rules directory:"
if [ -d .claude/rules ]; then
    count=$(find .claude/rules -name "*.md" | awk 'END{print NR}')
    echo "   Files: $count (target: 4+)"
    find .claude/rules -name "*.md" | sed 's/^/   - /'
else
    echo "   ⚠️  .claude/rules/ not found!"
fi
echo ""

# 3. Check for large files
echo "3. Large files (>300 lines):"
found_large=0
find src -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | while read f; do
    lines=$(count_lines "$f")
    if [ "$lines" -gt 300 ]; then
        echo "   $f: $lines lines"
        found_large=1
    fi
done
if [ "$found_large" -eq 0 ]; then
    echo "   ✓ None found"
fi
echo ""

# 4. CLAUDE.md size
echo "4. CLAUDE.md size:"
if [ -f CLAUDE.md ]; then
    lines=$(count_lines CLAUDE.md)
    echo "   Lines: $lines (target: <150)"
    if [ "$lines" -gt 150 ]; then
        echo "   ⚠️  Consider optimizing per ADR 0051"
    else
        echo "   ✓ OK"
    fi
fi
echo ""

echo "=== Health Check Complete ==="
