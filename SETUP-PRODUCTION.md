# MirrorBuddy Production Deployment Guide

Step-by-step guide for deploying MirrorBuddy to production on Vercel with Azure OpenAI, Supabase, Upstash, and Resend.

> Last updated: 24 Gennaio 2026, 16:00 CET

See [ADR-0052](docs/adr/0052-vercel-deployment-configuration.md) for architecture decisions.

---

## Prerequisites

Create accounts and have credentials ready:

- **Vercel** - hosting (free tier OK for preview)
- **Supabase** - PostgreSQL database with pgvector
- **Upstash** - Redis for rate limiting
- **Resend** - transactional email (free tier: 100/day)
- **Azure OpenAI** - chat, embeddings, realtime voice (paid)
- **Azure Cost Management** (optional) - cost tracking
- **Grafana Cloud** (optional) - metrics observability
- **Sentry** (optional) - error tracking and performance monitoring

---

## Step 1: Supabase Database

1. **Create Project**
   - Visit [supabase.com](https://supabase.com) → New Project
   - Region: EU or closest to your users
   - Database password: save securely

2. **Get Connection Strings**
   - Project Settings → Database → Connection Strings
   - Copy both:
     - `DATABASE_URL` (pooler, port 6543, with `pgbouncer=true`)
     - `DIRECT_URL` (direct, port 5432, for migrations)
   - These will be set in Vercel

3. **SSL Configuration (Required for Production)** - See [ADR 0063](docs/adr/0063-supabase-ssl-certificate-requirements.md)
   - Settings → Database → SSL Configuration
   - Download CA certificate (PEM format)
   - Save for Vercel environment as `SUPABASE_CA_CERT`
   - **IMPORTANT**: Production will fail-fast if this is missing

4. **Enable pgvector**

   ```sql
   -- Run in Supabase SQL Editor
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

5. **Get Auth Keys**
   - Settings → API → Copy `anon` key and `service_role` key
   - Save for later

---

## Step 2: Upstash Redis

1. **Create Database**
   - Visit [upstash.com](https://upstash.com) → Redis → Create Database
   - Region: same as Supabase if possible
   - Eviction policy: `noeviction`

2. **Get REST Credentials**
   - Copy REST URL and REST Token
   - Save as `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

---

## Step 3: Resend Email

1. **Create Account**
   - Visit [resend.com](https://resend.com) → Sign up
   - Free: 100 emails/day (sufficient for MVP)

2. **Generate API Key**
   - Dashboard → API Keys → Create new
   - Save as `RESEND_API_KEY`

3. **Verify Domain** (optional, for custom sender)
   - Settings → Domains → Add Domain
   - Follow DNS verification steps

---

## Step 4: Azure OpenAI

1. **Create Resource**
   - [Azure Portal](https://portal.azure.com) → Create Resource → Azure OpenAI
   - Region: same as Supabase if available
   - Tier: Standard (S0)

2. **Deploy Models**

   ```bash
   az cognitiveservices account deployment create \
     --name {resource-name} --resource-group {rg-name} \
     --deployment-name gpt-4o-mini --model-name gpt-4o-mini --model-version 2024-07-18 \
     --sku-name Standard --sku-capacity 10

   az cognitiveservices account deployment create \
     --name {resource-name} --resource-group {rg-name} \
     --deployment-name gpt-realtime --model-name gpt-realtime --model-version 2025-08-28 \
     --sku-name GlobalStandard --sku-capacity 1

   az cognitiveservices account deployment create \
     --name {resource-name} --resource-group {rg-name} \
     --deployment-name text-embedding-ada-002 --model-name text-embedding-ada-002 --model-version 2 \
     --sku-name Standard --sku-capacity 10
   ```

3. **Get Credentials**
   - Resource → Keys and Endpoint
   - Copy `Key 1` and `Endpoint`
   - Save as `AZURE_OPENAI_API_KEY` and `AZURE_OPENAI_ENDPOINT`

4. **Deployment Names**
   - Set environment variables:
     - `AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o-mini`
     - `AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-realtime`
     - `AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002`

---

## Step 5: Vercel Deployment

1. **Connect Repository**
   - [vercel.com](https://vercel.com) → New Project
   - Import GitHub repository
   - Project name: `mirrorbuddy`
   - Framework: Next.js
   - Node version: 24.x (auto-detected)

2. **Add Environment Variables**

   Use Vercel CLI or Dashboard → Settings → Environment Variables:

   ```bash
   # Database
   vercel env add DATABASE_URL production --sensitive <<< "postgres://..."
   vercel env add DIRECT_URL production --sensitive <<< "postgres://..."
   vercel env add SUPABASE_CA_CERT production --sensitive <<< "-----BEGIN CERTIFICATE-----..."

   # Supabase
   vercel env add NEXT_PUBLIC_SUPABASE_URL production <<< "https://..."
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --sensitive <<< "eyJ..."
   vercel env add SUPABASE_SERVICE_ROLE_KEY production --sensitive <<< "eyJ..."

   # Azure OpenAI
   vercel env add AZURE_OPENAI_ENDPOINT production --sensitive <<< "https://..."
   vercel env add AZURE_OPENAI_API_KEY production --sensitive <<< "your-api-key"
   vercel env add AZURE_OPENAI_CHAT_DEPLOYMENT production <<< "gpt-4o-mini"
   vercel env add AZURE_OPENAI_REALTIME_DEPLOYMENT production <<< "gpt-realtime"
   vercel env add AZURE_OPENAI_EMBEDDING_DEPLOYMENT production <<< "text-embedding-ada-002"

   # Upstash
   vercel env add UPSTASH_REDIS_REST_URL production --sensitive <<< "https://..."
   vercel env add UPSTASH_REDIS_REST_TOKEN production --sensitive <<< "..."

   # Resend
   vercel env add RESEND_API_KEY production --sensitive <<< "re_..."

   # Sentry (optional - error tracking)
   vercel env add SENTRY_DSN production --sensitive <<< "https://...@sentry.io/..."
   vercel env add SENTRY_AUTH_TOKEN production --sensitive <<< "sntrys_..."
   vercel env add SENTRY_ORG production <<< "your-org"
   vercel env add SENTRY_PROJECT production <<< "mirrorbuddy"

   # Security
   vercel env add SESSION_SECRET production --sensitive <<< "$(openssl rand -hex 32)"
   vercel env add CRON_SECRET production --sensitive <<< "$(openssl rand -hex 32)"
   vercel env add TOKEN_ENCRYPTION_KEY production --sensitive <<< "$(openssl rand -hex 32)"
   ```

   > **Breaking Change (v0.8.0)**: `TOKEN_ENCRYPTION_KEY` is required for OAuth token encryption (AES-256-GCM). See [ADR 0060](docs/adr/0060-security-audit-hardening.md).

3. **Deploy**
   ```bash
   vercel --prod
   ```

---

## Step 6: Post-Deploy Verification

1. **Health Check**

   ```bash
   curl https://mirrorbuddy.vercel.app/api/health
   # Expected: {"status":"ok","timestamp":"..."}
   ```

2. **Database Migrations**

   ```bash
   # Vercel console or via Supabase
   npx prisma migrate deploy
   ```

3. **Test Chat**
   - Visit https://mirrorbuddy.vercel.app
   - Settings → AI Provider → Diagnostics
   - Test Connection (should pass)

4. **Test Voice** (if configured)
   - Click microphone icon
   - Speak, verify response

5. **Check Logs**

   ```bash
   vercel logs --tail
   ```

6. **Verify Sentry** (if configured)
   - Visit [sentry.io](https://sentry.io) → Projects → mirrorbuddy
   - Generate test error: trigger a client-side error
   - Check Issues tab for new events

---

## Troubleshooting

**SSL Certificate Error**: Ensure `SUPABASE_CA_CERT` is set (multiline format in Vercel)

**Voice Not Working**: Verify `AZURE_OPENAI_REALTIME_DEPLOYMENT` exists and is in your region

**Email Not Sending**: Check `RESEND_API_KEY`, verify domain if using custom sender

**Rate Limiting Issues**: Verify `UPSTASH_REDIS_REST_URL` and token are correct

**Database Connection Timeout**: Check Supabase firewall, ensure pgbouncer connection pooling enabled

**Sentry Not Receiving Events**: Verify `SENTRY_DSN` is correct, check browser console for Sentry init errors

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed diagnostic steps.

---

**See also:** [SETUP.md](SETUP.md) | [FEATURES.md](FEATURES.md) | [ADR-0052](docs/adr/0052-vercel-deployment-configuration.md)
