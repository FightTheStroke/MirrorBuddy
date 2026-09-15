#!/bin/bash
# Comprehensive Sentry Configuration Verification
# Checks: Vercel env vars, DSN validity, tunnel route, config files

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
source "$ROOT_DIR/scripts/lib/vercel-link.sh"
STATIC_ONLY=false
if [[ $# -gt 1 || ( "${1:-}" != "" && "${1:-}" != "--static-only" ) ]]; then
	echo "Usage: verify-sentry-config.sh [--static-only]" >&2
	exit 1
fi
[[ "${1:-}" != "--static-only" ]] || STATIC_ONLY=true

WEB_DIR="apps/web"
PROXY_FILE="${WEB_DIR}/src/proxy.ts"
TUNNEL_ROUTE="${WEB_DIR}/src/app/monitoring/route.ts"
SENTRY_CONFIG_FILES=(
	"${WEB_DIR}/sentry.client.config.ts"
	"${WEB_DIR}/sentry.server.config.ts"
	"${WEB_DIR}/sentry.edge.config.ts"
)

echo "🔍 Sentry Configuration Verification"
echo "===================================="
echo ""

FAILED=0

# Values remain inside the deployment runtime; local checks inspect names only.
echo "1️⃣  Checking Vercel Production Environment Variables..."
if $STATIC_ONLY; then
	echo "Static-only mode: production names are NOT checked by this invocation."
elif ! command -v vercel &>/dev/null; then
	echo "❌ Vercel CLI missing: required remote metadata check cannot run"
	FAILED=$((FAILED + 1))
else
	if ! VERCEL_CWD=$(resolve_vercel_cwd "$ROOT_DIR") ||
	   ! pnpm exec tsx scripts/check-production-env.ts sentry-metadata "$VERCEL_CWD"; then
		FAILED=$((FAILED + 1))
	fi
fi

echo ""

# 2. Check configuration files
echo "2️⃣  Checking Sentry Configuration Files..."
for file in "${SENTRY_CONFIG_FILES[@]}"; do
	if [ -f "$file" ]; then
		# Deployment gate: direct VERCEL env check OR isEnabled() from shared module
		if grep -q "process\.env\.VERCEL\|NEXT_PUBLIC_VERCEL_ENV\|isEnabled(" "$file"; then
			echo "✅ $file: Uses Vercel deployment gate"
		else
			echo "❌ $file: Missing Vercel deployment gate"
			FAILED=$((FAILED + 1))
		fi

		# enabled flag: isVercel direct OR isEnabled() from @/lib/sentry/env
		if grep -q "enabled.*isVercel\|isEnabled(" "$file"; then
			echo "   ✅ enabled flag set correctly"
		else
			echo "   ❌ enabled flag not set correctly"
			FAILED=$((FAILED + 1))
		fi

		# beforeSend: should NOT return null (Plan 141 removed triple-blocking)
		if grep -q "beforeSend" "$file" && ! grep -q "return null.*Drop" "$file"; then
			echo "   ✅ beforeSend callback present (runtime behavior checked separately)"
		else
			echo "   ⚠️  beforeSend may be dropping events — verify"
		fi
	else
		echo "❌ $file: NOT FOUND"
		FAILED=$((FAILED + 1))
	fi
done

echo ""

# 3. Check tunnel route
echo "3️⃣  Checking Sentry Tunnel Route..."
if [ -f "$TUNNEL_ROUTE" ]; then
	echo "✅ Tunnel route exists: $TUNNEL_ROUTE"
	if grep -q "getAllowedProjectId\|validate.*project" "$TUNNEL_ROUTE"; then
		echo "   ✅ Project ID validation present"
	else
		echo "   ⚠️  Project ID validation missing"
	fi
else
	echo "❌ Tunnel route NOT FOUND"
	FAILED=$((FAILED + 1))
fi

# Check if tunnel is in PUBLIC_ROUTES
if [ -f "$PROXY_FILE" ] && grep -q "/monitoring" "$PROXY_FILE"; then
	echo "✅ Tunnel route in PUBLIC_ROUTES"
else
	echo "❌ Tunnel route NOT in PUBLIC_ROUTES (will be blocked!)"
	FAILED=$((FAILED + 1))
fi

echo ""

# 4. Check CSP configuration
echo "4️⃣  Checking CSP Configuration..."
if [ -f "$PROXY_FILE" ] && grep -q "ingest.*sentry\.io" "$PROXY_FILE"; then
	echo "✅ Sentry domains in CSP"
else
	echo "❌ Sentry domains NOT in CSP"
	FAILED=$((FAILED + 1))
fi

echo ""

# 5. Check package installation
echo "5️⃣  Checking Package Installation..."
if VERSION=$(node -e '
try {
  const fromApp = require("node:module").createRequire(require("node:path").resolve("apps/web/package.json"));
  const version = fromApp("@sentry/nextjs/package.json").version;
  if (typeof version !== "string" || !/^[0-9]+\.[0-9]+\.[0-9]+/.test(version)) process.exit(1);
  console.log(version);
} catch { console.error("Application cannot resolve the installed Sentry package"); process.exit(1); }
'); then
	echo "✅ @sentry/nextjs installed: $VERSION"
else
	echo "❌ @sentry/nextjs NOT installed"
	FAILED=$((FAILED + 1))
fi

echo ""

# 6. Summary
echo "===================================="
if [ $FAILED -eq 0 ]; then
	if $STATIC_ONLY; then
		echo "✅ Static Sentry configuration passed; remote metadata excluded."
	else
		echo "✅ Static Sentry configuration and production names passed."
	fi
	echo "Runtime DSN validity and live event capture require deployment evidence."
	exit 0
else
	echo "❌ $FAILED check(s) failed!"
	echo ""
	echo "Fix the issues above before deploying."
	exit 1
fi
