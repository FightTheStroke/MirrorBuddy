# ADR 0052: Vercel Deployment Configuration

## Status

Accepted

## Date

2026-01-18

## Context

MirrorBuddy needs production deployment on Vercel with proper environment configuration.
The application requires multiple external services:

- Azure OpenAI (chat, embeddings, realtime voice, TTS)
- Supabase PostgreSQL database
- Upstash Redis (rate limiting)
- Grafana Cloud (observability)
- VAPID keys (push notifications)

## Decision

### Project Setup

- **Project Name**: `mirrorbuddy` (URL: `mirrorbuddy.vercel.app`)
- **Team**: FightTheStroke Foundation (`team_nDwLfqx9JbVIs4C7Il79f4ln`)
- **Framework**: Next.js 16 with Turbopack
- **Node Version**: 24.x

### Environment Variables Required

#### Database (Supabase PostgreSQL)

```
DATABASE_URL          # Pooled connection (port 6543, pgbouncer=true)
DIRECT_URL            # Direct connection (port 5432, for migrations)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_CA_CERT      # [OPTIONAL] CA certificate for full SSL verification
```

**SSL Configuration Note**: Supabase Pooler (Supavisor) uses a CA certificate that is
NOT in Node.js's default trust store. Without `SUPABASE_CA_CERT`:

- Connection encrypts traffic but skips certificate verification
- This is the default behavior with `sslmode=require`

For **full SSL verification** (recommended for production):

1. Download CA cert from: Supabase Dashboard → Database Settings → SSL Configuration
2. Copy the entire certificate content (including BEGIN/END lines)
3. Add as `SUPABASE_CA_CERT` environment variable on Vercel

#### Azure OpenAI - Chat

```
AZURE_OPENAI_ENDPOINT           # https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY            # [SENSITIVE]
AZURE_OPENAI_CHAT_DEPLOYMENT    # e.g., gpt4o-mini-deployment
AZURE_OPENAI_EMBEDDING_DEPLOYMENT  # e.g., text-embedding-ada-002
```

#### Azure OpenAI - Realtime Voice

```
AZURE_OPENAI_REALTIME_ENDPOINT     # Same as ENDPOINT or dedicated
AZURE_OPENAI_REALTIME_API_KEY      # [SENSITIVE] Can be same as API_KEY
AZURE_OPENAI_REALTIME_DEPLOYMENT   # e.g., gpt-4o-realtime
AZURE_OPENAI_TTS_DEPLOYMENT        # e.g., tts-deployment
```

#### Authentication

```
SESSION_SECRET     # 64-char hex string for session encryption
```

#### Push Notifications (VAPID)

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY   # Public key (safe to expose)
VAPID_PRIVATE_KEY              # [SENSITIVE]
VAPID_SUBJECT                  # mailto:support@yourdomain.com
```

#### Observability (Grafana Cloud)

```
GRAFANA_CLOUD_PROMETHEUS_URL   # Prometheus push endpoint
GRAFANA_CLOUD_PROMETHEUS_USER  # User ID
GRAFANA_CLOUD_API_KEY          # [SENSITIVE]
GRAFANA_CLOUD_PUSH_INTERVAL    # Push interval in seconds (60)
```

#### Rate Limiting (Upstash Redis)

```
UPSTASH_REDIS_REST_URL    # https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN  # [SENSITIVE]
```

### Middleware (Proxy) Behavior

Next.js 16 uses `src/proxy.ts` (renamed from middleware.ts):

1. **Provider Check**: If no Azure/Ollama configured, redirects to `/landing`
2. **CSP Nonce**: Injects Content-Security-Policy headers with nonce
3. **Request Tracking**: Adds `x-request-id` for tracing
4. **Metrics**: Records latency for API routes

#### CSP connect-src Configuration

The proxy allows these connections for Azure OpenAI voice/chat:

```
https://*.openai.azure.com
wss://*.openai.azure.com
https://*.realtimeapi-preview.ai.azure.com
wss://*.realtimeapi-preview.ai.azure.com
ws://localhost:* wss://localhost:*  # Local development
http://localhost:11434              # Ollama
```

**Note**: Without `wss://*.realtimeapi-preview.ai.azure.com`, voice features
fail with "The operation is insecure" error in production.

### Public Routes (No Provider Required)

- `/landing` - LLM configuration instructions
- `/showcase/*` - Demo features
- `/api/*` - API endpoints
- `/_next/*` - Static assets

### Deployment Commands

