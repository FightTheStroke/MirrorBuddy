# SSL Certificate Setup for Supabase

**ADR**: 0067 - Database Performance Optimization
**Date**: 2026-01-22
**Status**: ✅ Implemented

## Current Status

**SSL Verification**: ✅ Enabled (`rejectUnauthorized: true`)
**Certificate Chain**: Supabase Intermediate 2021 CA + Supabase Root 2021 CA (2 certificates)
**Location**: `config/supabase-chain.pem` (committed in repository)
**Security Impact**: Production-ready - Full server authentication enabled
**Last Updated**: 2026-01-22 - Root cause solution implemented

## Problem

Supabase uses a certificate chain that requires explicit trust:

1. **Intermediate Certificate**: Provided by Supabase
2. **Root CA**: Missing from Vercel serverless trust store

Without the full chain, SSL verification fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`.

## Solution: Supabase Certificate Chain (Repository-Based)

### Implementation

The SSL certificate chain is stored directly in the repository at `config/supabase-chain.pem`.

**Benefits**:

- No Vercel environment variable size limits (chain is 2.7KB)
- Version controlled and consistent across all environments
- Automatic deployment with no manual configuration
- Extracted directly from live Supabase connection
- Contains only required certificates (intermediate + root)

**Certificate Source**: Extracted from Supabase Connection

- Contains 2 certificates:
  1. **Supabase Intermediate 2021 CA** (signed by Supabase Root 2021 CA)
  2. **Supabase Root 2021 CA** (self-signed root CA)
- Valid until 2033
- Extracted using: `npm run extract-cert` (see `scripts/extract-supabase-cert.ts`)
- Public certificates, safe to commit to repository

### Automated Setup (Recommended)

The certificate chain is already included in the repository at `config/supabase-chain.pem`. No manual setup is required.

**To verify the certificate**:

```bash
# View certificate details
openssl x509 -in config/supabase-chain.pem -noout -text | head -20

# Check validity dates
openssl x509 -in config/supabase-chain.pem -noout -dates

# Test SSL connection locally
npm run test-ssl
```

### Manual Certificate Regeneration (If Needed)

If Supabase rotates their certificates or you need to regenerate the chain:

#### Step 1: Extract Certificate Chain from Live Connection

```bash
# Set DATABASE_URL to production Supabase connection string
export DATABASE_URL='postgresql://...'

# Extract certificate chain
npm run extract-cert
# or: npx tsx scripts/extract-supabase-cert.ts

# This will create/update: config/supabase-chain.pem
```

#### Step 2: Verify Certificate Chain

```bash
# Test the extracted certificate
npm run test-ssl
# or: npx tsx scripts/test-final-ssl.ts

# Expected output:
# ✅ Connection successful with SSL verification enabled!
# Database: PostgreSQL 17.6
```

#### Step 3: Commit and Deploy

```bash
# Add the updated certificate to git
git add config/supabase-chain.pem

# Commit with descriptive message
git commit -m "chore(ssl): update Supabase certificate chain"

# Deploy to production
git push origin main

# Verify in production
vercel logs mirrorbuddy --prod | grep "\[SSL\]"
# Expected: "[SSL] Certificate chain loaded, enabling SSL verification"
```

## Verification

### Check Certificate Chain Locally

```bash
# Count certificates in chain
echo $SUPABASE_CA_CERT | tr '|' '\n' | grep -c "BEGIN CERTIFICATE"
# Expected: >= 2

# View certificate details
echo $SUPABASE_CA_CERT | tr '|' '\n' | openssl x509 -noout -text
```

### Check Production SSL Status

```bash
# Via health endpoint
curl https://mirrorbuddy.vercel.app/api/health/detailed | jq '.checks.database'

# Via logs (Vercel CLI)
vercel logs mirrorbuddy --prod | grep SSL

# Expected log entries:
# - [SSL] Full certificate chain provided, enabling verification (certificates: 2+)
# - No SSL warnings about missing cert chain
```

### Test Database Connection

```bash
# Should succeed without SSL errors
curl https://mirrorbuddy.vercel.app/api/health
# {
#   "status": "healthy",
#   "checks": {
#     "database": {
#       "status": "pass",
#       "latency_ms": 45
#     }
#   }
# }
```

## Troubleshooting

### Problem: Certificate Still Shows as Incomplete

**Symptoms**:

```
[SSL] Incomplete certificate chain, disabling verification
certificates: 1
expected: >=2 (root + intermediate)
```

**Diagnosis**:

```bash
# Check certificate count
echo $SUPABASE_CA_CERT | tr '|' '\n' | grep -c "BEGIN CERTIFICATE"
```

**Resolution**:

1. Re-download certificate from Supabase (ensure "full chain" option)
2. Verify file contains multiple `-----BEGIN CERTIFICATE-----` sections
3. Update `SUPABASE_CA_CERT` with complete content
4. Redeploy

### Problem: SSL Connection Fails After Enabling

**Symptoms**:

```
Error: unable to verify the first certificate
```

**Diagnosis**:

- Certificate chain incomplete
- Wrong certificate format
- Certificate expired

**Resolution**:

```bash
# Validate certificate with OpenSSL
echo $SUPABASE_CA_CERT | tr '|' '\n' | openssl x509 -noout -dates
# Check: notAfter date is in future

