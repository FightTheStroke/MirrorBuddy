#!/bin/bash
# =============================================================================
# CHECK ARCHITECTURE DIAGRAMS (FULL + FUTURE-PROOF)
# Validates ARCHITECTURE-DIAGRAMS.md contains ALL required sections
# Auto-detects new ADRs and warns if not referenced
# Used by: release-brutal.sh Phase 7, app-release-manager
# =============================================================================
set -o pipefail
cd "$(dirname "$0")/.."

ARCH_FILE="ARCHITECTURE-DIAGRAMS.md"
ADR_DIR="docs/adr"
FAILED=0
WARNINGS=0
ISSUES=""

# Color output (if terminal supports it)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

pass() { echo -e "${GREEN}✓${NC} $1"; }
fail() {
    echo -e "${RED}✗${NC} $1"
    FAILED=$((FAILED + 1))
    ISSUES="$ISSUES\n- $1"
}
warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

# =============================================================================
# CHECK FILE EXISTS
# =============================================================================
if [ ! -f "$ARCH_FILE" ]; then
    echo "ERROR: $ARCH_FILE not found"
    exit 1
fi

echo "Checking architecture diagrams in $ARCH_FILE..."
echo ""

# =============================================================================
# REQUIRED MAIN SECTIONS (dynamic count based on file)
# Pattern: ## N. Title - where N is a number
# =============================================================================
EXPECTED_SECTIONS=25  # Current count

echo "=== Main Section Existence ==="
MAIN_FOUND=0
HIGHEST_SECTION=0

# Check each expected section
for i in $(seq 1 $EXPECTED_SECTIONS); do
    if /usr/bin/grep -q "^## $i\. " "$ARCH_FILE" 2>/dev/null; then
        MAIN_FOUND=$((MAIN_FOUND + 1))
        [ $i -gt $HIGHEST_SECTION ] && HIGHEST_SECTION=$i
    else
        fail "MISSING: Section $i"
    fi
done

# Check for sections beyond expected (future additions)
ACTUAL_HIGHEST=$(/usr/bin/grep -oE '^## ([0-9]+)\.' "$ARCH_FILE" | /usr/bin/grep -oE '[0-9]+' | sort -n | tail -1)
if [ -n "$ACTUAL_HIGHEST" ] && [ "$ACTUAL_HIGHEST" -gt "$EXPECTED_SECTIONS" ]; then
    warn "New sections detected! Found up to Section $ACTUAL_HIGHEST (expected $EXPECTED_SECTIONS)"
    warn "Update EXPECTED_SECTIONS in this script to $ACTUAL_HIGHEST"
fi

if [ "$MAIN_FOUND" -eq "$EXPECTED_SECTIONS" ]; then
    pass "All $EXPECTED_SECTIONS main sections present"
else
    fail "Only $MAIN_FOUND/$EXPECTED_SECTIONS main sections found"
fi

# =============================================================================
# COMPLIANCE SUBSECTIONS (21 required in Section 19)
# =============================================================================
echo ""
echo "=== Compliance Subsections (Section 19) ==="

COMPLIANCE_EXPECTED=21
COMPLIANCE_FOUND=0

for i in $(seq 1 $COMPLIANCE_EXPECTED); do
    section_num="19.$i"
    if /usr/bin/grep -q "### $section_num " "$ARCH_FILE" 2>/dev/null; then
        COMPLIANCE_FOUND=$((COMPLIANCE_FOUND + 1))
    else
        fail "MISSING: Section $section_num"
    fi
done

# Check for compliance sections beyond expected
ACTUAL_COMPLIANCE=$(/usr/bin/grep -oE '^### 19\.([0-9]+)' "$ARCH_FILE" | /usr/bin/grep -oE '[0-9]+$' | sort -n | tail -1)
if [ -n "$ACTUAL_COMPLIANCE" ] && [ "$ACTUAL_COMPLIANCE" -gt "$COMPLIANCE_EXPECTED" ]; then
    warn "New compliance sections! Found 19.$ACTUAL_COMPLIANCE (expected max 19.$COMPLIANCE_EXPECTED)"
    warn "Update COMPLIANCE_EXPECTED in this script to $ACTUAL_COMPLIANCE"
fi

if [ "$COMPLIANCE_FOUND" -eq "$COMPLIANCE_EXPECTED" ]; then
    pass "All $COMPLIANCE_EXPECTED compliance subsections present"
else
    fail "Only $COMPLIANCE_FOUND/$COMPLIANCE_EXPECTED compliance subsections found"
fi

# =============================================================================
# MERMAID DIAGRAM COUNT
# =============================================================================
echo ""
echo "=== Mermaid Diagram Validation ==="

TOTAL_DIAGRAMS=$(/usr/bin/grep -c '```mermaid' "$ARCH_FILE" 2>/dev/null || echo 0)
MIN_REQUIRED_DIAGRAMS=40

if [ "$TOTAL_DIAGRAMS" -ge "$MIN_REQUIRED_DIAGRAMS" ]; then
    pass "Total diagrams: $TOTAL_DIAGRAMS (min: $MIN_REQUIRED_DIAGRAMS)"
else
    fail "Only $TOTAL_DIAGRAMS diagrams (need: $MIN_REQUIRED_DIAGRAMS)"
fi

