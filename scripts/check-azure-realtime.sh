#!/usr/bin/env bash
# INFRA-01 (#434): verify the Azure realtime voice config.
#
# Usage:
#   scripts/check-azure-realtime.sh                 # check required env vars locally
#   scripts/check-azure-realtime.sh <base-url>      # also POST the live ephemeral-token endpoint
#
# The voice session calls POST /api/realtime/ephemeral-token; a 401 there means
# the Azure realtime credentials/endpoint/region on the deploy are wrong.
set -euo pipefail

REQUIRED=(
  AZURE_OPENAI_REALTIME_API_KEY
  AZURE_OPENAI_REALTIME_ENDPOINT
  AZURE_OPENAI_REALTIME_REGION
  AZURE_OPENAI_REALTIME_DEPLOYMENT
  AZURE_OPENAI_REALTIME_API_VERSION
)
OPTIONAL=(
  AZURE_OPENAI_REALTIME_DEPLOYMENT_MINI
  AZURE_OPENAI_REALTIME_TRANSCRIPTION_DEPLOYMENT
  AZURE_OPENAI_REALTIME_TRANSLATE_DEPLOYMENT
  NEXT_PUBLIC_AZURE_REALTIME_TRANSCRIPTION_DEPLOYMENT
)

echo "== Required Azure realtime env vars =="
missing=0
for v in "${REQUIRED[@]}"; do
  if [ -n "${!v:-}" ]; then echo "  ✓ $v set"; else echo "  ✗ $v MISSING"; missing=$((missing + 1)); fi
done
echo "== Optional =="
for v in "${OPTIONAL[@]}"; do
  if [ -n "${!v:-}" ]; then echo "  ✓ $v set"; else echo "  - $v unset"; fi
done

BASE_URL="${1:-}"
if [ -n "$BASE_URL" ]; then
  echo "== Live check: POST ${BASE_URL%/}/api/realtime/ephemeral-token =="
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL%/}/api/realtime/ephemeral-token" \
    -H "Content-Type: application/json" -d '{}' --max-time 20 || echo "000")
  case "$code" in
    200) echo "  ✓ 200 — token issued, voice config OK" ;;
    401) echo "  ✗ 401 — Azure key/endpoint/region invalid (the bug). Fix the vars on the deploy." ;;
    *)   echo "  ? $code — unexpected (auth/CSRF/route): inspect server logs" ;;
  esac
fi

if [ "$missing" -gt 0 ]; then
  echo ""
  echo "== Fix: add missing vars to Vercel production environment =="
  echo "  Run each command and paste the value when prompted:"
  echo ""
  echo "  vercel env add AZURE_OPENAI_REALTIME_API_KEY production"
  echo "  vercel env add AZURE_OPENAI_REALTIME_ENDPOINT production"
  echo "  vercel env add AZURE_OPENAI_REALTIME_REGION production"
  echo "  vercel env add AZURE_OPENAI_REALTIME_DEPLOYMENT production"
  echo "  vercel env add AZURE_OPENAI_REALTIME_API_VERSION production"
  echo ""
  echo "  Then redeploy and recheck:"
  echo "  vercel redeploy --target production"
  echo "  scripts/check-azure-realtime.sh https://<your-production-url>"
  echo ""
  echo "FAIL: $missing required var(s) missing"
  exit 1
fi
echo "OK"