```bash
# Add environment variable (Vercel CLI)
vercel env add VAR_NAME production --force <<< "value"

# Add sensitive variable
vercel env add VAR_NAME production --sensitive --force <<< "value"

# List current variables
vercel env ls production

# Deploy to production
vercel --prod

# Pull env vars to local .env
vercel env pull
```

### CRITICAL: Trailing `\n` in Environment Variables

**Problem**: When adding env vars via Vercel CLI, trailing newlines can corrupt values,
causing authentication failures with cryptic error messages.

**How it happens**:

```bash
# ❌ WRONG - echo adds trailing newline, stored as literal "\n" in value
echo "my-api-key" | vercel env add API_KEY production

# ❌ WRONG - heredoc may include newline
vercel env add API_KEY production <<< "my-api-key"

# ❌ WRONG - even this can add newline depending on shell
vercel env add API_KEY production < <(echo "my-api-key")
```

**Symptoms**:

| Service        | Error                                    | Actual Cause                |
| -------------- | ---------------------------------------- | --------------------------- |
| Grafana Cloud  | `401 invalid authentication credentials` | API key has `\n` suffix     |
| Azure OpenAI   | `401 Unauthorized`                       | API key has `\n` suffix     |
| Supabase       | `PGRST301 JWT expired`                   | Service key has `\n` suffix |
| Any Basic Auth | `401` even with correct credentials      | User or password corrupted  |

**Detection**:

```bash
# Pull and inspect with cat -A (shows hidden characters)
vercel env pull /tmp/check.txt --environment=production
command grep YOUR_VAR /tmp/check.txt | cat -A
rm /tmp/check.txt

# If you see: YOUR_VAR="value\n"$  <- the \n is LITERAL, not a newline
# Correct:    YOUR_VAR="value"$    <- just $ for end of line
```

**Correct patterns**:

```bash
# ✅ CORRECT - printf with %s (no trailing newline)
printf '%s' 'my-api-key' | vercel env add API_KEY production

# ✅ CORRECT - echo -n (no trailing newline)
echo -n 'my-api-key' | vercel env add API_KEY production

# ✅ CORRECT - tr to strip any newlines from variable
echo "$MY_KEY" | tr -d '\n' | vercel env add API_KEY production
```

**Fix for corrupted variables**:

```bash
# 1. Remove the corrupted variable
echo "y" | vercel env rm VAR_NAME production

# 2. Re-add with printf (guaranteed no trailing chars)
printf '%s' 'correct-value' | vercel env add VAR_NAME production

# 3. Verify it's clean
vercel env pull /tmp/check.txt --environment=production
command grep VAR_NAME /tmp/check.txt | cat -A
rm /tmp/check.txt

# 4. Redeploy
vercel --prod
```

**Historical incidents**:

| Date       | Variables Affected                                                                                                                                                      | Impact                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 2026-01-18 | All GRAFANA*CLOUD*\* vars                                                                                                                                               | Metrics push 401 for 2 hours                                        |
| 2026-01-18 | CRON_SECRET                                                                                                                                                             | Build failed "whitespace"                                           |
| 2026-01-21 | 18 vars with `\n`: All Azure, Google, Redis, VAPID, Resend, NEXTAUTH_URL. Empty: SESSION_SECRET, DATABASE_URL, DIRECT_URL, AZURE_OPENAI_API_KEY, AZURE_REALTIME_API_KEY | Redis rate limit fallback to memory, potential auth failures in app |

**Prevention**:

- Always use `printf '%s'` when piping to `vercel env add`
- Use `scripts/fix-vercel-env-vars.sh` to bulk-fix corrupted variables
- Use `scripts/verify-vercel-env.sh` to verify all variables are clean

**Bulk fix script** (`scripts/fix-vercel-env-vars.sh`):

```bash
# Fix all variables with trailing \n
./scripts/fix-vercel-env-vars.sh

# Dry-run to preview changes
./scripts/fix-vercel-env-vars.sh --dry-run

# Fix specific variable
./scripts/fix-vercel-env-vars.sh --var SESSION_SECRET

# Verify all variables are clean
./scripts/verify-vercel-env.sh
```

**Code-level defense** - All Redis client initialization now uses `.trim()`:

```typescript
// src/lib/rate-limit.ts, redis-sse-store.ts, budget-cap.ts
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!.trim(),
  token: process.env.UPSTASH_REDIS_REST_TOKEN!.trim(),
});
```

This prevents whitespace issues even if env vars are corrupted on Vercel.

### Database Migrations (CRITICAL)

**NEVER use `prisma db push` on production or CI databases.**

