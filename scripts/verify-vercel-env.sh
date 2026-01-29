#!/bin/bash
# Verify Vercel and local environment variables for deployment readiness
# Checks: required env vars, optional recommendations, certificate files
# Exit code: 0 if all required checks pass, 1 otherwise

set -e

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
if [ -z "$DATABASE_URL" ]; then
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
if [ -z "$NODE_ENV" ]; then
  if [ "$IS_PRODUCTION" = "true" ]; then
    echo "❌ NODE_ENV: MISSING (required in CI/production)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  else
    echo "⚠️  NODE_ENV: NOT SET (optional in local dev, required in CI/production)"
  fi
else
  echo "✅ NODE_ENV: SET ($NODE_ENV)"
fi

# Check VERCEL_TOKEN (required in CI/production for deployment, required on main branch push)
if [ -z "$VERCEL_TOKEN" ]; then
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
  echo "✅ VERCEL_TOKEN: SET (token length: ${#VERCEL_TOKEN} chars)"
fi

# ============================================================================
# SECTION 2: Check optional but recommended variables
# ============================================================================
echo ""
echo "2. Optional but recommended variables:"
echo "--------------------------------------"

# Check SUPABASE_CA_CERT (optional but recommended)
if [ -z "$SUPABASE_CA_CERT" ]; then
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
# SECTION 4: List environment variables from Vercel (if CLI available)
# ============================================================================
echo ""
echo "4. Vercel environment variables (if available):"
echo "-----------------------------------------------"

if command -v vercel &> /dev/null; then
  echo "Attempting to pull from Vercel..."

  # Safely attempt to pull - don't fail if it doesn't work
  TEMP_FILE=$(mktemp)
  if vercel env ls > "$TEMP_FILE" 2>/dev/null || vercel env pull "$TEMP_FILE" --environment production > /dev/null 2>&1; then
    if [ -s "$TEMP_FILE" ]; then
      echo "Environment variables available:"
      /usr/bin/head -20 "$TEMP_FILE" | /usr/bin/sed 's/^/  /'
      LINE_COUNT=$(/usr/bin/wc -l < "$TEMP_FILE" 2>/dev/null || echo "0")
      if [ -n "$LINE_COUNT" ] && [ "$LINE_COUNT" -gt 20 ] 2>/dev/null; then
        REMAINING=$((LINE_COUNT - 20))
        echo "  ... and $REMAINING more"
      fi
    else
      echo "⚠️  No output from Vercel command"
    fi
  else
    echo "⚠️  Could not retrieve Vercel environment (this is OK if not configured)"
  fi
  rm -f "$TEMP_FILE"
else
  echo "⚠️  Vercel CLI not installed - skipping Vercel checks"
fi

# ============================================================================
# FINAL VERDICT
# ============================================================================
echo ""
echo "========================================="

if [ "$FAILED_CHECKS" -eq 0 ]; then
  echo "✅ All required environment variables are set!"
  echo "========================================="
  exit 0
else
  echo "❌ $FAILED_CHECKS required check(s) failed!"
  echo "========================================="
  exit 1
fi
