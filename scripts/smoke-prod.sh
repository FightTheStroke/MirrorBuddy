#!/usr/bin/env bash
# Production Smoke Tests — Run read-only tests against live production
#
# Usage:
#   ./scripts/smoke-prod.sh              # All tests, headless
#   ./scripts/smoke-prod.sh --headed     # Watch in browser
#   ./scripts/smoke-prod.sh --admin      # Include admin tests (requires cookie)
#   ./scripts/smoke-prod.sh --mobile     # Include mobile viewport
#   ./scripts/smoke-prod.sh --fast       # Infrastructure + welcome only
#   PROD_URL=https://staging.mirrorbuddy.org ./scripts/smoke-prod.sh  # Custom URL
#
# Admin tests require:
#   export ADMIN_READONLY_COOKIE_VALUE="<signed-readonly-admin-cookie>"
#
# These tests are READ-ONLY. They never create, modify, or delete data.
# They use Trial mode (anonymous) and mock consent walls client-side.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

PROD_URL="${PROD_URL:-https://mirrorbuddy.vercel.app}"
EXTRA_ARGS=()
PROJECT="--project=desktop"
SPEC_FILTER=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --headed)
      EXTRA_ARGS+=("--headed")
      shift
      ;;
    --admin)
      if [[ -z "${ADMIN_READONLY_COOKIE_VALUE:-}" ]]; then
        echo "⚠️  --admin requires ADMIN_READONLY_COOKIE_VALUE env var"
        echo "   Get it from browser DevTools → Application → Cookies → mirrorbuddy-admin"
        exit 1
      fi
      shift
      ;;
    --mobile)
      PROJECT="--project=mobile"
      shift
      ;;
    --fast)
      SPEC_FILTER="e2e/production-smoke/01-infrastructure.spec.ts e2e/production-smoke/02-welcome.spec.ts"
      shift
      ;;
    --debug)
      EXTRA_ARGS+=("--debug")
      shift
      ;;
    *)
      EXTRA_ARGS+=("$1")
      shift
      ;;
  esac
done

echo "🔍 Production Smoke Tests"
echo "   URL: $PROD_URL"
echo "   Project: ${PROJECT#--project=}"
echo "   Admin: ${ADMIN_READONLY_COOKIE_VALUE:+enabled}${ADMIN_READONLY_COOKIE_VALUE:-disabled}"
echo ""

# Run tests
PROD_URL="$PROD_URL" npx playwright test \
  --config playwright.config.production-smoke.ts \
  $PROJECT \
  ${SPEC_FILTER} \
  "${EXTRA_ARGS[@]}" 2>&1

EXIT_CODE=$?

if [[ $EXIT_CODE -eq 0 ]]; then
  echo ""
  echo "✅ All production smoke tests passed"
else
  echo ""
  echo "❌ Some smoke tests failed (exit code: $EXIT_CODE)"
  echo "   Run with --headed to debug visually"
  echo "   Report: playwright-report/production-smoke/index.html"
fi

exit $EXIT_CODE
