#!/bin/bash
# Comprehensive Sentry Configuration Verification
# Checks: Vercel env vars, DSN validity, tunnel route, config files

set -e

echo "🔍 Sentry Configuration Verification"
echo "===================================="
echo ""

FAILED=0

# 1. Check Vercel environment variables (non-blocking - env vars are verified at deploy time)
echo "1️⃣  Checking Vercel Production Environment Variables..."
if ! command -v vercel &>/dev/null; then
	echo "⚠️  Vercel CLI not found (install with: npm i -g vercel)"
	echo "   Skipping env var checks - will be verified at deploy time"
else
	TEMP_FILE=$(mktemp)
	if vercel env pull "$TEMP_FILE" --environment production --yes 2>/dev/null; then
		# Prefer NEXT_PUBLIC_SENTRY_DSN, fall back to SENTRY_DSN
		DSN_VAR=""
		if grep -q "^NEXT_PUBLIC_SENTRY_DSN=" "$TEMP_FILE"; then
			DSN_VAR="NEXT_PUBLIC_SENTRY_DSN"
		elif grep -q "^SENTRY_DSN=" "$TEMP_FILE"; then
			DSN_VAR="SENTRY_DSN"
		fi

		if [ -n "$DSN_VAR" ]; then
			DSN=$(grep "^${DSN_VAR}=" "$TEMP_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d '[:space:]')
			if [ -n "$DSN" ] && [[ "$DSN" =~ ^https://.*@.*\.ingest\.(us|de|eu)\.sentry\.io/[0-9]+$ ]]; then
				echo "✅ ${DSN_VAR}: Valid format"
				echo "   Project: $(echo "$DSN" | cut -d'/' -f4)"
			else
				echo "⚠️  ${DSN_VAR}: Invalid format (verify in Vercel dashboard)"
			fi
		else
			echo "⚠️  Sentry DSN: NOT SET (verify NEXT_PUBLIC_SENTRY_DSN in Vercel dashboard)"
		fi

		for var in SENTRY_AUTH_TOKEN SENTRY_ORG SENTRY_PROJECT; do
			if grep -q "^${var}=" "$TEMP_FILE"; then
				echo "✅ $var: SET"
			else
				echo "⚠️  $var: NOT SET (optional for basic error tracking)"
			fi
		done
	else
		echo "⚠️  Could not pull Vercel env vars (VERCEL_TOKEN may be missing or expired)"
		echo "   Skipping env var checks - will be verified at deploy time"
	fi
	rm -f "$TEMP_FILE"
fi

echo ""

# 2. Check configuration files
echo "2️⃣  Checking Sentry Configuration Files..."
for file in sentry.client.config.ts sentry.server.config.ts sentry.edge.config.ts; do
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
			echo "   ✅ beforeSend is enrichment-only (no event dropping)"
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
if [ -f "src/app/monitoring/route.ts" ]; then
	echo "✅ Tunnel route exists: src/app/monitoring/route.ts"
	if grep -q "getAllowedProjectId\|validate.*project" "src/app/monitoring/route.ts"; then
		echo "   ✅ Project ID validation present"
	else
		echo "   ⚠️  Project ID validation missing"
	fi
else
	echo "❌ Tunnel route NOT FOUND"
	FAILED=$((FAILED + 1))
fi

# Check if tunnel is in PUBLIC_ROUTES
if grep -q "/monitoring" "src/proxy.ts"; then
	echo "✅ Tunnel route in PUBLIC_ROUTES"
else
	echo "❌ Tunnel route NOT in PUBLIC_ROUTES (will be blocked!)"
	FAILED=$((FAILED + 1))
fi

echo ""

# 4. Check CSP configuration
echo "4️⃣  Checking CSP Configuration..."
if grep -q "ingest.*sentry\.io" "src/proxy.ts"; then
	echo "✅ Sentry domains in CSP"
else
	echo "❌ Sentry domains NOT in CSP"
	FAILED=$((FAILED + 1))
fi

echo ""

# 5. Check package installation
echo "5️⃣  Checking Package Installation..."
if npm list @sentry/nextjs &>/dev/null; then
	VERSION=$(npm list @sentry/nextjs 2>/dev/null | grep "@sentry/nextjs" | awk '{print $NF}' | tr -d '└─')
	echo "✅ @sentry/nextjs installed: $VERSION"
else
	echo "❌ @sentry/nextjs NOT installed"
	FAILED=$((FAILED + 1))
fi

echo ""

# 6. Summary
echo "===================================="
if [ $FAILED -eq 0 ]; then
	echo "✅ All checks passed!"
	echo ""
	echo "Next steps:"
	echo "1. Deploy to production: vercel --prod"
	echo "2. Check logs for: '[Sentry] Initialized for Vercel production'"
	echo "3. Test error capture by triggering a test error"
	echo "4. Verify in Sentry dashboard: https://sentry.io"
	exit 0
else
	echo "❌ $FAILED check(s) failed!"
	echo ""
	echo "Fix the issues above before deploying."
	exit 1
fi
