#!/bin/bash
# Verify Vercel and local environment variables for deployment readiness
# Checks: required env vars, optional recommendations, certificate files
# Exit code: 0 if all required checks pass, 1 otherwise

set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
source "$ROOT_DIR/scripts/lib/vercel-link.sh"

echo "========================================="
echo "Environment Verification for Deployment"
echo "========================================="
echo ""

# Track overall status
FAILED_CHECKS=0

# ============================================================================
# SECTION 1: Check required environment variables
# ============================================================================
echo "1. Required environment variables:"
echo "-----------------------------------"

# Detect if we're in CI or production environment
IS_CI="${CI:-false}"
VERCEL_ENV_VALUE="${VERCEL_ENV:-}"
IS_PRODUCTION=false
if [ "$IS_CI" = "true" ] || [ "$VERCEL_ENV_VALUE" = "production" ]; then
  IS_PRODUCTION=true
fi

# Check DATABASE_URL (required in CI/production, optional in local dev)
if [ -z "${DATABASE_URL:-}" ]; then
  if [ "$IS_PRODUCTION" = "true" ]; then
    echo "❌ DATABASE_URL: MISSING (required in CI/production)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  else
    echo "⚠️  DATABASE_URL: NOT SET (optional in local dev, required in CI/production)"
  fi
else
  echo "✅ DATABASE_URL: SET"
fi

# Check NODE_ENV (required in CI/production, optional in local dev)
if [ -z "${NODE_ENV:-}" ]; then
  if [ "$IS_PRODUCTION" = "true" ]; then
    echo "❌ NODE_ENV: MISSING (required in CI/production)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  else
    echo "⚠️  NODE_ENV: NOT SET (optional in local dev, required in CI/production)"
  fi
else
  echo "✅ NODE_ENV: SET"
fi

# Check VERCEL_TOKEN (required in CI/production for deployment, required on main branch push)
if [ -z "${VERCEL_TOKEN:-}" ]; then
  if [ "$IS_PRODUCTION" = "true" ] || [ "${GITHUB_REF:-}" = "refs/heads/main" ]; then
    echo "❌ VERCEL_TOKEN: MISSING (required in CI/production and for main branch deployments)"
    echo "   How to fix:"
    echo "   1. Regenerate token: https://vercel.com/account/tokens"
    echo "   2. Update GitHub secret: https://github.com/FightTheStroke/MirrorBuddy/settings/secrets/actions"
    echo "   3. Set: VERCEL_TOKEN to the new personal access token"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  else
    echo "⚠️  VERCEL_TOKEN: NOT SET (optional for local dev, required for production deployments)"
  fi
else
  echo "✅ VERCEL_TOKEN: SET"
fi

# ============================================================================
# SECTION 2: Check optional but recommended variables
# ============================================================================
echo ""
echo "2. Optional but recommended variables:"
echo "--------------------------------------"

# Check SUPABASE_CA_CERT (optional but recommended)
if [ -z "${SUPABASE_CA_CERT:-}" ]; then
  echo "⚠️  SUPABASE_CA_CERT: NOT SET (optional - recommended for production)"
else
  echo "✅ SUPABASE_CA_CERT: SET"
fi

# ============================================================================
# SECTION 3: Verify local SSL certificate file
# ============================================================================
echo ""
echo "3. Local SSL certificate verification:"
echo "--------------------------------------"

CERT_PATH="config/supabase-chain.pem"
if [ -f "$CERT_PATH" ]; then
  CERT_SIZE=$(stat -f%z "$CERT_PATH" 2>/dev/null || stat -c%s "$CERT_PATH" 2>/dev/null || echo "0")
  if [ "$CERT_SIZE" -gt 100 ]; then
    echo "✅ $CERT_PATH: EXISTS ($CERT_SIZE bytes)"
  else
    echo "⚠️  $CERT_PATH: EXISTS but seems too small ($CERT_SIZE bytes)"
  fi
else
  echo "⚠️  $CERT_PATH: NOT FOUND (optional - for Supabase SSL)"
fi

# ============================================================================
# SECTION 4: Required remote names-only validation
# ============================================================================
echo ""
echo "4. Vercel production environment names:"
echo "-----------------------------------------------"

if command -v vercel &> /dev/null; then
  if ! VERCEL_CWD=$(resolve_vercel_cwd "$ROOT_DIR") ||
     ! pnpm exec tsx scripts/check-production-env.ts metadata "$VERCEL_CWD"; then
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  fi
else
  echo "❌ Vercel CLI missing: required production metadata cannot be checked"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# ============================================================================
# FINAL VERDICT
# ============================================================================
echo ""
echo "========================================="

if [ "$FAILED_CHECKS" -eq 0 ]; then
  echo "✅ Local requirements and production environment names passed."
  echo "Production values are validated only inside the deployment runtime."
  echo "========================================="
  exit 0
else
  echo "❌ $FAILED_CHECKS required check(s) failed!"
  echo "========================================="
  exit 1
fi
