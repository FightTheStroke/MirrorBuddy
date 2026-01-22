#!/bin/bash
# ============================================================================
# SSL CERTIFICATE SETUP HELPER
# Download and configure Supabase SSL certificate chain for production
# ADR 0067: Database Performance Optimization
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=========================================="
echo "Supabase SSL Certificate Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running in correct directory
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
  echo -e "${RED}Error: Must be run from MirrorBuddy project root${NC}"
  exit 1
fi

echo "Step 1: Download Certificate Chain from Supabase"
echo "------------------------------------------------"
echo ""
echo "1. Login to Supabase Dashboard: https://supabase.com/dashboard"
echo "2. Navigate to: Project → Settings → Database"
echo "3. Scroll to 'Connection Info' section"
echo "4. Click 'SSL Configuration' tab"
echo "5. Download the FULL certificate chain (root + intermediate)"
echo ""
echo "Expected format: PEM format, concatenated certificates"
echo ""
echo -e "${YELLOW}Press ENTER when you have downloaded the certificate file...${NC}"
read -r

# Ask for certificate file path
echo ""
echo "Step 2: Locate Certificate File"
echo "--------------------------------"
echo ""
echo "Enter the path to the downloaded certificate file:"
echo "(Example: ~/Downloads/supabase-cert.pem)"
echo ""
read -r -p "Certificate file path: " CERT_FILE

# Validate file exists
if [ ! -f "$CERT_FILE" ]; then
  echo -e "${RED}Error: Certificate file not found: $CERT_FILE${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✓ Certificate file found${NC}"
echo ""

# Validate certificate format
echo "Step 3: Validate Certificate"
echo "-----------------------------"
echo ""

# Count number of certificates in file
CERT_COUNT=$(grep -c "BEGIN CERTIFICATE" "$CERT_FILE" || echo "0")

if [ "$CERT_COUNT" -lt 2 ]; then
  echo -e "${RED}Warning: Certificate file contains only $CERT_COUNT certificate(s)${NC}"
  echo "Full chain should contain at least 2 certificates (root + intermediate)"
  echo ""
  echo -e "${YELLOW}Continue anyway? (y/N)${NC}"
  read -r -p "> " CONTINUE
  if [[ ! $CONTINUE =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
  fi
else
  echo -e "${GREEN}✓ Certificate chain contains $CERT_COUNT certificate(s)${NC}"
fi

# Read certificate content and convert to single line (for .env)
CERT_CONTENT=$(cat "$CERT_FILE" | tr '\n' '|')

echo ""
echo "Step 4: Update Environment Variables"
echo "------------------------------------"
echo ""
echo "Choose update method:"
echo "  1) Update local .env file (development)"
echo "  2) Show command for Vercel (production)"
echo "  3) Both"
echo ""
read -r -p "Choice (1-3): " CHOICE

# Function to update local .env
update_local_env() {
  echo ""
  echo "Updating local .env file..."

  # Backup existing .env
  if [ -f "$PROJECT_ROOT/.env" ]; then
    cp "$PROJECT_ROOT/.env" "$PROJECT_ROOT/.env.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${GREEN}✓ Backed up existing .env${NC}"
  fi

  # Check if SUPABASE_CA_CERT already exists
  if grep -q "^SUPABASE_CA_CERT=" "$PROJECT_ROOT/.env" 2>/dev/null; then
    # Update existing
    sed -i.tmp "s|^SUPABASE_CA_CERT=.*|SUPABASE_CA_CERT=\"$CERT_CONTENT\"|" "$PROJECT_ROOT/.env"
    rm "$PROJECT_ROOT/.env.tmp"
    echo -e "${GREEN}✓ Updated SUPABASE_CA_CERT in .env${NC}"
  else
    # Add new
    echo "" >> "$PROJECT_ROOT/.env"
    echo "# Supabase SSL Certificate Chain (full: root + intermediate)" >> "$PROJECT_ROOT/.env"
    echo "SUPABASE_CA_CERT=\"$CERT_CONTENT\"" >> "$PROJECT_ROOT/.env"
    echo -e "${GREEN}✓ Added SUPABASE_CA_CERT to .env${NC}"
  fi
}

# Function to show Vercel command
show_vercel_command() {
  echo ""
  echo "To update Vercel production environment:"
  echo "----------------------------------------"
  echo ""
  echo "Run this command:"
  echo ""
  echo -e "${YELLOW}vercel env add SUPABASE_CA_CERT production${NC}"
  echo ""
  echo "When prompted, paste the certificate content:"
  echo "(The script will copy it to your clipboard if possible)"
  echo ""

  # Try to copy to clipboard (macOS)
  if command -v pbcopy &> /dev/null; then
    cat "$CERT_FILE" | pbcopy
    echo -e "${GREEN}✓ Certificate copied to clipboard${NC}"
    echo ""
  fi

  echo "Or manually set via Vercel Dashboard:"
  echo "1. Go to: https://vercel.com/fightthestroke/mirrorbuddy/settings/environment-variables"
  echo "2. Add/Edit: SUPABASE_CA_CERT"
  echo "3. Paste certificate content (with newlines preserved)"
  echo "4. Environment: Production"
  echo "5. Save"
  echo ""
}

case $CHOICE in
  1)
    update_local_env
    ;;
  2)
    show_vercel_command
    ;;
  3)
    update_local_env
    show_vercel_command
    ;;
  *)
    echo -e "${RED}Invalid choice${NC}"
    exit 1
    ;;
esac

echo ""
echo "Step 5: Enable SSL Verification"
echo "--------------------------------"
echo ""
echo "After updating environment variables, enable SSL verification:"
echo ""
echo "1. Edit: src/lib/db.ts"
echo "2. Find the buildSslConfig() function (line ~87)"
echo "3. Update production SSL config:"
echo ""
echo "   FROM:"
echo "   if (isProduction) {"
echo "     return { rejectUnauthorized: false };"
echo "   }"
echo ""
echo "   TO:"
echo "   if (isProduction) {"
echo "     if (!supabaseCaCert) {"
echo "       throw new Error('SUPABASE_CA_CERT required in production');"
echo "     }"
echo "     return {"
echo "       rejectUnauthorized: true,"
echo "       ca: supabaseCaCert.split('|').join('\\n')"
echo "     };"
echo "   }"
echo ""
echo "4. Remove 'supabaseCaCert' from unused vars (line ~78)"
echo "5. Test locally: npm run dev"
echo "6. Deploy to production"
echo ""

echo "Step 6: Verify Connection"
echo "-------------------------"
echo ""
echo "After deployment, verify SSL connection:"
echo ""
echo "  curl https://mirrorbuddy.vercel.app/api/health"
echo ""
echo "Check response:"
echo "  - status: \"healthy\" (not \"degraded\")"
echo "  - checks.database.status: \"pass\""
echo "  - checks.database.latency_ms: < 1000"
echo ""

echo ""
echo -e "${GREEN}=========================================="
echo "Setup Complete!"
echo -e "==========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Update src/lib/db.ts to enable rejectUnauthorized: true"
echo "  2. Test locally: npm run dev"
echo "  3. Deploy: git push origin main"
echo "  4. Verify: curl https://mirrorbuddy.vercel.app/api/health"
echo ""
echo "Documentation: docs/adr/0067-database-performance-optimization-serverless.md"
echo ""
