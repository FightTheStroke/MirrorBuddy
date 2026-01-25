#!/bin/bash
# =============================================================================
# SECRETS SCAN - Detect sensitive data committed to repository
# Usage: ./scripts/secrets-scan.sh [--fix] [--json] [--strict]
# Part of: app-release-manager hardening checks
#
# Modes:
#   default  - Production-safe checks (ignores known-safe patterns)
#   --strict - All patterns, includes warnings
# =============================================================================
set -o pipefail
cd "$(dirname "$0")/.."

FIX_MODE=false
JSON_MODE=false
STRICT_MODE=false
for arg in "$@"; do
  [ "$arg" = "--fix" ] && FIX_MODE=true
  [ "$arg" = "--json" ] && JSON_MODE=true
  [ "$arg" = "--strict" ] && STRICT_MODE=true
done

REPORT_FILE="/tmp/secrets-scan-report.md"
CRITICAL_ISSUES=0
WARNING_ISSUES=0
FINDINGS_CRITICAL=()
FINDINGS_WARNING=()

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

add_critical() {
  local category="$1"
  local description="$2"
  local matches="$3"
  FINDINGS_CRITICAL+=("## 🔴 $category\n**Issue**: $description\n\`\`\`\n$matches\n\`\`\`\n")
  CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
}

add_warning() {
  local category="$1"
  local description="$2"
  local matches="$3"
  FINDINGS_WARNING+=("## 🟡 $category\n**Issue**: $description\n\`\`\`\n$matches\n\`\`\`\n")
  WARNING_ISSUES=$((WARNING_ISSUES + 1))
}

# Initialize report
echo "# Secrets Scan Report" > "$REPORT_FILE"
echo "Generated: $(date)" >> "$REPORT_FILE"
echo "Mode: $([ "$STRICT_MODE" = true ] && echo 'STRICT' || echo 'NORMAL')" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# =============================================================================
# CRITICAL: These BLOCK release
# =============================================================================

# 1. Real API keys with known prefixes
echo -n "Scanning for API keys..."
API_KEY_MATCHES=$(rg -n 're_[a-zA-Z0-9]{20,}' \
  -g '!.env.example' -g '!*.md' -g '!node_modules/**' -g '!.next/**' \
  -g '!secrets-scan.sh' src/ scripts/ 2>/dev/null | head -3)
[ -n "$API_KEY_MATCHES" ] && add_critical "Resend API Key" "Real Resend API key detected" "$API_KEY_MATCHES"

# 2. Real Sentry DSN (with actual key, not placeholder)
SENTRY_MATCHES=$(rg -n 'https://[a-f0-9]{32}@[a-z0-9-]+\.ingest\.' \
  -g '!.env.example' -g '!*.md' -g '!node_modules/**' src/ 2>/dev/null | head -3)
[ -n "$SENTRY_MATCHES" ] && add_critical "Sentry DSN" "Real Sentry DSN with key detected" "$SENTRY_MATCHES"

# 3. Real Vercel project/team IDs in source code
VERCEL_MATCHES=$(rg -n '(prj_|team_)[a-zA-Z0-9]{20,}' \
  -g '!.env.example' -g '!*.md' -g '!node_modules/**' -g '!.vercel/**' src/ 2>/dev/null | head -3)
[ -n "$VERCEL_MATCHES" ] && add_critical "Vercel IDs" "Real Vercel project/team ID in code" "$VERCEL_MATCHES"

# 4. Private keys or certificates in code
KEY_MATCHES=$(rg -n '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----' \
  -g '!.env.example' -g '!*.md' -g '!node_modules/**' src/ scripts/ 2>/dev/null | head -3)
[ -n "$KEY_MATCHES" ] && add_critical "Private Keys" "Private key embedded in code" "$KEY_MATCHES"

# 5. JWT/Bearer tokens (actual tokens, not patterns)
JWT_MATCHES=$(rg -n 'eyJ[a-zA-Z0-9_-]{50,}\.eyJ[a-zA-Z0-9_-]{50,}\.' \
  -g '!.env.example' -g '!*.md' -g '!node_modules/**' -g '!*.test.*' src/ 2>/dev/null | head -3)
[ -n "$JWT_MATCHES" ] && add_critical "JWT Tokens" "Hardcoded JWT token detected" "$JWT_MATCHES"

# 6. Password in connection strings (not localhost dev)
PASS_MATCHES=$(rg -n 'postgres://[^:]+:[^@]{8,}@(?!localhost)' \
  -g '!.env.example' -g '!*.md' -g '!node_modules/**' src/ scripts/ 2>/dev/null | head -3)
[ -n "$PASS_MATCHES" ] && add_critical "Database Password" "Password in connection string" "$PASS_MATCHES"

# 7. Username in scripts (specific user, not generic)
# Check for specific username patterns in non-example files
USER_MATCHES=$(rg -n 'postgresql://roberdan@|postgres\..*:.*@aws' \
  -g '!.env.example' -g '!*.md' -g '!secrets-scan.sh' scripts/ 2>/dev/null | head -3)
[ -n "$USER_MATCHES" ] && add_critical "Personal Username" "Personal username in scripts" "$USER_MATCHES"

echo " done"

# =============================================================================
# WARNINGS: These are flagged but don't block (unless --strict)
# =============================================================================

