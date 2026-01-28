#!/bin/bash
# Sync local .env variables to GitHub Actions repository secrets
# IMPORTANT:
# - Requires GitHub CLI: https://cli.github.com/  (gh auth login)
# - Never logs secret values, only variable names and lengths.
# - Default source file: .env  (override with: ./scripts/sync-github-secrets-from-env.sh path/to/file)
#
# Usage:
#   ./scripts/sync-github-secrets-from-env.sh           # use .env
#   ./scripts/sync-github-secrets-from-env.sh .env.prod # custom file
#
# Scope:
# - Creates/updates GitHub Actions secrets for this repository only.

set -euo pipefail

ENV_FILE="${1:-.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Env file not found: $ENV_FILE"
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "❌ GitHub CLI (gh) is not installed."
  echo "   Install from: https://cli.github.com/ and run 'gh auth login'."
  exit 1
fi

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo '')"
if [ -z "$REPO" ]; then
  echo "❌ Unable to detect current GitHub repository. Are you in a cloned repo and logged in with 'gh auth login'?"
  exit 1
fi

echo "=============================================="
echo "GitHub Secrets Sync from env file"
echo "Repository: $REPO"
echo "Source file: $ENV_FILE"
echo "=============================================="
echo ""

UPDATED=0
SKIPPED=0

while IFS= read -r line || [ -n "$line" ]; do
  # Skip comments and blank lines
  case "$line" in
    ''|\#*) continue ;;
  esac

  # Only handle KEY=VALUE lines
  if [[ "$line" != *=* ]]; then
    continue
  fi

  key="${line%%=*}"
  value="${line#*=}"

  # Trim whitespace from key
  key="$(echo "$key" | tr -d '[:space:]')"
  if [ -z "$key" ]; then
    continue
  fi

  # Avoid accidentally syncing obviously local-only vars by convention, if needed later.
  # For now, sync everything defined in the file.

  # Do not print the value, only length
  value_len=${#value}

  echo "🔐 Syncing secret: $key (length: ${value_len} chars)"

  # Pipe value directly to gh secret set to avoid exposing it
  # Use --body from stdin; gh handles encryption and storage.
  printf '%s' "$value" | gh secret set "$key" --repo "$REPO" --app actions --body - >/dev/null

  UPDATED=$((UPDATED + 1))
done < "$ENV_FILE"

echo ""
echo "=============================================="
echo "Secrets sync completed"
echo "Updated secrets: $UPDATED"
echo "Skipped lines:   $SKIPPED"
echo "=============================================="

exit 0

