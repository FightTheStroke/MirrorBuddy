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
- **Project Name**: `mirror-buddy` (URL: `mirror-buddy.vercel.app`)
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
```

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

### Supabase Integration

Vercel automatically adds these when Supabase integration is enabled:
- `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_DATABASE`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`

**Note**: The app uses `DATABASE_URL` and `DIRECT_URL`, so these must be set
manually pointing to the Supabase pooler/direct URLs.

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
- ADR 0028: PostgreSQL + pgvector migration
- ADR 0047: Grafana Cloud observability
- ADR 0039: Deferred production items
