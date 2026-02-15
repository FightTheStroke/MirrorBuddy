#!/bin/bash
# =============================================================================
# SYNC ARCHITECTURE DIAGRAMS - AUTO-UPDATE MISSING ADRs
# Scans docs/adr/ and adds any missing ADRs to ARCHITECTURE-DIAGRAMS.md
# Used by: release-brutal.sh, app-release-manager
# =============================================================================
set -o pipefail
cd "$(dirname "$0")/.."

ARCH_FILE="ARCHITECTURE-DIAGRAMS.md"
ADR_DIR="docs/adr"
ADDED=0

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${BLUE}ℹ${NC} $1"; }
pass() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; }

# =============================================================================
# VALIDATE PREREQUISITES
# =============================================================================
if [ ! -f "$ARCH_FILE" ]; then
    fail "ERROR: $ARCH_FILE not found"
    exit 1
fi

if [ ! -d "$ADR_DIR" ]; then
    fail "ERROR: $ADR_DIR not found"
    exit 1
fi

echo "========================================="
echo "SYNC ARCHITECTURE DIAGRAMS"
echo "========================================="
echo ""

# =============================================================================
# CHECK FOR DUPLICATE ADR NUMBERS (BLOCKING)
# =============================================================================
info "Checking for duplicate ADR numbers..."

DUPLICATES=$(for f in "$ADR_DIR"/*.md; do basename "$f" 2>/dev/null; done | /usr/bin/grep -oE '^[0-9]+' | sort | uniq -d)
if [ -n "$DUPLICATES" ]; then
    fail "DUPLICATE ADR NUMBERS FOUND (BLOCKING):"
    for dup in $DUPLICATES; do
        echo "  ADR $dup:"
        ls "$ADR_DIR"/${dup}*.md 2>/dev/null | while read f; do
            title=$(head -1 "$f" | sed 's/^# //')
            echo "    - $(basename "$f"): $title"
        done
    done
    echo ""
    fail "Fix duplicates before proceeding. Each ADR number must be unique."
    exit 1
fi
pass "No duplicate ADR numbers"

# =============================================================================
# COLLECT ALL UNIQUE ADR NUMBERS
# =============================================================================
info "Scanning $ADR_DIR for ADRs..."

UNIQUE_ADRS=$(for f in "$ADR_DIR"/*.md; do basename "$f" 2>/dev/null; done | /usr/bin/grep -oE '^[0-9]+' | sort -u)
TOTAL_ADRS=$(echo "$UNIQUE_ADRS" | /usr/bin/grep -c . || echo 0)
info "Found $TOTAL_ADRS unique ADR numbers"
echo ""

# =============================================================================
# CHECK WHICH ADRs ARE MISSING FROM ARCHITECTURE-DIAGRAMS.md
# =============================================================================
info "Checking for missing ADRs in $ARCH_FILE..."

MISSING_ADRS=""
MISSING_COUNT=0
for adr_num in $UNIQUE_ADRS; do
    [ -z "$adr_num" ] && continue
    if ! grep -q "$adr_num" "$ARCH_FILE" 2>/dev/null; then
        MISSING_ADRS="$MISSING_ADRS $adr_num"
        MISSING_COUNT=$((MISSING_COUNT + 1))
    fi
done

if [ "$MISSING_COUNT" -eq 0 ]; then
    pass "All $TOTAL_ADRS ADRs are already referenced in $ARCH_FILE"
    echo ""
    echo "========================================="
    echo -e "${GREEN}SYNC COMPLETE - NO CHANGES NEEDED${NC}"
    echo "========================================="
    exit 0
fi

warn "$MISSING_COUNT ADRs missing from $ARCH_FILE"
echo ""

# =============================================================================
# ADD MISSING ADRs TO SECTION 25 (ADR Index)
# =============================================================================
info "Adding missing ADRs to Section 25..."

# Find Section 25 location
SECTION_25_LINE=$(grep -n "## 25\. ADR Index" "$ARCH_FILE" | cut -d: -f1)
if [ -z "$SECTION_25_LINE" ]; then
    fail "Could not find Section 25 (ADR Index) in $ARCH_FILE"
    exit 1
fi

# Find Quick Reference section (insert before it)
QUICK_REF_LINE=$(grep -n "## Quick Reference" "$ARCH_FILE" | cut -d: -f1)
if [ -z "$QUICK_REF_LINE" ]; then
    QUICK_REF_LINE=$(wc -l < "$ARCH_FILE")
fi

# Create temp file
TEMP_FILE=$(mktemp)
INSERT_LINE=$((QUICK_REF_LINE - 2))

# Copy everything up to insert point
head -n "$INSERT_LINE" "$ARCH_FILE" > "$TEMP_FILE"

# Add missing ADRs as a new subsection
echo "" >> "$TEMP_FILE"
echo "### 25.2 Recently Added ADRs" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"
echo '```mermaid' >> "$TEMP_FILE"
echo 'graph TB' >> "$TEMP_FILE"
echo '    subgraph New_ADRs["Recently Added"]' >> "$TEMP_FILE"

for adr_num in $MISSING_ADRS; do
    [ -z "$adr_num" ] && continue
    adr_file=$(ls "$ADR_DIR"/${adr_num}*.md 2>/dev/null | head -1)
    if [ -f "$adr_file" ]; then
        # Extract title, sanitize for Mermaid: remove special chars, smart truncate
        adr_title=$(head -1 "$adr_file" | sed 's/^# //' | sed 's/ADR [0-9]*[: -]*//' | cut -c1-40)
        # Remove Mermaid-breaking characters: () / & < > " [ ]
        adr_title=$(echo "$adr_title" | sed 's/[()/<>&"[\]]//g' | sed 's/  */ /g' | sed 's/ *$//')
    else
        adr_title="Unknown"
    fi
    # Always quote labels to prevent Mermaid parse errors
    echo "        ADR${adr_num}[\"${adr_num} ${adr_title}\"]" >> "$TEMP_FILE"
    ADDED=$((ADDED + 1))
    pass "Added: ADR $adr_num - $adr_title"
done

echo '    end' >> "$TEMP_FILE"
echo '```' >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"

# Add rest of file
tail -n +$((INSERT_LINE + 1)) "$ARCH_FILE" >> "$TEMP_FILE"

# Replace original
mv "$TEMP_FILE" "$ARCH_FILE"

pass "Updated $ARCH_FILE with $ADDED new ADR references"

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo "========================================="
echo -e "${GREEN}SYNC COMPLETE${NC}"
echo "- Added $ADDED ADR references"
echo "- File: $ARCH_FILE"
echo ""
echo "Next steps:"
echo "1. Review changes: git diff $ARCH_FILE"
echo "2. Commit: git add $ARCH_FILE && git commit -m 'docs: sync ADR references'"
echo "========================================="

exit 0