# Test certificate against Supabase endpoint
echo $SUPABASE_CA_CERT | tr '|' '\n' > /tmp/cert.pem
openssl s_client -connect aws-1-eu-west-1.pooler.supabase.com:6543 \
  -CAfile /tmp/cert.pem -verify 5
# Expected: Verify return code: 0 (ok)
```

### Problem: Environment Variable Too Long

**Symptoms**:

```
Error: Environment variable exceeds 4KB limit
```

**Resolution**:
Certificate chains are typically <3KB. If exceeding:

1. Check for duplicate certificates
2. Ensure only root + intermediate (not server cert)
3. Remove whitespace/comments from PEM file

## Security Considerations

### Current Risk (SSL Verification Disabled)

- **Attack Vector**: Man-in-the-middle (MITM) between Vercel and Supabase
- **Likelihood**: Low (AWS internal network)
- **Impact**: High (database access)
- **Mitigation**: TLS encryption still active (prevents passive eavesdropping)

### After Enabling SSL Verification

- **Attack Vector**: Mitigated (server authentication required)
- **Security Posture**: Production-ready
- **Compliance**: Meets GDPR/SOC2 requirements

## Certificate Rotation

Supabase certificates typically valid for 1-2 years.

**Monitoring**:

- Add calendar reminder to check certificate expiry
- Supabase will email before expiration

**Rotation Process**:

1. Download new certificate from Supabase
2. Update `SUPABASE_CA_CERT` environment variable
3. Deploy (zero-downtime rollout)
4. Verify in production

## Code References

**SSL Configuration**: `src/lib/db.ts:75-134`
**Setup Script**: `scripts/setup-ssl-certificate.sh`
**Pool Configuration**: `src/lib/db.ts:146-155`

## Related Documentation

- ADR 0067: Database Performance Optimization
- ADR 0063: Supabase SSL Certificate Requirements
- [Supabase SSL Documentation](https://supabase.com/docs/guides/database/connecting-to-postgres#ssl-connections)
- [node-postgres SSL Configuration](https://node-postgres.com/features/ssl)

## Changelog

**2026-01-22** (Latest - Root Cause Solution):

- ✅ **ROOT CAUSE SOLVED**: Extracted Supabase certificate chain from live connection
- ✅ Certificate location: `config/supabase-chain.pem` (2 certificates: intermediate + root)
- ✅ **Key Insight**: Full chain (intermediate + root CA) required for verification
  - NO certificate: "self-signed certificate in certificate chain" ❌
  - ONLY intermediate: "unable to get issuer certificate" ❌
  - Intermediate + Root: SSL verification successful ✅
- ✅ Automated extraction script: `scripts/extract-supabase-cert.ts`
- ✅ Automated testing script: `scripts/test-final-ssl.ts`
- ✅ Updated `src/lib/db.ts` to load from repository file
- ✅ SSL verification enabled in production (`rejectUnauthorized: true`)
- ✅ No manual setup required for new deployments
- ✅ No environment variable size limits

**2026-01-22** (Intermediate Attempts):

- ⚠️ Tried AWS RDS Global Bundle (108 certs) - Too large for env vars (165KB > 64KB limit)
- ⚠️ Tried AWS RDS EU-WEST-1 Bundle (3 certs) - Wrong certificates (AWS not Supabase)
- ⚠️ Tried repository-based AWS bundle - "self-signed certificate in certificate chain" error
- ⚠️ Tried system root CAs only - Still got "self-signed certificate" error
- ⚠️ Tried intermediate only - "unable to get issuer certificate" error

**2026-01-22** (Initial):

- Created investigation and testing scripts
- Documented the certificate verification problem
- Identified root cause: Need full Supabase certificate chain

---

**Maintained by**: Engineering Team
**Last Updated**: 2026-01-22
**Status**: ✅ Implemented and Verified
**Next Review**: 2033 (certificate expiration) or when Supabase rotates certificates
