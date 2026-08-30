#!/bin/bash
# Check Vercel environment variables for common issues
# - Trailing \n (newlines) that break API calls
# - Missing required variables
# - Invalid format

set -e

echo "Checking Vercel production environment variables..."

# Pull production env vars.
#
# `mktemp` creates the file, so `vercel env pull` finds it already there and
# stops to ask whether to overwrite it. With stderr silenced that prompt is
# invisible and the pull writes nothing — this check then inspected an empty
# file, reported every required variable as "missing", and never once looked at
# a real value. `--yes` answers the prompt; the emptiness check below makes the
# failure loud if the pull ever breaks again.
TEMP_FILE=$(mktemp)
vercel env pull "$TEMP_FILE" --environment production --yes >/dev/null 2>&1 || true

if [ ! -s "$TEMP_FILE" ]; then
  rm -f "$TEMP_FILE"
  echo "ERROR: could not read the Vercel production environment (empty pull)."
  echo "  Are you logged in? Try: vercel login && vercel link"
  exit 1
fi

# Check for trailing \n in values
ISSUES=0
SKIPPED=0
while IFS='=' read -r key value; do
  # Skip empty lines and comments
  [[ -z "$key" || "$key" =~ ^# ]] && continue

  # Secrets are stored as sensitive: their value is never returned, so the
  # format check below cannot see them. Count them instead of silently
  # reporting "all good" for values we never inspected.
  if [[ "$value" == '"[SENSITIVE]"' ]]; then
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # Check for literal \n at end of value
  if [[ "$value" =~ \\n\"$ ]]; then
    echo "ERROR: $key has trailing \\n - this will break API calls!"
    echo "  Fix: vercel env rm $key production -y && printf 'correct_value' | vercel env add $key production --force"
    ISSUES=$((ISSUES + 1))
  fi
done < "$TEMP_FILE"

if [ "$SKIPPED" -gt 0 ]; then
  echo "NOTE: $SKIPPED sensitive variable(s) not inspected (values are write-only by design)."
fi

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
