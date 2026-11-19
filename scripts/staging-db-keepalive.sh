#!/usr/bin/env bash
# Keeps the staging Supabase database awake and says so when it is not.
#
# The staging project is on the Supabase free tier, which pauses a project after
# seven days without activity. On 2026-11-19 a release could not go live because
# twelve days had passed since the previous one: the staging build could not
# reach its database. One small query a few times a week counts as activity.
#
# Reads the Preview DATABASE_URL from Vercel (the same value the staging deploy
# uses), never prints it, runs `select 1`, and exits 1 when the database does
# not answer so the workflow can open an issue.
#
# Env: VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_ORG_ID (team id).
set -euo pipefail

for name in VERCEL_TOKEN VERCEL_PROJECT_ID VERCEL_ORG_ID; do
  if [ -z "${!name:-}" ]; then
    echo "::error::$name is not set — cannot reach the staging database"
    exit 2
  fi
done

api="https://api.vercel.com"
auth="Authorization: Bearer $VERCEL_TOKEN"
env_id=$(curl -fsS -H "$auth" "$api/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID" |
  jq -r '[.envs[] | select(.key == "DATABASE_URL" and (.target | index("preview")))][0].id // empty')
if [ -z "$env_id" ]; then
  echo "::error::The Preview environment has no DATABASE_URL"
  exit 2
fi

url=$(curl -fsS -H "$auth" "$api/v1/projects/$VERCEL_PROJECT_ID/env/$env_id?teamId=$VERCEL_ORG_ID" |
  jq -r '.value // empty')
if [ -z "$url" ] || [ "$url" = "[SENSITIVE]" ]; then
  echo "::error::The Preview DATABASE_URL is not readable"
  exit 2
fi
[ -n "${GITHUB_ACTIONS:-}" ] && echo "::add-mask::$url"

# psql rejects Prisma's pgbouncer flag.
url="${url//&pgbouncer=true/}"
url="${url//\?pgbouncer=true&/?}"
url="${url//\?pgbouncer=true/}"

for attempt in 1 2 3; do
  if PGCONNECT_TIMEOUT=15 PGGSSENCMODE=disable psql "$url" -tAc "select 1" >/dev/null 2>&1; then
    echo "Staging database answered (attempt $attempt)"
    exit 0
  fi
  sleep 20
done

echo "::error::Staging database did not answer after 3 attempts — it is probably paused"
exit 1
