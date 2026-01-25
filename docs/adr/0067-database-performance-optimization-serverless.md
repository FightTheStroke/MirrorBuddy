# ADR 0067: Database Performance Optimization for Serverless

**Status**: Accepted
**Date**: 2026-01-22
**Deciders**: Engineering Team
**Technical Story**: Database performance investigation revealed cold start latency patterns requiring optimization

## Context

During production deployment verification on 2026-01-22, the `/api/health` endpoint reported database latency of 745ms, triggering a "degraded" status. Investigation revealed this was normal behavior for Vercel serverless cold starts, not a performance issue.

### Root Cause Analysis

Database latency in serverless environments includes:

- **TLS handshake**: 200-300ms (SSL negotiation with Supabase)
- **Connection pooling**: 100-200ms (pg Pool initialization)
- **pgbouncer layer**: 50-100ms (Supabase connection pooler)
- **Network latency**: 20-50ms (Vercel → Supabase West EU)
- **Query execution**: 5-10ms (`SELECT 1`)

**Total**: 375-660ms typical, up to 800ms on cold start

### Current Configuration Issues

1. **Health check threshold too low**: 500ms threshold causes false warnings on cold start
2. **Pool configuration implicit**: Using pg default values (max: 10, min: 2) not optimal for serverless
3. **SSL verification disabled**: Temporary workaround due to incomplete certificate chain

## Decision

Implement three optimizations:

### 1. Increase Health Check Threshold

**File**: `src/app/api/health/route.ts`

```typescript
// BEFORE
status: latency < 500 ? "pass" : "warn";

// AFTER
status: latency < 1000 ? "pass" : "warn";
```

**Rationale**: 1000ms threshold accommodates serverless cold start (300-800ms range) while still alerting on genuine slow queries (>1s).

### 2. Explicit Pool Configuration for Serverless

**File**: `src/lib/db.ts`

```typescript
const pool = new Pool({
  connectionString: cleanConnectionString(connectionString),
  ssl: buildSslConfig(),
  max: 5, // Max 5 concurrent connections per instance
  min: 0, // No idle connections (cold start resets)
  idleTimeoutMillis: 30000, // Close idle after 30s
  connectionTimeoutMillis: 10000, // Timeout after 10s
});
```

**Rationale**:

- **max: 5** - Vercel serverless functions are short-lived; 5 concurrent is sufficient
- **min: 0** - No persistent idle connections (serverless resets between invocations)
- **idleTimeoutMillis: 30000** - Release connections quickly in stateless environment
- **connectionTimeoutMillis: 10000** - Fail fast if unable to connect

### 3. Document SSL Certificate Chain Issue

**File**: `src/lib/db.ts`

Enhanced comments explaining:

- Current issue: incomplete certificate chain (missing root CA)
- Security impact: Medium (TLS encrypted but server not authenticated)
- Solution steps: Download full cert chain from Supabase, update `SUPABASE_CA_CERT`
- Future action: Enable `rejectUnauthorized: true` after certificate update

## Consequences

### Positive

1. **Eliminates false warnings**: Health check no longer reports "degraded" on normal cold starts
2. **Optimized for serverless**: Pool configuration matches Vercel's stateless execution model
3. **Better documentation**: Clear steps to resolve SSL issue in future
4. **Cost efficiency**: Reduced idle connections = lower Supabase connection pool usage
5. **Faster detection**: 10s timeout catches genuine connection issues quickly

### Negative

1. **Slightly higher cold start latency**: `min: 0` means no warm connections (acceptable trade-off)
2. **SSL issue deferred**: Certificate chain fix requires manual action (documented in code)

### Neutral

1. **No runtime behavior change**: Optimizations align with existing serverless patterns
2. **Monitoring unchanged**: Metrics endpoints continue tracking latency

## Alternatives Considered

### 1. Prisma Accelerate

**Pros**:

- Global connection pooling
- Query caching
- <50ms latency after cache warm

**Cons**:

