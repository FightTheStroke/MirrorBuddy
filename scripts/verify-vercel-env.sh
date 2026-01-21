#!/bin/bash
# Final verification of Vercel environment variables

echo "========================================="
echo "Vercel Production Variables Verification"
echo "========================================="
echo ""

# Pull latest
rm -f .env.production.local
vercel env pull --environment production .env.production.local > /dev/null 2>&1

echo "1. Critical variables (must be set):"
echo "-----------------------------------"

CRITICAL_VARS=(
  "SESSION_SECRET"
  "DATABASE_URL"
  "DIRECT_URL"
  "AZURE_OPENAI_API_KEY"
  "AZURE_OPENAI_ENDPOINT"
  "AZURE_OPENAI_REALTIME_API_KEY"
  "RESEND_API_KEY"
  "UPSTASH_REDIS_REST_URL"
  "UPSTASH_REDIS_REST_TOKEN"
)

for var in "${CRITICAL_VARS[@]}"; do
  value=$(/usr/bin/grep "^${var}=" .env.production.local | cut -d= -f2- | tr -d '"')
  if [ -z "$value" ]; then
    echo "❌ $var: EMPTY or MISSING"
  else
    echo "✅ $var: SET (${#value} chars)"
  fi
done

echo ""
echo "2. Variables with trailing \\n (excluding certificates):"
echo "--------------------------------------------------------"

bad_vars=$(/usr/bin/grep '\\n"$' .env.production.local | /usr/bin/grep -v 'SUPABASE_CA_CERT')
if [ -z "$bad_vars" ]; then
  echo "✅ No variables with trailing \\n"
else
  echo "❌ Found variables with trailing \\n:"
  echo "$bad_vars"
fi

echo ""
echo "3. Redis variables (must not contain \\n):"
echo "-----------------------------------------"

redis_url=$(/usr/bin/grep "^UPSTASH_REDIS_REST_URL=" .env.production.local | cat -A)
redis_token=$(/usr/bin/grep "^UPSTASH_REDIS_REST_TOKEN=" .env.production.local | cat -A)

if echo "$redis_url" | /usr/bin/grep -q '\\n'; then
  echo "❌ UPSTASH_REDIS_REST_URL contains \\n"
else
  echo "✅ UPSTASH_REDIS_REST_URL: clean"
fi

if echo "$redis_token" | /usr/bin/grep -q '\\n'; then
  echo "❌ UPSTASH_REDIS_REST_TOKEN contains \\n"
else
  echo "✅ UPSTASH_REDIS_REST_TOKEN: clean"
fi

echo ""
echo "========================================="
echo "Verification complete!"
echo "========================================="
