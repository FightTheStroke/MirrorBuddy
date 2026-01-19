#!/bin/bash

#############################################################################
# Security Scan Script - npm audit + OWASP ZAP (optional)
#
# Usage: ./scripts/security-scan.sh [--no-audit] [--no-zap]
#
# F-18: Implement security scanning in CI/CD
# F-30: OWASP Top 10 vulnerability detection
# F-31: Automated security baseline enforcement
#############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REPORT_DIR="${PROJECT_ROOT}/.security-reports"
ZAP_REPORT="${REPORT_DIR}/zap-report.json"
AUDIT_REPORT="${REPORT_DIR}/audit-report.json"
EXIT_CODE=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

mkdir -p "$REPORT_DIR"

#############################################################################
# 1. NPM AUDIT - Check for package vulnerabilities
#############################################################################
run_npm_audit() {
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Running npm audit..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  cd "$PROJECT_ROOT"

  # Run audit and save JSON report
  if npm audit --json > "$AUDIT_REPORT" 2>&1; then
    echo -e "${GREEN}✓ npm audit passed${NC}"
  else
    # Parse audit report for critical/high vulnerabilities
    CRITICAL=$(jq '[.vulnerabilities[] | select(.severity=="critical")] | length' "$AUDIT_REPORT" 2>/dev/null || echo 0)
    HIGH=$(jq '[.vulnerabilities[] | select(.severity=="high")] | length' "$AUDIT_REPORT" 2>/dev/null || echo 0)

    if [[ $CRITICAL -gt 0 || $HIGH -gt 0 ]]; then
      echo -e "${RED}✗ npm audit found vulnerabilities${NC}"
      echo "  Critical: $CRITICAL, High: $HIGH"
      echo ""
      jq '.vulnerabilities[] | select(.severity=="critical" or .severity=="high") | {package:.package, severity:.severity, title:.title}' "$AUDIT_REPORT" 2>/dev/null || true
      EXIT_CODE=1
    else
      echo -e "${GREEN}✓ No critical/high vulnerabilities${NC}"
    fi
  fi
}

#############################################################################
# 2. OWASP ZAP PASSIVE SCAN - Optional security scanning
#############################################################################
run_zap_scan() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Checking OWASP ZAP availability..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Check for Docker + OWASP ZAP image
  if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⊘ Docker not found, skipping ZAP scan${NC}"
    echo "  Install instructions: https://docs.docker.com/install/"
    return 0
  fi

  if ! docker image inspect owasp/zap2docker-stable &> /dev/null; then
    echo -e "${YELLOW}⊘ OWASP ZAP Docker image not found${NC}"
    echo "  Install with: docker pull owasp/zap2docker-stable"
    return 0
  fi

  # Check if localhost:3000 is running
  if ! nc -z localhost 3000 2>/dev/null; then
    echo -e "${YELLOW}⊘ App not running on localhost:3000, skipping ZAP scan${NC}"
    echo "  Start dev server: npm run dev"
    return 0
  fi

  echo -e "${GREEN}✓ OWASP ZAP available, running passive scan...${NC}"

  # Run ZAP passive scan
  docker run --rm \
    --network host \
    -v "$REPORT_DIR":/zap/wrk \
    owasp/zap2docker-stable zap-baseline.py \
    -t http://localhost:3000 \
    -J /zap/wrk/zap-report.json \
    -r /zap/wrk/zap-baseline.html \
    -p /zap/policies/api-minimal.policy \
    2>&1 | grep -E "PASS|FAIL|Alert" || true

  # Parse ZAP report for high alerts
  if [[ -f "$ZAP_REPORT" ]]; then
    HIGH_ALERTS=$(jq '[.alerts[] | select(.riskcode >= 2)] | length' "$ZAP_REPORT" 2>/dev/null || echo 0)

    if [[ $HIGH_ALERTS -gt 0 ]]; then
      echo -e "${RED}✗ ZAP found high-risk alerts: $HIGH_ALERTS${NC}"
      jq '.alerts[] | select(.riskcode >= 2) | {name:.name, risk:.riskcode, url:.url}' "$ZAP_REPORT" 2>/dev/null || true
      EXIT_CODE=1
    else
      echo -e "${GREEN}✓ No high-risk ZAP alerts${NC}"
    fi
  fi
}

#############################################################################
# MAIN
#############################################################################
main() {
  local run_audit=true
  local run_zap=true

  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case $1 in
      --no-audit) run_audit=false ;;
      --no-zap) run_zap=false ;;
      *) echo "Unknown option: $1"; exit 1 ;;
    esac
    shift
  done

  echo ""
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║         MirrorBuddy Security Scan (npm audit + ZAP)            ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""

  [[ $run_audit == true ]] && run_npm_audit
  [[ $run_zap == true ]] && run_zap_scan

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [[ $EXIT_CODE -eq 0 ]]; then
    echo -e "${GREEN}✓ All security checks passed${NC}"
    echo "  Reports: $REPORT_DIR/"
  else
    echo -e "${RED}✗ Security checks failed${NC}"
    echo "  Reports: $REPORT_DIR/"
  fi

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  exit $EXIT_CODE
}

main "$@"
