#!/bin/bash
# =============================================================================
# CHECK COMPLIANCE DIAGRAMS
# Validates that ARCHITECTURE-DIAGRAMS.md contains all required compliance sections
# Used by: release-brutal.sh Phase 7
# =============================================================================
set -o pipefail
cd "$(dirname "$0")/.."

ARCH_FILE="ARCHITECTURE-DIAGRAMS.md"
FAILED=0
ISSUES=""

# Color output (if terminal supports it)
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

pass() {
    echo -e "${GREEN}✓${NC} $1"
}

fail() {
    echo -e "${RED}✗${NC} $1"
    FAILED=$((FAILED + 1))
    ISSUES="$ISSUES\n- $1"
}

# =============================================================================
# CHECK FILE EXISTS
# =============================================================================
if [ ! -f "$ARCH_FILE" ]; then
    echo "ERROR: $ARCH_FILE not found"
    exit 1
fi

echo "Checking compliance diagrams in $ARCH_FILE..."
echo ""

# =============================================================================
# REQUIRED SECTIONS (pattern -> description)
# =============================================================================
declare -a SECTIONS=(
    "### 19.1 Five-Layer Safety|GDPR/AI Act: Safety Architecture"
    "### 19.2 Compliance Framework|GDPR: Compliance Overview"
    "### 19.3 COPPA Compliance Flow|COPPA: Under 13 Flow"
    "### 19.4 GDPR Data Lifecycle|GDPR Art. 5,6,17: Data Lifecycle"
    "### 19.5 User Rights|GDPR Art. 15-22: User Rights"
    "### 19.6 Consent Management|GDPR Art. 7: Consent"
    "### 19.7 Consent Categories|GDPR Art. 7: Consent Categories"
    "### 19.8 Parent Dashboard|COPPA: Parent Oversight"
    "### 19.9 Parent-Minor Link|COPPA: Parent-Minor Link"
    "### 19.10 EU AI Act Compliance|AI Act Art. 6-15: Compliance"
    "### 19.11 Human Oversight|AI Act Art. 14: Human Oversight"
    "### 19.12 AI Explainability|AI Act Art. 13: Transparency"
    "### 19.13 Compliance Audit Trail|GDPR Art. 30: Records"
    "### 19.14 Data Breach Notification|GDPR Art. 33-34: Breach"
    "### 19.15 Third-Party Data Flow|GDPR Art. 28: Processors"
    "### 19.16 DSAR Response SLA|GDPR Art. 12: DSAR Timeline"
    "### 19.17 Age Gating|COPPA/L.132: Age Restrictions"
    "### 19.18 Security Incident Response|GDPR Art. 32: Security"
    "### 19.19 Incident Severity Matrix|Best Practice: Severity"
    "### 19.20 Annual Compliance Calendar|GDPR Art. 35(11): Review"
    "### 19.21 Compliance Checklist Summary|Overview: Checklist"
)

echo "=== Section Existence Checks ==="
for item in "${SECTIONS[@]}"; do
    pattern="${item%%|*}"
    description="${item##*|}"

    if grep -q "$pattern" "$ARCH_FILE" 2>/dev/null; then
        pass "$description"
    else
        fail "MISSING: $description ($pattern)"
    fi
done

echo ""
echo "=== Mermaid Diagram Checks ==="

# Count mermaid diagrams in Section 19 (Compliance)
# Extract Section 19 content (from "## 19." to "## 20.")
SECTION_19_DIAGRAMS=$(awk '/^## 19\. Compliance/,/^## 20\./' "$ARCH_FILE" 2>/dev/null | grep -c '```mermaid' || echo 0)

# We need at least 21 diagrams (one per subsection, some sections have multiple)
MIN_REQUIRED_DIAGRAMS=21

if [ "$SECTION_19_DIAGRAMS" -ge "$MIN_REQUIRED_DIAGRAMS" ]; then
    pass "Section 19 has $SECTION_19_DIAGRAMS Mermaid diagrams (min: $MIN_REQUIRED_DIAGRAMS)"
else
    fail "Section 19 has only $SECTION_19_DIAGRAMS Mermaid diagrams (need: $MIN_REQUIRED_DIAGRAMS)"
fi

echo ""
echo "=== ADR Cross-Reference Checks ==="

# Required ADRs that must be in the index
declare -a REQUIRED_ADRS=(
    "0004|Safety Guardrails"
    "0008|Parent Dashboard"
    "0062|AI Compliance"
)

for adr in "${REQUIRED_ADRS[@]}"; do
    adr_num="${adr%%|*}"
    adr_name="${adr##*|}"

    if grep -qE "ADR.?0?$adr_num|0$adr_num.*$adr_name" "$ARCH_FILE" 2>/dev/null; then
        pass "ADR $adr_num ($adr_name) referenced"
    else
        fail "ADR $adr_num ($adr_name) not in ADR Index"
    fi
done

echo ""
echo "=== Version Consistency Check ==="

# Extract header and footer versions
HEADER_VERSION=$(grep -E '^\*\*Version\*\*:' "$ARCH_FILE" | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
FOOTER_VERSION=$(grep -E '^_Version:' "$ARCH_FILE" | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')

if [ "$HEADER_VERSION" = "$FOOTER_VERSION" ] && [ -n "$HEADER_VERSION" ]; then
    pass "Version consistent: $HEADER_VERSION"
else
    fail "Version mismatch: header=$HEADER_VERSION, footer=$FOOTER_VERSION"
fi

echo ""
echo "=== Mermaid Syntax Validation ==="

# Count mermaid blocks
MERMAID_COUNT=$(grep -c '```mermaid' "$ARCH_FILE" 2>/dev/null || echo 0)
MERMAID_CLOSE=$(grep -c '```' "$ARCH_FILE" 2>/dev/null || echo 0)

# Each mermaid block needs opening and closing
if [ "$MERMAID_COUNT" -gt 0 ]; then
    pass "Found $MERMAID_COUNT Mermaid diagrams"
else
    fail "No Mermaid diagrams found"
fi

# Check for common syntax issues
if grep -E '```mermaid.*```' "$ARCH_FILE" 2>/dev/null | grep -v '^$' > /dev/null; then
    fail "Mermaid block on single line (invalid)"
fi

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo "========================================="
if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}COMPLIANCE DIAGRAMS: PASS${NC}"
    echo "All 21 required sections present with valid diagrams"
    exit 0
else
    echo -e "${RED}COMPLIANCE DIAGRAMS: FAIL${NC}"
    echo "$FAILED issues found:"
    echo -e "$ISSUES"
    exit 1
fi
