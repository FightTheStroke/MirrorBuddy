# ADR 0063: Supabase SSL Certificate Requirements

## Status

Accepted

## Date

2026-01-20

## Context

MirrorBuddy uses Supabase PostgreSQL with connection pooling via PgBouncer. The pooler endpoint (`*.pooler.supabase.com`) uses a certificate signed by the **Supabase Intermediate 2021 CA**, which is NOT in Node.js default trust store.

Without explicit CA certificate configuration:

- `sslmode=require` works but doesn't verify certificate identity (MITM vulnerable)
- `sslmode=verify-full` fails with "unable to verify first certificate"
- Setting `rejectUnauthorized: false` bypasses SSL verification entirely (security risk)

## Decision

1. **Production requires explicit CA certificate** via `SUPABASE_CA_CERT` environment variable
2. **Fail-fast in production** if certificate is missing (no silent fallback)
3. **Development allows fallback** to `rejectUnauthorized: false` with warning

### Certificate Details

- **Issuer**: Supabase Intermediate 2021 CA
- **Root**: Supabase Root 2021 CA
- **Valid Until**: 2033-10-21
- **How to obtain**: Extract via PostgreSQL SSL handshake or Supabase Dashboard > Database Settings > SSL

### Implementation

```typescript
// src/lib/db.ts
if (!process.env.SUPABASE_CA_CERT) {
  if (isProduction) {
    throw new Error("SUPABASE_CA_CERT required in production");
  }
  log.warn("Development mode: SSL verification disabled");
}
```

### Vercel Configuration

```bash
# Add certificate to Vercel production environment
vercel env add SUPABASE_CA_CERT production
# Paste certificate content when prompted
```

## Consequences

### Positive

- Secure SSL verification in production (no MITM)
- Clear error if misconfigured (fail-fast)
- Documented certificate requirements

### Negative

- Additional environment variable to manage
- Certificate rotation requires update (every ~10 years)

## References

- Supabase SSL docs: https://supabase.com/docs/guides/database/connecting-to-postgres#ssl-modes
- Node.js TLS: https://nodejs.org/api/tls.html#tlscreatesecurecontextoptions
