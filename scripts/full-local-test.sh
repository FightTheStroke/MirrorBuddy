#!/usr/bin/env bash
# =============================================================================
# FULL LOCAL TEST ORCHESTRATOR
# Comprehensive local testing suite for MirrorBuddy
# ADR 0059: Full UI/E2E testing strategy (F-08, F-19, F-26)
#
# Usage: ./scripts/full-local-test.sh [OPTIONS]
# Options:
#   --visual    Include visual regression tests
#   --bundle    Include bundle analysis
#   --help      Show this help message
# =============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Parse arguments
VISUAL=false
BUNDLE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --visual) VISUAL=true; shift ;;
    --bundle) BUNDLE=true; shift ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo "Options:"
      echo "  --visual    Include visual regression tests"
      echo "  --bundle    Include bundle analysis"
      echo "  --help      Show this help"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Setup
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPORTS_DIR="$ROOT_DIR/reports"
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT
mkdir -p "$REPORTS_DIR"

# Source helpers and export variables for helper functions
source "$SCRIPT_DIR/full-local-test-helpers.sh"
export ROOT_DIR RESULTS WARNINGS FAILED

START_TIME=$(date +%s)
FAILED=0
WARNINGS=0
declare -a RESULTS=()

# Header
echo ""
echo "=========================================="
echo " MIRRORBUDDY FULL LOCAL TEST SUITE"
echo "=========================================="
echo ""
echo "Visual regression: $VISUAL"
echo "Bundle analysis: $BUNDLE"
echo "Reports: $REPORTS_DIR"
echo ""

# PHASE 1: APP HEALTH CHECK
echo -e "${BLUE}[1/10] Checking app health...${NC}"
if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓ App running on localhost:3000${NC}"
  RESULTS+=("✓ App health")
else
  echo -e "${RED}✗ App not running on localhost:3000${NC}"
  echo "   Start with: npm run dev"
  RESULTS+=("✗ App health")
  echo -e "\n${RED}BLOCKED: Cannot proceed without running app${NC}\n"
  exit 1
fi

# PHASE 2: ROUTE INVENTORY
run_optional_script "2/10" "$SCRIPT_DIR/generate-route-inventory.sh" \
  "$TEMP_DIR/routes.log" "Route inventory"

# PHASE 3: TRIAL UI AUDIT
run_e2e_test "3/10" "e2e/full-ui-audit/trial-ui.spec.ts" \
  "$TEMP_DIR/trial.log" "Trial UI"
[ $? -eq 1 ] && FAILED=1

# PHASE 4: ADMIN UI AUDIT
run_e2e_test "4/10" "e2e/full-ui-audit/admin-ui.spec.ts" \
  "$TEMP_DIR/admin.log" "Admin UI"
[ $? -eq 1 ] && FAILED=1

# PHASE 5: SETTINGS TESTS
echo -e "${BLUE}[5/10] Settings tests...${NC}"
if npx playwright test e2e/accessibility.spec.ts > "$TEMP_DIR/settings.log" 2>&1; then
  echo -e "${GREEN}✓ Settings tests passed${NC}"
  RESULTS+=("✓ Settings")
else
  echo -e "${RED}✗ Settings tests failed${NC}"
  cat "$TEMP_DIR/settings.log" | tail -30
  RESULTS+=("✗ Settings")
  FAILED=1
fi

# PHASE 6: VISUAL REGRESSION
echo -e "${BLUE}[6/10] Visual regression tests...${NC}"
if [ "$VISUAL" = true ]; then
  if npx playwright test --grep "@visual" > "$TEMP_DIR/visual.log" 2>&1; then
    echo -e "${GREEN}✓ Visual regression passed${NC}"
    RESULTS+=("✓ Visual regression")
  else
    echo -e "${RED}✗ Visual regression failed${NC}"
    cat "$TEMP_DIR/visual.log" | tail -30
    RESULTS+=("✗ Visual regression")
    FAILED=1
  fi
else
  echo -e "${CYAN}⊘ Visual regression skipped (use --visual)${NC}"
  RESULTS+=("- Visual regression (skipped)")
fi