# Section 19 compliance diagrams
SECTION_19_DIAGRAMS=$(awk '/^## 19\. Compliance/,/^## 20\./' "$ARCH_FILE" 2>/dev/null | /usr/bin/grep -c '```mermaid' || echo 0)
MIN_COMPLIANCE_DIAGRAMS=21

if [ "$SECTION_19_DIAGRAMS" -ge "$MIN_COMPLIANCE_DIAGRAMS" ]; then
    pass "Section 19 diagrams: $SECTION_19_DIAGRAMS (min: $MIN_COMPLIANCE_DIAGRAMS)"
else
    fail "Section 19 has only $SECTION_19_DIAGRAMS diagrams (need: $MIN_COMPLIANCE_DIAGRAMS)"
fi

# =============================================================================
# ADR CROSS-REFERENCE CHECK (Dynamic - scans docs/adr/)
# =============================================================================
echo ""
echo "=== ADR Cross-Reference Validation ==="

# Core ADRs that MUST be referenced (blocking)
declare -a REQUIRED_ADRS=(
    "0004" "0008" "0015" "0028" "0031" "0033"
    "0056" "0057" "0062" "0063" "0064" "0071" "0073" "0075"
)

ADR_FOUND=0
ADR_REQUIRED=${#REQUIRED_ADRS[@]}

for adr_num in "${REQUIRED_ADRS[@]}"; do
    if /usr/bin/grep -q "$adr_num" "$ARCH_FILE" 2>/dev/null; then
        pass "ADR $adr_num referenced"
        ADR_FOUND=$((ADR_FOUND + 1))
    else
        fail "ADR $adr_num not referenced (required)"
    fi
done

echo ""
echo "--- Scanning for unreferenced ADRs ---"

# Scan docs/adr/ for all ADRs and check if referenced
if [ -d "$ADR_DIR" ]; then
    UNREFERENCED=0
    for adr_file in "$ADR_DIR"/*.md; do
        [ -f "$adr_file" ] || continue
        # Extract ADR number from filename (0001, 0056, etc.)
        adr_num=$(basename "$adr_file" | /usr/bin/grep -oE '^[0-9]+')
        [ -z "$adr_num" ] && continue

        # Check if this ADR is referenced in ARCHITECTURE-DIAGRAMS.md
        if ! /usr/bin/grep -q "$adr_num" "$ARCH_FILE" 2>/dev/null; then
            adr_title=$(head -1 "$adr_file" | sed 's/^# //')
            warn "ADR $adr_num not in diagrams: $adr_title"
            UNREFERENCED=$((UNREFERENCED + 1))
        fi
    done

    if [ "$UNREFERENCED" -eq 0 ]; then
        pass "All ADRs from $ADR_DIR are referenced"
    else
        warn "$UNREFERENCED ADRs not referenced (non-blocking, but should be added)"
    fi
else
    warn "$ADR_DIR not found - skipping dynamic ADR check"
fi

# =============================================================================
# VERSION CONSISTENCY CHECK
# =============================================================================
echo ""
echo "=== Version Consistency ==="

HEADER_VERSION=$(/usr/bin/grep -E '^\*\*Version\*\*:' "$ARCH_FILE" | head -1 | /usr/bin/grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
FOOTER_VERSION=$(/usr/bin/grep -E '^_Version:' "$ARCH_FILE" | head -1 | /usr/bin/grep -oE '[0-9]+\.[0-9]+\.[0-9]+')

if [ "$HEADER_VERSION" = "$FOOTER_VERSION" ] && [ -n "$HEADER_VERSION" ]; then
    pass "Version consistent: $HEADER_VERSION"
else
    fail "Version mismatch: header=$HEADER_VERSION, footer=$FOOTER_VERSION"
fi

# =============================================================================
# MERMAID SYNTAX VALIDATION
# =============================================================================
echo ""
echo "=== Mermaid Syntax Validation ==="

# Single-line mermaid (invalid)
if /usr/bin/grep -E '```mermaid.*```' "$ARCH_FILE" 2>/dev/null | /usr/bin/grep -v '^$' > /dev/null; then
    fail "Mermaid block on single line (invalid)"
else
    pass "No single-line mermaid blocks"
fi

# Matching code blocks
OPEN_BLOCKS=$(/usr/bin/grep -c '```mermaid' "$ARCH_FILE" 2>/dev/null || echo 0)
CLOSE_BLOCKS=$(/usr/bin/grep -c '```$' "$ARCH_FILE" 2>/dev/null || echo 0)

if [ "$CLOSE_BLOCKS" -ge "$OPEN_BLOCKS" ]; then
    pass "Code blocks properly closed"
else
    fail "Unclosed code blocks detected"
fi

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo "========================================="

if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}ARCHITECTURE DIAGRAMS: PASS${NC}"
    echo "- $EXPECTED_SECTIONS/$EXPECTED_SECTIONS main sections"
    echo "- $COMPLIANCE_FOUND/$COMPLIANCE_EXPECTED compliance subsections"
    echo "- $TOTAL_DIAGRAMS Mermaid diagrams"
    echo "- $ADR_FOUND/$ADR_REQUIRED required ADRs"
    [ "$WARNINGS" -gt 0 ] && echo -e "${YELLOW}$WARNINGS warnings (review recommended)${NC}"
    exit 0
else
    echo -e "${RED}ARCHITECTURE DIAGRAMS: FAIL${NC}"
    echo "$FAILED issues found:"
    echo -e "$ISSUES"
    exit 1
fi
