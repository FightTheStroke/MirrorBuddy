#!/usr/bin/env bash
set -euo pipefail

# End-to-end smoke test:
# 1) Pull production Sentry credentials from Vercel
# 2) Send an envelope through the production /monitoring tunnel
# 3) Verify the issue appears in Sentry API within a short polling window

tmp_file="$(mktemp)"
vercel env pull "$tmp_file" --environment production --yes >/dev/null 2>&1

dsn="$(grep '^NEXT_PUBLIC_SENTRY_DSN=' "$tmp_file" | cut -d= -f2- | tr -d '"')"
token="$(grep '^SENTRY_AUTH_TOKEN=' "$tmp_file" | cut -d= -f2- | tr -d '"')"
org="$(grep '^SENTRY_ORG=' "$tmp_file" | cut -d= -f2- | tr -d '"')"
project="$(grep '^SENTRY_PROJECT=' "$tmp_file" | cut -d= -f2- | tr -d '"')"
rm -f "$tmp_file"

if [ -z "$dsn" ] || [ -z "$token" ] || [ -z "$org" ] || [ -z "$project" ]; then
  echo "Missing required Sentry env vars from Vercel production."
  exit 1
fi

event_id="$(node -e 'console.log(require("crypto").randomUUID().replace(/-/g, ""))')"
stamp="$(date -u +"%Y%m%dT%H%M%SZ")"
message="sentry-smoke-${stamp}-${event_id:0:8}"
sent_at="$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"

envelope=$(
  cat <<EOF
{"event_id":"$event_id","dsn":"$dsn","sent_at":"$sent_at"}
{"type":"event"}
{"event_id":"$event_id","message":"$message","level":"error","platform":"javascript","environment":"production","tags":{"smoke":"true","source":"script"}}
EOF
)

targets=(
  "https://mirrorbuddy.org/monitoring"
  "https://www.mirrorbuddy.org/monitoring"
  "https://mirrorbuddy.vercel.app/monitoring"
)

success_url=""
success_code=""
for url in "${targets[@]}"; do
  code="$(
    curl -sS -o /tmp/sentry_smoke_resp.txt -w "%{http_code}" \
      -X POST "$url" \
      -H "Content-Type: application/x-sentry-envelope" \
      --data-binary "$envelope" || true
  )"
  if [ "$code" = "200" ] || [ "$code" = "202" ]; then
    success_url="$url"
    success_code="$code"
    break
  fi
done

if [ -z "$success_url" ]; then
  echo "Failed to post envelope through production tunnel."
  printf 'Tried: %s\n' "${targets[@]}"
  exit 1
fi

encoded_query="$(node -e "console.log(encodeURIComponent(process.argv[1]))" "$message")"
seen="no"
for _ in 1 2 3 4 5 6; do
  sleep 5
  response="$(curl -sS -H "Authorization: Bearer $token" \
    "https://sentry.io/api/0/projects/$org/$project/issues/?query=$encoded_query&statsPeriod=24h&per_page=5")"
  if echo "$response" | rg -q "$message"; then
    seen="yes"
    break
  fi
done

printf 'smoke_message=%s\n' "$message"
printf 'event_id=%s\n' "$event_id"
printf 'tunnel_url=%s\n' "$success_url"
printf 'tunnel_http=%s\n' "$success_code"
printf 'seen_in_sentry=%s\n' "$seen"

if [ "$seen" != "yes" ]; then
  exit 2
fi