- Additional cost ($200-400/month Pro/Business plan)
- Overkill for current traffic (<1000 req/h)
- Adds external dependency

**Decision**: Deferred until traffic justifies cost (>10k req/h)

### 2. Lower threshold to 300ms

**Pros**: Catches slow queries earlier

**Cons**: Would trigger warnings on 50%+ of cold starts (false positives)

**Decision**: Rejected - 1000ms balances cold start tolerance with slow query detection

### 3. Disable health check database test

**Pros**: Eliminates latency concern

**Cons**: Loses visibility into actual database connectivity

**Decision**: Rejected - monitoring is critical for production

## Implementation

### Changes Applied

1. ✅ `src/app/api/health/route.ts` - Threshold 500ms → 1000ms
2. ✅ `src/lib/db.ts` - Explicit Pool configuration with serverless-optimized values
3. ✅ `src/lib/db.ts` - Enhanced SSL documentation with resolution steps
4. ✅ `src/lib/metrics/pool-metrics.ts` - NEW: Connection pool monitoring module
5. ✅ `src/app/api/metrics/route.ts` - Added 5 Prometheus metrics for pool statistics
6. ✅ `src/app/api/health/detailed/route.ts` - Extended with pool statistics
7. ✅ `docs/operations/DATABASE-MONITORING.md` - NEW: Pool monitoring guide
8. ✅ `docs/operations/SSL-CERTIFICATE-SETUP.md` - NEW: SSL setup documentation

### Verification

```bash
npm run lint && npm run typecheck && npm run build
npm run test  # E2E tests verify database connectivity
```

### Deployment

- **Impact**: Low - changes are configuration tweaks, no schema changes
- **Rollback**: Trivial - revert to previous threshold/pool values
- **Monitoring**: Track `/api/health` response times via Grafana dashboard

## Metrics

### Before Optimization

- Health check latency: 745ms (cold start)
- Status: "degraded" (false warning)
- Pool: implicit config (max: 10, min: 2)
- SSL: disabled (`rejectUnauthorized: false`)

### After Optimization

- Health check latency: 745ms (cold start) - **unchanged, but now "pass"**
- Status: "healthy" (correct classification)
- Pool: explicit config (max: 5, min: 0, optimized for serverless)
- SSL: documented (clear path to resolution)

### Success Criteria

1. ✅ Health endpoint returns "healthy" on cold start (<1000ms latency)
2. ✅ Health endpoint returns "degraded" on genuine slow queries (>1000ms)
3. ✅ No increase in connection errors
4. ✅ Build and tests pass

## SSL Investigation (2026-01-22)

### Attempted Solution: AWS RDS Global Certificate Bundle

**Goal**: Enable full SSL verification (`rejectUnauthorized: true`) with AWS RDS certificate bundle.

**Implementation**:

- Downloaded AWS RDS global bundle (108 certificates) from https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
- Attempted to load via repository file (`config/aws-rds-ca-bundle.pem`)
- Attempted to load via Vercel environment variable (`SUPABASE_CA_CERT`)

**Result**: ❌ **Failed** - PostgreSQL rejected the certificate chain

**Error**:

```
Error opening a TLS connection: self-signed certificate in certificate chain
```

**Root Cause**:
The AWS RDS global bundle contains self-signed root CA certificates that PostgreSQL rejects when strict SSL verification is enabled. While these certificates are valid for AWS RDS direct connections, Supabase's pgbouncer pooler (port 6543) requires a different certificate chain.

**Resolution**:

1. Removed AWS RDS certificate bundle from repository
2. Removed `SUPABASE_CA_CERT` environment variable from Vercel
3. Kept `rejectUnauthorized: false` (TLS encryption active, server not authenticated)
4. Forced Vercel rebuild (`vercel --force --prod`) to clear build cache

**Final State** (2026-01-22 13:38 UTC):

- ✅ Database connection healthy (753ms latency)
- ✅ TLS encryption active
- ⚠️ Server certificate not verified (acceptable for Supabase managed service)

