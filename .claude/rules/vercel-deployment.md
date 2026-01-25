# Vercel Deployment Rules - MirrorBuddy

## Pre-Deployment Checklist (MANDATORY)

Before ANY push to main or release:

```bash
npm run pre-push   # Runs automatically on git push via hook
```

**What it validates**:
| Check | Description | Blocking |
|-------|-------------|----------|
| Migration naming | `YYYYMMDDHHMMSS_name` format | Yes |
| Prisma generate | Fresh client generation | Yes |
| ESLint | No lint errors | Yes |
| TypeScript | No type errors | Yes |
| npm audit | No high/critical vulnerabilities | Yes |
| Build | Production build passes | Yes |
| Vercel env vars | Required vars exist | Yes |
| CSRF protection | csrfFetch for mutations | Yes |
| Critical TODOs | None in safety/security | Yes |
| console.log | None in production code | Yes |
| Secrets exposure | No hardcoded secrets | Yes |

## Required Vercel Environment Variables

```bash
DATABASE_URL          # Supabase pooler connection string (with ?pgbouncer=true)
ADMIN_EMAIL           # Admin user email
ADMIN_PASSWORD        # Admin password (>= 8 characters)
SESSION_SECRET        # 64-char hex (openssl rand -hex 32)
CRON_SECRET           # 64-char hex (openssl rand -hex 32)
SUPABASE_CA_CERT      # Certificate chain (pipe-separated, see below)
AZURE_OPENAI_API_KEY  # Azure OpenAI authentication
TOKEN_ENCRYPTION_KEY  # 64-char hex for AES-256-GCM
```

### Certificate Format for SUPABASE_CA_CERT

**CRITICAL**: Use pipe `|` as newline separator, NOT base64:

```bash
# Convert PEM to pipe-format for Vercel
cat config/supabase-chain.pem | tr '\n' '|'

# Paste the output directly into Vercel env var
```

**Why pipe format**: Vercel preserves the string as-is. Our ssl-config.ts converts it back:

```typescript
envCert.split("|").join("\n");
```

## SSL Configuration (ADR 0063, 0067)

### NEVER Use NODE_TLS_REJECT_UNAUTHORIZED

```bash
# WRONG - NEVER USE THIS
NODE_TLS_REJECT_UNAUTHORIZED=0
```

This disables TLS verification **globally** for ALL connections (database, HTTP APIs, everything). Security nightmare.

### Correct Approach: Per-Connection SSL

```typescript
// CORRECT - Only affects database connection
const pool = new Pool({
  connectionString: cleanConnectionString(connStr),
  ssl: {
    rejectUnauthorized: false, // Per-connection only
    ca: certificateChain, // Optional
  },
});
```

### Why rejectUnauthorized: false is Acceptable

Supabase uses their own CA (Supabase Root 2021 CA) which is NOT in system trust stores:

- ❌ `rejectUnauthorized: true` fails with "self-signed certificate"
- ✅ `rejectUnauthorized: false` works, traffic still TLS encrypted

**Security posture**:

- ✅ Traffic encrypted (TLS)
- ⚠️ Server identity not verified (theoretical MITM, mitigated by AWS internal network)
- ✅ Credentials authenticate the connection

### sslmode Conflict

**Problem**: `?sslmode=require` in connection string conflicts with explicit `ssl` option.

**Solution**: Strip sslmode from URL (handled by `cleanConnectionString()`):

```typescript
function cleanConnectionString(url: string): string {
  const parsed = new URL(url);
  parsed.searchParams.delete("sslmode");
  return parsed.toString();
}
```

## Common Deployment Failures

| Error                       | Cause              | Fix                                     |
| --------------------------- | ------------------ | --------------------------------------- |
| `self-signed certificate`   | Wrong SSL config   | Use `rejectUnauthorized: false`         |
| `Database X does not exist` | sslmode conflict   | Strip sslmode, use explicit ssl         |
| `NODE_TLS_REJECT warning`   | Global env var set | Remove NODE_TLS_REJECT_UNAUTHORIZED     |
| `Seed failed`               | Missing env vars   | Add ADMIN_EMAIL, ADMIN_PASSWORD         |
| `Prisma types stale`        | Cached .prisma     | Delete node_modules/.prisma, regenerate |
| `CRON_SECRET mismatch`      | Whitespace in env  | Use `printf` not `echo` when setting    |

## Vercel Build Process

The `vercel-build` script in package.json:

```bash
prisma generate && npm run build && npm run seed:admin || echo 'Admin seed skipped'
```

**Order matters**:

1. `prisma generate` - Generate fresh Prisma client
2. `npm run build` - Next.js production build
3. `npm run seed:admin` - Create/update admin user (optional, can fail)

## Health Check Verification

After deployment, verify:

```bash
curl -s https://mirrorbuddy.vercel.app/api/health | jq '.'
```

**Expected response**:

```json
{
  "status": "healthy",
  "checks": {
    "database": { "status": "pass", "latency_ms": < 1000 },
    "ai_provider": { "status": "pass" },
    "memory": { "status": "pass" }
  }
}
```

**Database latency thresholds**:

- < 1000ms = pass (includes cold start)
- ≥ 1000ms = warn (investigate if persistent)

## Deployment Verification Commands

```bash
# Check Vercel env vars
vercel env ls

# List recent deployments
vercel ls mirrorbuddy

# Check production health
curl -s https://mirrorbuddy.vercel.app/api/health | jq '.'

# View deployment logs (requires deployment URL)
vercel logs <deployment-url>
```

## References

- **ADR 0063**: Supabase SSL Certificate Requirements
- **ADR 0067**: Database Performance Optimization for Serverless
- **scripts/pre-push-vercel.sh**: Pre-push validation script
- **src/lib/ssl-config.ts**: Centralized SSL configuration
- **src/lib/db.ts**: Database connection with SSL