# PHASE 7: LIGHTHOUSE PERFORMANCE
echo -e "${BLUE}[7/10] Lighthouse performance audit...${NC}"
if npx lhci autorun > "$TEMP_DIR/lighthouse.log" 2>&1; then
  echo -e "${GREEN}✓ Lighthouse passed${NC}"
  RESULTS+=("✓ Lighthouse")
else
  echo -e "${RED}✗ Lighthouse failed${NC}"
  cat "$TEMP_DIR/lighthouse.log" | tail -40
  RESULTS+=("✗ Lighthouse")
  FAILED=1
fi

# PHASE 8: BUNDLE ANALYSIS
echo -e "${BLUE}[8/10] Bundle size analysis...${NC}"
if [ "$BUNDLE" = true ]; then
  BUNDLE_SIZE=$(du -sh .next/static 2>/dev/null | awk '{print $1}' || echo "unknown")
  echo -e "${GREEN}✓ Bundle size: $BUNDLE_SIZE${NC}"
  RESULTS+=("✓ Bundle ($BUNDLE_SIZE)")
else
  echo -e "${CYAN}⊘ Bundle analysis skipped (use --bundle)${NC}"
  RESULTS+=("- Bundle analysis (skipped)")
fi

# PHASE 9: SECURITY SCAN
echo -e "${BLUE}[9/10] Security scan...${NC}"
if [ -f "$SCRIPT_DIR/security-scan.sh" ]; then
  if "$SCRIPT_DIR/security-scan.sh" > "$TEMP_DIR/security.log" 2>&1; then
    echo -e "${GREEN}✓ Security scan passed${NC}"
    RESULTS+=("✓ Security scan")
  else
    echo -e "${RED}✗ Security scan failed${NC}"
    cat "$TEMP_DIR/security.log" | tail -30
    RESULTS+=("✗ Security scan")
    FAILED=1
  fi
else
  if npm audit --audit-level=high > "$TEMP_DIR/npm-audit.log" 2>&1; then
    echo -e "${GREEN}✓ NPM audit passed${NC}"
    RESULTS+=("✓ NPM audit")
  else
    echo -e "${YELLOW}⚠ NPM audit issues${NC}"
    RESULTS+=("⚠ NPM audit")
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# PHASE 10: GENERATE HTML REPORT
echo -e "${BLUE}[10/10] Generating HTML report...${NC}"
REPORT_FILE="$REPORTS_DIR/full-test-report.html"
if [ -f "$SCRIPT_DIR/generate-html-report.sh" ]; then
  if "$SCRIPT_DIR/generate-html-report.sh" "$REPORT_FILE" > "$TEMP_DIR/report.log" 2>&1; then
    echo -e "${GREEN}✓ Report generated: $REPORT_FILE${NC}"
    RESULTS+=("✓ HTML report")
  else
    echo -e "${YELLOW}⚠ Report generation failed${NC}"
    RESULTS+=("⚠ HTML report")
    WARNINGS=$((WARNINGS + 1))
  fi
else
  generate_basic_report "$REPORT_FILE" "${RESULTS[@]}"
  echo -e "${GREEN}✓ Basic report generated: $REPORT_FILE${NC}"
  RESULTS+=("✓ HTML report")
fi

# SUMMARY
END_TIME=$(date +%s)
TOTAL=$((END_TIME - START_TIME))

echo ""
echo "=========================================="
echo " TEST RESULTS SUMMARY"
echo "=========================================="
echo ""

for result in "${RESULTS[@]}"; do
  print_result "$result"
done

echo ""
echo "Total time: ${TOTAL}s"
echo "Report: $REPORT_FILE"
echo ""

if [ $FAILED -ne 0 ]; then
  echo "=========================================="
  echo -e "${RED} ✗ TESTS FAILED${NC}"
  echo "=========================================="
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo "=========================================="
  echo -e "${YELLOW} ⚠ TESTS PASSED WITH WARNINGS${NC}"
  echo "   $WARNINGS warning(s) to review"
  echo "=========================================="
  exit 0
else
  echo "=========================================="
  echo -e "${GREEN} ✓ ALL TESTS PASSED${NC}"
  echo "=========================================="
  exit 0
fi
