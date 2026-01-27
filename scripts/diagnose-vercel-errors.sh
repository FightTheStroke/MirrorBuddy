#!/bin/bash
# Diagnose Vercel Production Errors
# Run this script to check common production issues

set -e

echo "🔍 MirrorBuddy - Vercel Production Diagnostics"
echo "=============================================="
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
  echo "❌ Vercel CLI not found. Install with: npm i -g vercel"
  exit 1
fi

echo "1️⃣  Checking Vercel deployment status..."
vercel ls --prod 2>&1 | head -20
echo ""

echo "2️⃣  Production logs..."
echo "   To view live logs, run: vercel logs https://mirrorbuddy.vercel.app"
echo "   To view build logs, run: vercel inspect https://mirrorbuddy.vercel.app --logs"
echo ""

echo "3️⃣  Testing health endpoint..."
HEALTH_URL="https://mirrorbuddy.vercel.app/api/health"
if curl -s -f "$HEALTH_URL" > /dev/null 2>&1; then
  echo "✅ Health endpoint is responding"
  curl -s "$HEALTH_URL" | jq '.' 2>/dev/null || curl -s "$HEALTH_URL"
else
  echo "❌ Health endpoint is NOT responding"
  echo "   URL: $HEALTH_URL"
fi
echo ""

echo "4️⃣  Checking for common error patterns..."
echo "   Run: vercel logs https://mirrorbuddy.vercel.app | grep -i 'error\|failed\|exception'"
echo ""

echo "5️⃣  Common issues to check:"
echo "   - MODULE_NOT_FOUND: Check serverExternalPackages in next.config.ts"
echo "   - ERR_REQUIRE_ESM: Check for static imports of ESM modules"
echo "   - 403 CSRF errors: Check if using csrfFetch() instead of fetch()"
echo "   - CSP violations: Check proxy.ts CSP headers"
echo "   - Database SSL errors: Check SUPABASE_CA_CERT env var"
echo ""

echo "6️⃣  Next steps:"
echo "   - Review logs above for specific error messages"
echo "   - Check Vercel dashboard → Project → Deployments → Latest"
echo "   - Verify all environment variables are set in Vercel"
echo "   - Check if proxy.ts is being recognized (should see 'Proxy' in build output)"
echo ""
