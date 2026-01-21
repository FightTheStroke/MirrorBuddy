#!/bin/bash
set -e

# Script to fix Vercel environment variables with trailing \n
# Usage: ./fix-vercel-env-vars.sh [--dry-run] [--var VARIABLE_NAME]

DRY_RUN=false
SPECIFIC_VAR=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --var)
      SPECIFIC_VAR="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Variables with \n that need fixing (from inspection of .env.production.local)
VARS_WITH_NEWLINE=(
  "AZURE_OPENAI_CHAT_DEPLOYMENT"
  "AZURE_OPENAI_EMBEDDING_DEPLOYMENT"
  "AZURE_OPENAI_ENDPOINT"
  "AZURE_OPENAI_REALTIME_DEPLOYMENT"
  "AZURE_OPENAI_REALTIME_ENDPOINT"
  "AZURE_OPENAI_TTS_DEPLOYMENT"
  "GOOGLE_CLIENT_ID"
  "GOOGLE_CLIENT_SECRET"
  "NEXTAUTH_URL"
  "NEXT_PUBLIC_GOOGLE_CLIENT_ID"
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY"
  "RESEND_API_KEY"
  "TRIAL_BUDGET_LIMIT_EUR"
)

# Variables that are empty on Vercel (need to be set from .env)
VARS_EMPTY=(
  "AZURE_OPENAI_API_KEY"
  "AZURE_OPENAI_REALTIME_API_KEY"
  "DATABASE_URL"
  "DIRECT_URL"
  "SESSION_SECRET"
)

fix_variable() {
  local var_name="$1"
  local use_production_value="$2"  # If true, use production value without \n

  local local_value
  if [ "$use_production_value" = "true" ]; then
    # Use current production value but strip \n
    local_value=$(grep "^${var_name}=" .env.production.local 2>/dev/null | cut -d= -f2- | tr -d '"' | sed 's/\\n$//')
  else
    # Use local .env value
    local_value=$(grep "^${var_name}=" .env 2>/dev/null | cut -d= -f2-)
  fi

  if [ -z "$local_value" ]; then
    echo "❌ $var_name: not found, skipping"
    return
  fi

  if [ "$DRY_RUN" = true ]; then
    echo "🔍 $var_name: would set to '$local_value' (${#local_value} chars)"
    return
  fi

  echo "🔧 Fixing $var_name..."

  # Remove from Vercel
  echo "y" | vercel env rm "$var_name" production > /dev/null 2>&1 || true

  # Add with correct value from file
  echo -n "$local_value" > /tmp/vercel_var_tmp.txt
  vercel env add "$var_name" production < /tmp/vercel_var_tmp.txt > /dev/null

  echo "✅ $var_name: fixed"
}

echo "==================================="
echo "Vercel Environment Variables Fixer"
echo "==================================="
echo ""

if [ "$DRY_RUN" = true ]; then
  echo "🔍 DRY RUN MODE - No changes will be made"
  echo ""
fi

if [ -n "$SPECIFIC_VAR" ]; then
  echo "Fixing specific variable: $SPECIFIC_VAR"
  fix_variable "$SPECIFIC_VAR"
  exit 0
fi

echo "Phase 1: Variables with trailing \\n (${#VARS_WITH_NEWLINE[@]} total)"
echo ""

for var in "${VARS_WITH_NEWLINE[@]}"; do
  # NEXTAUTH_URL must use production value (https://mirrorbuddy.vercel.app)
  if [ "$var" = "NEXTAUTH_URL" ]; then
    fix_variable "$var" "true"
  else
    fix_variable "$var"
  fi
done

echo ""
echo "Phase 2: Empty variables (${#VARS_EMPTY[@]} total)"
echo ""

for var in "${VARS_EMPTY[@]}"; do
  fix_variable "$var"
done

echo ""
echo "==================================="
echo "Done! Run 'vercel env pull --environment production' to verify"
echo "==================================="
