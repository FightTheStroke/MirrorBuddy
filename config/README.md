# Config Directory

## supabase-chain.pem

**This is a PUBLIC CA certificate, NOT a secret.**

This file contains the Supabase certificate chain (Intermediate + Root CA) used to verify TLS connections to the database. It is intentionally committed to the repository because:

1. **CA certificates are public** - They are distributed openly to verify server identity
2. **Not a private key** - Private keys are secrets; CA certs are not
3. **Required for SSL verification** - Without it, we'd need `rejectUnauthorized: false`
4. **Deployment consistency** - Ensures all environments use the same trusted CA

### How it's used

`src/lib/db.ts` loads this certificate at runtime:

```typescript
const certPath = path.join(process.cwd(), "config", "supabase-chain.pem");
const cert = fs.readFileSync(certPath, "utf-8");
// Used in pg Pool SSL config
```

### Fallback

If the file is missing, `db.ts` falls back to `SUPABASE_CA_CERT` environment variable.

### Updating the certificate

If Supabase rotates their CA (rare), update this file:

```bash
npm run extract-cert
```

See ADR 0067 for full SSL architecture details.
