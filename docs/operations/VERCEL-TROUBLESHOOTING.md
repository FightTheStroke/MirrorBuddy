# Vercel Troubleshooting Guide

Quick reference for production issues on Vercel.

## First Response Checklist

```bash
# 1. Check function logs
vercel logs --prod --follow

# 2. Check deployment status
vercel ls --prod

# 3. Test health endpoint
curl https://mirrorbuddy.vercel.app/api/health
```

## Common Failures

### Chat API Returns 500

**Symptoms**: "Mi dispiace, ho avuto un problema" in chat

**Check Vercel logs for**:

```
Error: Cannot find module 'package-name'
MODULE_NOT_FOUND
```

**Root cause**: Package in `serverExternalPackages` not available on Vercel runtime

**Fix**:

1. Open `next.config.ts`
2. Remove the package from `serverExternalPackages`
3. Commit and push

**Example fix** (2026-01-18):

```typescript
// BEFORE - BROKEN
serverExternalPackages: ["pdf-parse"],

// AFTER - WORKING
// (removed entirely, package now bundled)
```

### Chat API Returns 403

**Symptoms**: Silent failure, "Invalid CSRF token" in response

**Check**: Network tab → Response body contains "Invalid CSRF"

**Root cause**: Client code using `fetch()` instead of `csrfFetch()`

**Fix**:

```typescript
// BEFORE - BROKEN
const response = await fetch("/api/chat", {
  method: "POST",
  body: JSON.stringify(data),
});

// AFTER - WORKING
import { csrfFetch } from "@/lib/auth/csrf-client";

const response = await csrfFetch("/api/chat", {
  method: "POST",
  body: JSON.stringify(data),
});
```

### Voice Shows "WebRTC Required" Error

**Symptoms**: "La modalità voce richiede WebRTC" popup

**Check**: Browser console for 403 on `/api/realtime/ephemeral-token`

**Root cause**: `webrtc-probe.ts` or `webrtc-connection.ts` using plain `fetch()`

**Fix**: Change to `csrfFetch()` in the probe/connection files

### Voice Shows "Operation Insecure"

**Symptoms**: Console error about insecure operation

**Check**: CSP violation in console

**Root cause**: Missing WebRTC endpoint in Content-Security-Policy

**Fix**: Add to `src/proxy.ts` connect-src:

```
wss://*.realtimeapi-preview.ai.azure.com
```

### Database Timeouts

**Symptoms**: Health endpoint shows >500ms latency, requests timeout

**Check**: `/api/health/detailed` database latency

**Root causes**:

1. Vercel function in different region than Supabase
2. Missing connection pooling
3. Cold start penalty

**Fix**:

1. Deploy Vercel in same region as Supabase (Settings → Functions → Region)
2. Ensure using pooled connection (port 6543)
3. Add `SUPABASE_CA_CERT` for SSL optimization

## Environment Variables Checklist

Required for production:

| Variable                  | Purpose         | Where to get                     |
| ------------------------- | --------------- | -------------------------------- |
| `DATABASE_URL`            | Supabase pooled | Supabase dashboard               |
| `DIRECT_URL`              | Supabase direct | Supabase dashboard               |
| `AZURE_OPENAI_ENDPOINT`   | Chat API        | Azure portal                     |
| `AZURE_OPENAI_API_KEY`    | Chat auth       | Azure portal                     |
| `AZURE_OPENAI_REALTIME_*` | Voice API       | Azure portal                     |
| `SESSION_SECRET`          | CSRF/sessions   | Generate: `openssl rand -hex 32` |
| `UPSTASH_REDIS_*`         | Rate limiting   | Upstash dashboard                |

## Vercel-Specific Constraints

### DO NOT USE

- `serverExternalPackages` for npm packages (unless Vercel pre-installs them)
- WebSocket connections (use WebRTC or external service)
- Long-running processes (max 60s timeout)
- File system writes (ephemeral filesystem)

### MUST USE

- `csrfFetch()` for all POST/PUT/DELETE to `/api/*`
- Environment variables for all secrets (never commit)
- Edge-compatible packages only in middleware/proxy

## Quick Diagnostic Commands

```bash
# Check if site is up
curl -I https://mirrorbuddy.vercel.app

# Test API health
curl https://mirrorbuddy.vercel.app/api/health | jq

# Test chat API (will fail without CSRF - expected)
curl -X POST https://mirrorbuddy.vercel.app/api/chat

# View recent deployments
vercel ls --prod

# View function logs
vercel logs --prod -n 100

# Redeploy without cache
vercel --prod --force
```

## Related Documentation

- [ADR 0052: Vercel Deployment Configuration](../adr/0052-vercel-deployment-configuration.md)
- [ADR 0053: Vercel Runtime Constraints](../adr/0053-vercel-runtime-constraints.md)
- [Runbook](./RUNBOOK.md)
