#!/usr/bin/env bash
# Audit Vercel environment variables: every credential must be stored as
# "sensitive" (write-only), never as "encrypted" (readable back).
#
# Rationale: the Vercel April 2026 incident exposed non-sensitive environment
# variables. See docs/adr/0052-vercel-deployment-configuration.md.
#
# Usage: ./scripts/vercel-secrets-audit.sh
# Requires: VERCEL_TOKEN (or a logged-in Vercel CLI) and .vercel/project.json.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_FILE="$REPO_ROOT/.vercel/project.json"

if [ ! -f "$PROJECT_FILE" ]; then
	echo "SKIP: $PROJECT_FILE not found (run 'vercel link' first)."
	exit 0
fi

PROJECT_ID=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['projectId'])" "$PROJECT_FILE")
TEAM_ID=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1])).get('orgId',''))" "$PROJECT_FILE")

TOKEN="${VERCEL_TOKEN:-}"
if [ -z "$TOKEN" ]; then
	for candidate in \
		"$HOME/Library/Application Support/com.vercel.cli/auth.json" \
		"$HOME/.local/share/com.vercel.cli/auth.json" \
		"$HOME/.config/vercel/auth.json"; do
		if [ -f "$candidate" ]; then
			TOKEN=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1])).get('token',''))" "$candidate")
			[ -n "$TOKEN" ] && break
		fi
	done
fi

if [ -z "$TOKEN" ]; then
	echo "SKIP: no Vercel token available (set VERCEL_TOKEN or run 'vercel login')."
	exit 0
fi

RESPONSE=$(curl -sS -H "Authorization: Bearer $TOKEN" \
	"https://api.vercel.com/v9/projects/$PROJECT_ID/env?teamId=$TEAM_ID&limit=500")

TOKEN="" VERCEL_ENV_JSON="$RESPONSE" python3 <<'PY'
import json
import os
import re
import sys

data = json.loads(os.environ["VERCEL_ENV_JSON"])
if "envs" not in data:
    print(f"ERROR: unexpected Vercel API response: {str(data)[:200]}")
    sys.exit(1)

SECRET_NAME = re.compile(
    r"(SECRET|TOKEN|KEY|SALT|PASSWORD|CREDENTIAL|_DSN|DATABASE_URL"
    r"|DIRECT_URL|CA_CERT|PROTECTED_USERS|COOKIE_VALUE)"
)
# Connection strings that embed credentials but do not match the pattern above.
EXTRA_SECRETS = {
    "POSTGRES_PRISMA_URL",
    "POSTGRES_URL",
    "POSTGRES_URL_NON_POOLING",
    "KV_URL",
    "REDIS_URL",
}


def is_secret(key: str) -> bool:
    if key.startswith("NEXT_PUBLIC_"):
        return False  # inlined into the client bundle: public by definition
    return bool(SECRET_NAME.search(key)) or key in EXTRA_SECRETS


offenders = sorted(
    {
        f"{e['key']} ({', '.join(e.get('target') or [])})"
        for e in data["envs"]
        if e.get("type") == "encrypted" and is_secret(e["key"])
    }
)
sensitive = sum(1 for e in data["envs"] if e.get("type") == "sensitive")

if offenders:
    print(f"FAIL: {len(offenders)} credential(s) are readable, not sensitive:")
    for name in offenders:
        print(f"  - {name}")
    print("\nFix: PATCH {\"type\":\"sensitive\"} on the variable, or re-add it")
    print("with 'vercel env add <NAME> <env> --sensitive --force'.")
    print("See docs/adr/0052-vercel-deployment-configuration.md.")
    sys.exit(1)

print(f"OK: no credential stored in readable form ({sensitive} sensitive variables).")
PY
