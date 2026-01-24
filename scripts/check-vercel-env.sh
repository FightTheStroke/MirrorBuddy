#!/bin/bash
# Check Vercel environment variables for common issues
# - Trailing \n (newlines) that break API calls
# - Missing required variables
# - Invalid format

set -e

echo "Checking Vercel production environment variables..."

# Pull production env vars
TEMP_FILE=$(mktemp)
vercel env pull "$TEMP_FILE" --environment production 2>/dev/null

# Check for trailing \n in values
ISSUES=0
while IFS='=' read -r key value; do
  # Skip empty lines and comments
  [[ -z "$key" || "$key" =~ ^# ]] && continue

  # Check for literal \n at end of value
  if [[ "$value" =~ \\n\"$ ]]; then
    echo "ERROR: $key has trailing \\n - this will break API calls!"
    echo "  Fix: vercel env rm $key production -y && printf 'correct_value' | vercel env add $key production --force"
    ISSUES=$((ISSUES + 1))
  fi
done < "$TEMP_FILE"

# Check required Sentry variables
REQUIRED_VARS=("NEXT_PUBLIC_SENTRY_DSN" "SENTRY_AUTH_TOKEN" "SENTRY_ORG" "SENTRY_PROJECT")
for var in "${REQUIRED_VARS[@]}"; do
  if ! grep -q "^$var=" "$TEMP_FILE"; then
    echo "WARNING: Missing required variable: $var"
    ISSUES=$((ISSUES + 1))
  fi
done

rm "$TEMP_FILE"

if [ $ISSUES -eq 0 ]; then
  echo "All Vercel environment variables look good!"
  exit 0
else
  echo ""
  echo "Found $ISSUES issue(s). Please fix before deploying."
  exit 1
fi
