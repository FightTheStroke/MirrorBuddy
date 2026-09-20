#!/bin/bash
# Sync migrations to both production and test databases
# Run this after creating new migrations or pulling changes with new migrations
#
# The test phase requires DEV_DATABASE_URL, the existing explicit local-database
# override (see prisma.config.ts). It is validated BEFORE any migration runs: a
# missing, non-postgres, non-loopback or host-overriding value stops the script
# before the production phase, rather than after it.

set -e

reject() {
	echo "❌ $1" >&2
	echo "   Set DEV_DATABASE_URL to an explicit local database before syncing." >&2
	exit 1
}

LOCAL_URL="${DEV_DATABASE_URL:-}"
if [ -z "$LOCAL_URL" ]; then
	reject "DEV_DATABASE_URL is not set, so the test database target is unknown."
fi

# A literal shell match on a `host=` key misses percent-encoded spellings such
# as %68ost, which a real URL or connection parser decodes: a loopback-looking
# URL could still redirect the second phase. So parse with an actual URL parser
# rather than by hand; Node is already a prerequisite (see SETUP.md). The value
# arrives on stdin and no failure path echoes it, so no connection string and no
# password can reach a log.
REASON=$(printf '%s' "$LOCAL_URL" | node -e '
const raw = require("node:fs").readFileSync(0, "utf8");
let url;
try {
  url = new URL(raw);
} catch {
  console.error("it is not a well-formed URL");
  process.exit(1);
}
if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
  console.error("its scheme is neither postgres: nor postgresql:");
  process.exit(1);
}
const host = url.hostname.replace(/^\[/, "").replace(/\]$/, "").toLowerCase();
if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
  console.error("it does not target a loopback host");
  process.exit(1);
}
for (const key of url.searchParams.keys()) {
  if (["host", "hostaddr", "service"].includes(key.toLowerCase())) {
    console.error("it overrides the target through a connection parameter");
    process.exit(1);
  }
}
' 2>&1) || reject "DEV_DATABASE_URL was refused because ${REASON:-the check failed}."

echo "🔄 Syncing database migrations..."
echo ""

# Apply to production database (uses DIRECT_URL, else DATABASE_URL, from .env).
# prisma.config.ts prefers DEV_DATABASE_URL over both, so the local override this
# script requires has to be masked for this phase only. Masked to an empty value
# rather than unset: dotenv never replaces a key already present, so the root
# .env cannot restore it here.
echo "📊 Applying migrations to PRODUCTION database..."
DEV_DATABASE_URL="" npx prisma migrate deploy
echo "✅ Production database updated"
echo ""

# Apply to test database (the validated local target only)
echo "🧪 Applying migrations to TEST database..."
DATABASE_URL="$LOCAL_URL" \
	DIRECT_URL="$LOCAL_URL" \
	npx prisma migrate deploy
echo "✅ Test database updated"
echo ""

echo "✨ Both databases are now in sync!"
