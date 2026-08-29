#!/usr/bin/env bash
# ============================================================================
# AZURE KEY DRIFT CHECK
#
# The Azure OpenAI key lives in four places: the Azure account itself, Vercel
# production, the GitHub Actions secrets, and kv-virtualbpm-prod. On 28 August
# 2026 the key was regenerated in the portal and the other stores were updated
# out of order; the Key Vault copy was never updated at all and sat dead from
# 29 November 2025 until this check was written. Nothing noticed, because
# nothing was looking.
#
# A key is "alive" if Azure answers it. That is the only test that matters, and
# it needs no permission to read the key itself, so it works everywhere.
#
# Usage:
#   ./scripts/check-azure-key-drift.sh
#
# Reads AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY and, when present,
# AZURE_OPENAI_REALTIME_API_KEY from the environment. When the Azure CLI is
# logged in it also checks the Key Vault copies.
# ============================================================================

set -uo pipefail

API_VERSION="2024-10-21"
VAULT="${AZURE_KEY_VAULT_NAME:-kv-virtualbpm-prod}"
SUBSCRIPTION="${AZURE_SUBSCRIPTION_ID:-8015083b-adad-42ff-922d-feaed61c5d62}"

FAILURES=0
SKIPPED=0
# When set, a store that could not be checked is a failure rather than a note.
# A green job that quietly skipped the store which was actually dead is how the
# nine months happened.
STRICT="${AZURE_KEY_DRIFT_STRICT:-false}"

probe() {
  local label="$1" endpoint="$2" key="$3"

  if [[ -z "$key" || "$key" == "[SENSITIVE]" ]]; then
    echo "SKIP  $label — no readable value here"
    SKIPPED=$((SKIPPED + 1))
    return 0
  fi

  local url="${endpoint%/}/openai/models?api-version=${API_VERSION}"
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$url" -H "api-key: ${key}")

  if [[ "$code" == "200" ]]; then
    echo "OK    $label — Azure accepts this key"
  else
    echo "DEAD  $label — Azure answered HTTP ${code}"
    FAILURES=$((FAILURES + 1))
  fi
}

ENDPOINT="${AZURE_OPENAI_ENDPOINT:-}"
if [[ -z "$ENDPOINT" ]]; then
  echo "AZURE_OPENAI_ENDPOINT is not set — cannot check anything."
  exit 1
fi

probe "environment: AZURE_OPENAI_API_KEY" "$ENDPOINT" "${AZURE_OPENAI_API_KEY:-}"
probe "environment: AZURE_OPENAI_REALTIME_API_KEY" \
  "${AZURE_OPENAI_REALTIME_ENDPOINT:-$ENDPOINT}" "${AZURE_OPENAI_REALTIME_API_KEY:-}"

if command -v az >/dev/null 2>&1 && az account show --only-show-errors >/dev/null 2>&1; then
  for secret in azure-openai-api-key azure-openai-realtime-api-key; do
    value=$(az keyvault secret show --vault-name "$VAULT" --name "$secret" \
      --subscription "$SUBSCRIPTION" --query value -o tsv 2>/dev/null || true)
    if [[ -z "$value" ]]; then
      echo "SKIP  key vault: ${secret} — not readable from here"
      SKIPPED=$((SKIPPED + 1))
    else
      probe "key vault: ${secret}" "$ENDPOINT" "$value"
    fi
  done
else
  echo "SKIP  key vault — Azure CLI not logged in"
  SKIPPED=$((SKIPPED + 2))
fi

echo ""
if [[ $FAILURES -gt 0 ]]; then
  cat <<'EOF'
A store is holding a key Azure no longer accepts.

Rotation updates every store, in this order (docs/operations/AZURE-KEY-ROTATION.md):
  1. Vercel production      2. GitHub Actions secrets
  3. kv-virtualbpm-prod     4. only then regenerate the old key in Azure
EOF
  exit 1
fi

echo "Every reachable store holds a key Azure accepts."

if [[ $SKIPPED -gt 0 ]]; then
  echo "${SKIPPED} store(s) could not be checked from here."
  if [[ "$STRICT" == "true" ]]; then
    echo "AZURE_KEY_DRIFT_STRICT=true — an unchecked store is not a pass."
    exit 1
  fi
fi