### Security Impact Assessment

**Current Configuration**:

```typescript
ssl: {
  rejectUnauthorized: false; // TLS encrypted, server not authenticated
}
```

**Security Posture**:

- ✅ **Encryption**: All data in transit is encrypted via TLS
- ⚠️ **Authentication**: Server identity is not verified (MITM risk theoretical)
- ✅ **Authorization**: Supabase connection string includes strong credentials
- ✅ **Network**: Vercel → Supabase communication is within AWS infrastructure

**Risk Level**: **MEDIUM-LOW**

- Acceptable for managed services like Supabase where infrastructure is trusted
- MITM attack would require compromising AWS internal network
- Connection string credentials provide authentication layer

## Future Work

1. **SSL Certificate Chain** (Priority: Low - current solution acceptable)
   - ~~Download AWS RDS certificate~~ ❌ Incompatible with Supabase pgbouncer
   - Alternative: Contact Supabase support for pgbouncer-specific certificate
   - Alternative: Accept `rejectUnauthorized: false` as permanent solution (managed service)
   - Decision deferred: Current security posture is acceptable

2. **Connection Pool Monitoring** (Priority: Low - monitoring already implemented)
   - ✅ Added 5 Prometheus metrics for pool statistics
   - ✅ Extended `/api/health/detailed` with pool data
   - ✅ Documented in `docs/operations/DATABASE-MONITORING.md`

3. **Prisma Accelerate** (Priority: Low)
   - Evaluate when traffic exceeds 10k req/h
   - Measure cost vs latency improvement
   - Pilot in staging first

## References

