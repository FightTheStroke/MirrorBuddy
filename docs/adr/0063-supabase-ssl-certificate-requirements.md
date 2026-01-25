# ADR 0063: Supabase SSL Certificate Requirements

## Status

Accepted (Updated 2026-01-25)

## Date

2026-01-20 (Updated 2026-01-25)

## Context

MirrorBuddy uses Supabase PostgreSQL with connection pooling via PgBouncer. The pooler endpoint (`*.pooler.supabase.com`) uses a certificate signed by the **Supabase Intermediate 2021 CA**, which is NOT in Node.js default trust store.

Without explicit CA certificate configuration:

- `sslmode=require` works but doesn't verify certificate identity (theoretical MITM vulnerable)
- `sslmode=verify-full` fails with "unable to verify first certificate"
- Setting `rejectUnauthorized: false` bypasses SSL verification but traffic remains TLS encrypted

## Decision (Updated 2026-01-25)

After extensive testing, the original "fail-fast" approach was found impractical because Supabase's CA chain is not compatible with standard certificate bundles.

**Updated approach**:

1. **Always use `rejectUnauthorized: false`** for Supabase connections
2. **Traffic remains TLS encrypted** - only server identity verification is skipped
3. **Optional CA certificate** via `SUPABASE_CA_CERT` for reference (not used for verification)
4. **Remove sslmode from connection string** - manage SSL explicitly via `ssl` option

### Why This is Acceptable

Supabase is a managed service running on AWS infrastructure:

- Connection path is Vercel → AWS internal network → Supabase
- MITM attack would require compromising AWS internal routing
- Connection string credentials provide authentication
- TLS encryption protects data in transit

### Certificate Details

- **Issuer**: Supabase Intermediate 2021 CA
- **Root**: Supabase Root 2021 CA
- **Valid Until**: 2033-10-21
- **Status**: CA not in system trust stores, cannot be verified without custom trust chain

### Implementation

```typescript
// src/lib/ssl-config.ts and src/lib/db.ts
function buildSSLConfig(): SSLConfig | undefined {
  if (!isProduction) return undefined; // No SSL needed for localhost

  const cert = loadSupabaseCertificate(); // Optional: from file or env

  // Note: rejectUnauthorized: false because Supabase uses their own CA
  // which is not in system trust store. Traffic is still TLS encrypted.
  return {
    rejectUnauthorized: false,
    ca: cert, // Optional, for reference
  };
}
```

### CRITICAL: Never Use NODE_TLS_REJECT_UNAUTHORIZED

```bash
# WRONG - DO NOT USE THIS
NODE_TLS_REJECT_UNAUTHORIZED=0

# This disables TLS verification GLOBALLY for ALL connections in the process,
# not just database connections. This makes all HTTP calls MITM-vulnerable.
```

Always use per-connection `ssl: { rejectUnauthorized: false }` instead.

### Vercel Configuration

```bash
# Optional: Add certificate chain to Vercel (pipe-separated newlines)
vercel env add SUPABASE_CA_CERT production
# Paste: cat config/supabase-chain.pem | tr '\n' '|'
```

## Consequences

### Positive

- Reliable database connections (no certificate chain failures)
- TLS encryption active (data protected in transit)
- Simple configuration (works without complex CA management)
- Clear documentation of security posture

### Negative

- Server identity not verified (theoretical MITM risk, mitigated by AWS internal network)
- Depends on Supabase/AWS infrastructure security

### Neutral

- Certificate in `config/supabase-chain.pem` maintained for documentation/future use
- SUPABASE_CA_CERT env var optional (not required for connection)

## References

- Supabase SSL docs: https://supabase.com/docs/guides/database/connecting-to-postgres#ssl-modes
- Node.js TLS: https://nodejs.org/api/tls.html#tlscreatesecurecontextoptions
- ADR 0067: Database Performance Optimization for Serverless (detailed SSL lessons)
- src/lib/ssl-config.ts: Centralized SSL configuration