# 8. Hardcoded production URLs (should use env vars)
echo -n "Scanning for hardcoded URLs..."
# mirrorbuddy.grafana.net in code (not docs/comments/admin constants)
# IGNORED: src/app/admin/page.tsx - dashboard link constant (intentional)
# IGNORED: src/lib/observability/grafana-dashboards/*.json - config docs
GRAFANA_MATCHES=$(rg -n 'mirrorbuddy\.grafana\.net' \
  -g '!.env.example' -g '!docs/**' -g '!*.md' -g '!node_modules/**' \
  -g '!src/app/admin/page.tsx' -g '!src/lib/observability/grafana-dashboards/*.json' \
  src/ 2>/dev/null | rg -v '^\s*//' | head -3)
[ -n "$GRAFANA_MATCHES" ] && add_warning "Grafana URL" "Hardcoded Grafana dashboard URL" "$GRAFANA_MATCHES"

# mirrorbuddy.org in fallbacks
# IGNORED: admin-notifier.ts - intentional fallback when env var missing
PROD_MATCHES=$(rg -n 'mirrorbuddy\.org' \
  -g '!.env.example' -g '!docs/**' -g '!*.md' -g '!node_modules/**' \
  -g '!src/lib/safety/escalation/admin-notifier.ts' \
  src/lib/ src/app/api/ 2>/dev/null | rg -v 'example\.com|mailto:' | head -3)
[ -n "$PROD_MATCHES" ] && add_warning "Production URL" "Hardcoded mirrorbuddy.org in lib/api" "$PROD_MATCHES"

# 9. Personal emails in comments/examples (not legal pages)
EMAIL_MATCHES=$(rg -n '(roberdan|mariodanfts)@' \
  -g '!.env.example' -g '!docs/**' -g '!node_modules/**' \
  src/ 2>/dev/null | head -3)
[ -n "$EMAIL_MATCHES" ] && add_warning "Personal Email" "Personal email in code comments" "$EMAIL_MATCHES"

# 10. test.only / describe.only left in tests (skip conditional .skip() which are valid)
ONLY_MATCHES=$(rg -n '\.only\(' \
  -g '*.test.ts' -g '*.test.tsx' -g '*.spec.ts' \
  src/ e2e/ 2>/dev/null | head -3)
[ -n "$ONLY_MATCHES" ] && add_warning "Test Focus" ".only() left in tests" "$ONLY_MATCHES"

# 11. debugger statements
DEBUGGER_MATCHES=$(rg -n '^\s*debugger;?\s*$' \
  -g '!node_modules/**' src/ 2>/dev/null | head -3)
[ -n "$DEBUGGER_MATCHES" ] && add_warning "Debugger" "debugger statement in code" "$DEBUGGER_MATCHES"

echo " done"

# =============================================================================
# OUTPUT
# =============================================================================

# Write findings to report
if [ ${#FINDINGS_CRITICAL[@]} -gt 0 ]; then
  echo "# Critical Issues (BLOCKING)" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
  for finding in "${FINDINGS_CRITICAL[@]}"; do
    echo -e "$finding" >> "$REPORT_FILE"
  done
fi

if [ ${#FINDINGS_WARNING[@]} -gt 0 ]; then
  echo "# Warnings (Non-blocking)" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
  for finding in "${FINDINGS_WARNING[@]}"; do
    echo -e "$finding" >> "$REPORT_FILE"
  done
fi

# Determine exit status
TOTAL_ISSUES=$((CRITICAL_ISSUES + WARNING_ISSUES))
if [ "$STRICT_MODE" = true ]; then
  EXIT_ISSUES=$TOTAL_ISSUES
else
  EXIT_ISSUES=$CRITICAL_ISSUES
fi

if $JSON_MODE; then
  echo "{\"status\":\"$([ $EXIT_ISSUES -eq 0 ] && echo PASS || echo FAIL)\",\"critical\":$CRITICAL_ISSUES,\"warnings\":$WARNING_ISSUES,\"report\":\"$REPORT_FILE\"}"
else
  echo ""
  if [ "$CRITICAL_ISSUES" -eq 0 ] && [ "$WARNING_ISSUES" -eq 0 ]; then
    echo -e "${GREEN}✓ SECRETS SCAN PASS${NC} - No sensitive data detected"
    rm -f "$REPORT_FILE"
  elif [ "$CRITICAL_ISSUES" -eq 0 ]; then
    echo -e "${YELLOW}⚠ SECRETS SCAN PASS (with warnings)${NC}"
    echo -e "  Warnings: $WARNING_ISSUES (non-blocking)"
    echo "  Report: $REPORT_FILE"
  else
    echo -e "${RED}✗ SECRETS SCAN FAIL${NC}"
    echo -e "  ${RED}Critical: $CRITICAL_ISSUES (BLOCKING)${NC}"
    [ "$WARNING_ISSUES" -gt 0 ] && echo -e "  ${YELLOW}Warnings: $WARNING_ISSUES${NC}"
    echo "  Report: $REPORT_FILE"
    echo ""
    echo "Critical issues found:"
    for finding in "${FINDINGS_CRITICAL[@]}"; do
      echo "$finding" | head -1 | sed 's/## 🔴 /  - /'
    done

    if $FIX_MODE; then
      echo ""
      echo -e "${CYAN}Fix suggestions:${NC}"
      echo "  1. Move hardcoded values to .env"
      echo "  2. Use process.env.VARIABLE_NAME"
      echo "  3. Check git history: git log -p --all -S 'pattern'"
      echo "  4. Remove from history if needed: git filter-branch or BFG"
    fi
  fi
fi

[ "$EXIT_ISSUES" -gt 0 ] && exit 1
exit 0