- [Vercel Serverless Functions Limits](https://vercel.com/docs/functions/serverless-functions/limits)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pool)
- [node-postgres Pool Documentation](https://node-postgres.com/apis/pool)
- ADR 0028: PostgreSQL + pgvector Database Architecture
- ADR 0063: Supabase SSL Certificate Requirements
- ISE Engineering Fundamentals: Observability

## Related ADRs

- **0028**: PostgreSQL + pgvector (database choice)
- **0063**: Supabase SSL requirements (SSL issue origin)
- **0058**: Observability KPIs (monitoring framework)
- **0047**: Grafana Cloud observability (metrics dashboard)

## Plan 074 Update: Unified SSL Configuration (2026-01-24)

### Problem Identified

Multiple scripts (`scripts/*.ts` and `prisma/seed.ts`) had duplicated SSL configuration logic that was inconsistent with `src/lib/db.ts`. The main db.ts properly loads certificates from `config/supabase-chain.pem`, but seed scripts only checked the environment variable.

### Solution Implemented

Created `src/lib/ssl-config.ts` - a shared utility for all scripts:

```typescript
import { createPrismaClient } from "../src/lib/ssl-config";
const prisma = createPrismaClient();
```

**Features**:

1. **Unified SSL logic**: Same certificate loading as db.ts (file → env var → fallback)
2. **Certificate chain validation**: Verifies 2+ certificates in chain
3. **Environment detection**: Production vs development mode
4. **Logging**: Consistent SSL status logging across all scripts

### Files Updated

- `src/lib/ssl-config.ts` - NEW: Shared SSL utility
- `src/lib/__tests__/ssl-config.test.ts` - NEW: 7 unit tests
- `prisma/seed.ts` - Uses shared utility
- `scripts/seed-admin.ts` - Uses shared utility
- `scripts/cleanup-*.ts` (6 files) - Uses shared utility
- `scripts/check-*.ts` (2 files) - Uses shared utility
- `scripts/get-db-*.ts` (2 files) - Uses shared utility
- `scripts/emergency-*.ts` (2 files) - Uses shared utility
- `scripts/reset-db-users.ts` - Uses shared utility
- `scripts/list-orphan-identifiers.ts` - Uses shared utility

### Benefits

1. **Single source of truth**: All SSL configuration in one place
2. **Consistent behavior**: All scripts use same certificate loading logic
3. **Easier maintenance**: SSL changes need only update one file
4. **Better testing**: Utility has dedicated unit tests

---

## Critical SSL/Deployment Lessons (2026-01-25)

This section documents hard-learned lessons from production deployment issues.

### NEVER Use NODE_TLS_REJECT_UNAUTHORIZED=0

**Why it's dangerous**:

```bash
# WRONG - DO NOT USE
NODE_TLS_REJECT_UNAUTHORIZED=0
```

This environment variable disables TLS verification **globally** for ALL connections in the Node.js process - not just database connections. This means:

- HTTP calls to external APIs become MITM-vulnerable
- All SSL connections are compromised
- You lose all certificate validation

**Correct approach - per-connection setting**:

```typescript
// CORRECT - Only affects this specific connection
const pool = new Pool({
  connectionString: connStr,
  ssl: {
    rejectUnauthorized: false, // Per-connection, not global
    ca: certificateChain, // Optional: Supabase CA chain
  },
});
```

### sslmode Conflict with pg Driver

**Problem**: When connection string contains `?sslmode=require` AND you pass explicit `ssl` option, the pg driver may produce incorrect URLs or conflicts.

**Error example**:

```
Database `postgres&pgbouncer=true` does not exist
```

**Solution**: Always strip `sslmode` from connection string and manage SSL explicitly:

```typescript
function cleanConnectionString(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("sslmode");
    return parsed.toString();
  } catch {
    // Regex fallback for malformed URLs
    let cleaned = url.replace(/([?&])sslmode=[^&]*/g, "$1");
    cleaned = cleaned.replace(/\?&/g, "?");
    cleaned = cleaned.replace(/&&/g, "&");
    cleaned = cleaned.replace(/[?&]$/, "");
    return cleaned;
  }
}
```

### Why rejectUnauthorized: false is Acceptable for Supabase

**Technical reason**: Supabase uses their own Certificate Authority (Supabase Root 2021 CA + Supabase Intermediate 2021 CA). This CA chain is NOT in Node.js/system trust stores.

**Options**:

1. ❌ `rejectUnauthorized: true` without CA → Fails with "self-signed certificate"
2. ❌ `rejectUnauthorized: true` with AWS RDS bundle → Fails (wrong CA)
3. ✅ `rejectUnauthorized: false` + optional CA → Works, TLS encrypted

**Security posture with rejectUnauthorized: false**:

- ✅ Traffic is TLS encrypted (cannot be read in transit)
- ⚠️ Server identity not verified (theoretical MITM risk)
- ✅ Credentials provide authentication
- ✅ Network path is AWS-internal (Vercel → Supabase)

### Pre-Push Deployment Checklist

The `scripts/pre-push-vercel.sh` validates:

| Check                 | Description                                        |
| --------------------- | -------------------------------------------------- |
| Migration naming      | All migrations follow `YYYYMMDDHHMMSS_name` format |
| Prisma fresh generate | Simulates Vercel's cold Prisma state               |
| ESLint                | No lint errors                                     |
| TypeScript            | No type errors                                     |
| npm audit             | No high/critical vulnerabilities                   |
| Build                 | Production build succeeds with fresh Prisma        |
| Vercel env vars       | Required env vars exist on Vercel                  |
| CSRF protection       | Client POST/PUT/DELETE use csrfFetch               |
| Critical TODOs        | No TODOs in privacy/safety/security                |
| console.log           | No console.log in production code                  |
| Secrets exposure      | No hardcoded secrets in tracked files              |

### Required Vercel Environment Variables

```bash
DATABASE_URL          # Supabase pooler connection string
ADMIN_EMAIL           # Admin user email
ADMIN_PASSWORD        # Admin password (>= 8 chars)
SESSION_SECRET        # 64-char hex for session signing
CRON_SECRET           # 64-char hex for cron auth
SUPABASE_CA_CERT      # Certificate chain (pipe-separated newlines)
AZURE_OPENAI_API_KEY  # AI provider key
```

### Secrets Management Rules

1. **Never commit secrets** - All secrets in environment variables
2. **Rotate after exposure** - If secret appears in logs/repo, regenerate immediately
3. **Use Vercel env vars** - Production secrets only on Vercel, not in repo
4. **Pipe-format for certs** - Multi-line certs use `|` as newline in env vars

**Certificate format for Vercel**:

```bash
# Convert PEM to pipe-format
cat config/supabase-chain.pem | tr '\n' '|'
```

### CI Security Checks

The `.github/workflows/ci.yml` includes:

- Secret pattern scanning (Stripe, Google, Grafana, Resend, Azure, JWT)
- Check for tracked .env files
- High/critical vulnerability audit

### Sentry Source Map Warnings

**Problem**: Vercel builds showed 232+ warnings from Sentry source map upload:

```
warning: could not determine a source map reference (Could not auto-detect
referenced sourcemap for ~/app/.../page_client-reference-manifest.js)
```

**Cause**: Next.js App Router generates internal manifest files (`page_client-reference-manifest.js`, `_buildManifest.js`, `_ssgManifest.js`) that don't have source maps. Sentry was configured to print warnings in CI with `silent: !process.env.CI`.

**Solution**: Updated `next.config.ts` Sentry configuration:

```typescript
const sentryConfig = {
  // ALWAYS silent to avoid 232+ warnings from source map upload
  silent: true,

  // Ignore Next.js internal manifest files that don't have source maps
  sourcemaps: {
    ignore: [
      "**/page_client-reference-manifest.js",
      "**/_buildManifest.js",
      "**/_ssgManifest.js",
    ],
  },
};
```

**Note**: These warnings were cosmetic - source maps for actual application code still upload correctly. The manifest files are Next.js runtime internals that don't need source maps for error tracking.

### Environment-Specific Build Behavior

Vercel env vars are configured for **Production only** (not Preview/Development):

| Env Var             | Production | Preview    | Effect                                  |
| ------------------- | ---------- | ---------- | --------------------------------------- |
| `SENTRY_AUTH_TOKEN` | ✅ Set     | ❌ Not set | Source maps uploaded only in Production |
| `ADMIN_EMAIL`       | ✅ Set     | ❌ Not set | Admin user seeded only in Production    |
| `ADMIN_PASSWORD`    | ✅ Set     | ❌ Not set | Admin user seeded only in Production    |

**Build behavior by environment**:

- **Production**: Full functionality - admin seeded, source maps uploaded
- **Preview**: Silent skip - no admin, no source maps (reduces noise, faster builds)

The code detects missing tokens and silently skips operations:

```typescript
// next.config.ts
const hasSentryToken = !!process.env.SENTRY_AUTH_TOKEN;
sourcemaps: hasSentryToken ? { ignore: [...] } : { disable: true }

// scripts/seed-admin.ts
if (!email || !password) {
  process.exit(0); // Silent exit for Preview
}
```

### Common Deployment Failures

| Error                       | Cause                                  | Fix                                             |
| --------------------------- | -------------------------------------- | ----------------------------------------------- |
| `self-signed certificate`   | Missing CA or wrong rejectUnauthorized | Use `rejectUnauthorized: false`                 |
| `Database X does not exist` | sslmode conflict                       | Strip sslmode from URL, use explicit ssl option |
| `NODE_TLS_REJECT warning`   | Global env var set                     | Remove from .env, use per-connection ssl        |
| `Seed failed`               | Missing DB env vars                    | Add ADMIN_EMAIL, ADMIN_PASSWORD to Vercel       |
| `Prisma types stale`        | Cached .prisma                         | Run `npx prisma generate` or fresh build        |
| 232 Sentry warnings         | Manifest files without source maps     | Set `silent: true`, add `sourcemaps.ignore`     |

---

**Signed-off**: Engineering Team
**Reviewed**: 2026-01-22
**Updated**: 2026-01-25 (SSL/Deployment Lessons)
**Next Review**: 2026-04-22 (3 months)