| Command                 | Use Case                                   | Tracking                              |
| ----------------------- | ------------------------------------------ | ------------------------------------- |
| `prisma migrate dev`    | Local development, creates migration files | ✅ Creates `_prisma_migrations` table |
| `prisma migrate deploy` | CI/Production deployment                   | ✅ Reads `_prisma_migrations` table   |
| `prisma db push`        | Schema prototyping only                    | ❌ NO migration tracking              |

**What happens if you use `db push`**:

1. Schema is applied correctly
2. BUT `_prisma_migrations` table is NOT created
3. Future `migrate deploy` fails with "migrations not applied"
4. Drift between migration files and actual schema

**Migration file requirements**:

- Folder name: `YYYYMMDDHHMMSS_description` (e.g., `20260120120000_add_users`)
- SQL file: `migration.sql` (not `001_something.sql`)
- Both are enforced by CI

**CI Pipeline** (`.github/workflows/ci.yml`):

1. `migrations` job validates naming convention and file structure
2. E2E tests use `prisma migrate deploy` (not `db push`)

**Recovery if `db push` was used**:

```bash
# Baseline existing schema (marks all migrations as applied)
npx prisma migrate resolve --applied 20260110181126_init
npx prisma migrate resolve --applied 20260115095200_feature_name
# ... repeat for all migration folders
```

**Prevention**:

- `scripts/pre-push-vercel.sh` checks migration naming (Phase 0)
- CI `migrations` job blocks invalid migration structure
- Always use `migrate deploy` in Vercel build command

### Supabase Integration

Vercel automatically adds these when Supabase integration is enabled:

- `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_DATABASE`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`

**Note**: The app uses `DATABASE_URL` and `DIRECT_URL`, so these must be set
manually pointing to the Supabase pooler/direct URLs.

### Cost Optimization: Preview Builds

**Problem**: Every PR push triggers a Vercel preview build, incurring costs even before
CI passes. This can add up significantly on active projects.

**Solution 1: ignoreCommand in vercel.json**

```json
{
  "ignoreCommand": "[ \"$VERCEL_GIT_COMMIT_REF\" != \"main\" ]"
}
```

This configuration:

- Returns exit 0 (skip build) when branch is NOT main
- Returns exit 1 (build) when branch IS main
- Prevents all preview builds on feature branches

**Logic explanation**:

- `$VERCEL_GIT_COMMIT_REF` = current branch name
- When branch != "main": test succeeds (exit 0) → SKIP build
- When branch == "main": test fails (exit 1) → BUILD

**Alternative: More granular control**

```json
{
  "ignoreCommand": "git diff --quiet HEAD^ HEAD -- . ':!.github' || [ \"$VERCEL_GIT_COMMIT_REF\" != \"main\" ]"
}
```

This skips builds if:

- No code changes (only .github changes), OR
- Branch is not main

**Solution 2: Dashboard Configuration**

In Vercel Dashboard → Project Settings → Git:

1. **Production Branch**: `main` (only auto-deploy main)
2. **Auto-Deploy**: Enabled only for Production
3. **Preview Deployments**: Can be disabled entirely

**Verification**:

```bash
# Check current ignoreCommand
cat vercel.json | jq '.ignoreCommand'

# Test locally what would happen
VERCEL_GIT_COMMIT_REF="feature/test" && [ "$VERCEL_GIT_COMMIT_REF" != "main" ] && echo "SKIP" || echo "BUILD"
VERCEL_GIT_COMMIT_REF="main" && [ "$VERCEL_GIT_COMMIT_REF" != "main" ] && echo "SKIP" || echo "BUILD"
```

**Trade-offs**:

- ✅ Saves costs on PR preview builds
- ✅ Main branch still deploys automatically
- ⚠️ No preview URLs for PR reviewers (must test locally)
- ⚠️ Issues may only surface after merge to main

**When to allow preview builds**:

- Final review before merge (remove ignoreCommand temporarily)
- Urgent hotfixes that need visual verification
- Demo branches for stakeholders

## Consequences

### Positive

- All services configured as encrypted secrets
- Automatic deployments on git push to main
- Environment separation (production, preview, development)
- Integrated with Supabase for database

### Negative

- Environment variables must be synced between local and Vercel
- Sensitive keys visible in Vercel dashboard to team members

### Neutral

- Proxy redirects to `/landing` if Azure not configured (intended behavior)
- `NEXT_PUBLIC_*` variables are bundled into client code

## Related

- **ADR 0053**: Vercel Runtime Constraints (CSRF, Voice Transport, Health Checks)
- ADR 0028: PostgreSQL + pgvector migration
- ADR 0038: WebRTC migration for voice
- ADR 0047: Grafana Cloud observability
- ADR 0039: Deferred production items
