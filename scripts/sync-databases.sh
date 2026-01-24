#!/bin/bash
# Sync migrations to both production and test databases
# Run this after creating new migrations or pulling changes with new migrations

set -e

echo "🔄 Syncing database migrations..."
echo ""

# Apply to production database (uses DATABASE_URL from .env)
echo "📊 Applying migrations to PRODUCTION database..."
npx prisma migrate deploy
echo "✅ Production database updated"
echo ""

# Apply to test database
echo "🧪 Applying migrations to TEST database..."
DATABASE_URL="postgresql://roberdan@localhost:5432/mirrorbuddy_test" \
DIRECT_URL="postgresql://roberdan@localhost:5432/mirrorbuddy_test" \
npx prisma migrate deploy
echo "✅ Test database updated"
echo ""

echo "✨ Both databases are now in sync!"
