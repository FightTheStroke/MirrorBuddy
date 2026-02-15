#!/usr/bin/env bash
# ============================================================================
# env-vault.sh — Backup/Restore .env to/from Azure Key Vault
#
# Usage:
#   ./scripts/env-vault.sh backup   # Save .env to Key Vault
#   ./scripts/env-vault.sh restore  # Download .env from Key Vault
#   ./scripts/env-vault.sh diff     # Compare local .env vs Key Vault version
#   ./scripts/env-vault.sh status   # Show backup info
#
# Prerequisites: az CLI logged in, access to kv-virtualbpm-prod
# ============================================================================
set -euo pipefail

VAULT_NAME="kv-virtualbpm-prod"
SECRET_NAME="mirrorbuddy-env-backup"
ENV_FILE=".env"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

backup() {
  if [ ! -f "$ENV_FILE" ]; then
    echo "❌ No $ENV_FILE found in $PROJECT_DIR"
    exit 1
  fi

  local var_count
  var_count=$(grep -cE "^[A-Z_]+=" "$ENV_FILE")
  local encoded
  encoded=$(base64 < "$ENV_FILE")

  az keyvault secret set \
    --vault-name "$VAULT_NAME" \
    --name "$SECRET_NAME" \
    --value "$encoded" \
    --content-type "application/x-dotenv" \
    --tags "project=mirrorbuddy" "backup-date=$(date -u +%Y-%m-%dT%H:%M:%SZ)" "var-count=$var_count" \
    --output none 2>&1

  echo "✅ Backed up $ENV_FILE ($var_count vars) to $VAULT_NAME/$SECRET_NAME"
}

restore() {
  if [ -f "$ENV_FILE" ]; then
    echo "⚠️  $ENV_FILE already exists. Saving as $ENV_FILE.bak"
    cp "$ENV_FILE" "$ENV_FILE.bak"
  fi

  local encoded
  encoded=$(az keyvault secret show \
    --vault-name "$VAULT_NAME" \
    --name "$SECRET_NAME" \
    --query "value" -o tsv 2>&1)

  echo "$encoded" | base64 --decode > "$ENV_FILE"

  local var_count
  var_count=$(grep -cE "^[A-Z_]+=" "$ENV_FILE")
  echo "✅ Restored $ENV_FILE ($var_count vars) from $VAULT_NAME/$SECRET_NAME"
}

show_diff() {
  if [ ! -f "$ENV_FILE" ]; then
    echo "❌ No local $ENV_FILE to compare"
    exit 1
  fi

  local encoded
  encoded=$(az keyvault secret show \
    --vault-name "$VAULT_NAME" \
    --name "$SECRET_NAME" \
    --query "value" -o tsv 2>&1)

  local tmp_vault
  tmp_vault=$(mktemp)
  echo "$encoded" | base64 --decode > "$tmp_vault"

  echo "═══ Variables only in LOCAL .env ═══"
  diff <(grep -E "^[A-Z_]+=" "$ENV_FILE" | cut -d= -f1 | sort) \
       <(grep -E "^[A-Z_]+=" "$tmp_vault" | cut -d= -f1 | sort) \
    | grep "^<" | sed 's/^< /  + /' || echo "  (none)"

  echo ""
  echo "═══ Variables only in VAULT ═══"
  diff <(grep -E "^[A-Z_]+=" "$ENV_FILE" | cut -d= -f1 | sort) \
       <(grep -E "^[A-Z_]+=" "$tmp_vault" | cut -d= -f1 | sort) \
    | grep "^>" | sed 's/^> /  + /' || echo "  (none)"

  echo ""
  echo "═══ Variables with DIFFERENT values ═══"
  local changed=0
  while IFS='=' read -r key val; do
    [[ "$key" =~ ^# ]] && continue
    [[ -z "$key" ]] && continue
    local vault_val
    vault_val=$(grep "^${key}=" "$tmp_vault" 2>/dev/null | cut -d= -f2-)
    if [ -n "$vault_val" ] && [ "$val" != "$vault_val" ]; then
      echo "  ~ $key"
      changed=$((changed + 1))
    fi
  done < <(grep -E "^[A-Z_]+=" "$ENV_FILE")

  [ "$changed" -eq 0 ] && echo "  (none — all values match)"

  rm -f "$tmp_vault"
}

status() {
  local info
  info=$(az keyvault secret show \
    --vault-name "$VAULT_NAME" \
    --name "$SECRET_NAME" \
    --query "{created:attributes.created, updated:attributes.updated, version:id, tags:tags}" \
    -o json 2>&1)

  echo "═══ Key Vault Backup Status ═══"
  echo "$info" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f\"  Vault:    $VAULT_NAME\")
print(f\"  Secret:   $SECRET_NAME\")
print(f\"  Created:  {d.get('created','?')}\")
print(f\"  Updated:  {d.get('updated','?')}\")
tags = d.get('tags', {}) or {}
print(f\"  Vars:     {tags.get('var-count','?')}\")
print(f\"  Date:     {tags.get('backup-date','?')}\")
" 2>/dev/null || echo "  (could not parse)"
}

case "${1:-help}" in
  backup)  backup ;;
  restore) restore ;;
  diff)    show_diff ;;
  status)  status ;;
  *)
    echo "Usage: $0 {backup|restore|diff|status}"
    echo ""
    echo "  backup   Save .env to Azure Key Vault"
    echo "  restore  Download .env from Key Vault"
    echo "  diff     Compare local vs vault"
    echo "  status   Show backup info"
    ;;
esac
