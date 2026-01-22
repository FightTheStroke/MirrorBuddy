# SSL Certificate Setup for Supabase

**ADR**: 0067 - Database Performance Optimization
**Date**: 2026-01-22
**Status**: ✅ Implemented

## Current Status

**SSL Verification**: ✅ Enabled (`rejectUnauthorized: true`)
**Certificate Bundle**: AWS RDS Global Bundle (108 certificates)
**Location**: `config/aws-rds-ca-bundle.pem` (committed in repository)
**Security Impact**: Production-ready - Full server authentication enabled

## Problem

Supabase uses a certificate chain that requires explicit trust:

1. **Intermediate Certificate**: Provided by Supabase
2. **Root CA**: Missing from Vercel serverless trust store

Without the full chain, SSL verification fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`.

## Solution: AWS RDS Certificate Bundle (Repository-Based)

### Implementation

The SSL certificate bundle is now stored directly in the repository at `config/aws-rds-ca-bundle.pem`.

**Benefits**:

- No Vercel environment variable size limits (was 64KB, bundle is 165KB)
- Version controlled and consistent across all environments
- Automatic updates when bundle is refreshed
- No manual setup required for new deployments

**Certificate Source**: AWS RDS Global Bundle

- Contains 108 root + intermediate certificates
- Covers all AWS regions (including eu-west-1 where Supabase runs)
- Public certificates, safe to commit to repository
- Downloaded from: https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

### Manual Setup

#### Step 1: Download Certificate Chain

1. Login to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to: **Project → Settings → Database**
3. Scroll to **Connection Info** section
4. Click **SSL Configuration** tab
5. Download the **full certificate chain** (root + intermediate)

**Expected format**: PEM format, concatenated certificates

#### Step 2: Store Certificate in Environment Variable

**For Local Development** (`.env`):

```bash
# Full certificate chain (root + intermediate)
# Use | as newline separator for single-line compatibility
SUPABASE_CA_CERT="-----BEGIN CERTIFICATE-----|MII...|-----END CERTIFICATE-----|-----BEGIN CERTIFICATE-----|MII...|-----END CERTIFICATE-----"
```

**For Vercel Production**:

```bash
# Option 1: Via CLI
vercel env add SUPABASE_CA_CERT production
# Paste certificate content when prompted (with actual newlines)

# Option 2: Via Dashboard
# 1. Go to: https://vercel.com/fightthestroke/mirrorbuddy/settings/environment-variables
# 2. Add/Edit: SUPABASE_CA_CERT
# 3. Value: Paste certificate content (preserve newlines)
# 4. Environment: Production
# 5. Save
```

#### Step 3: Verify Certificate

The code automatically validates the certificate:

```typescript
// src/lib/db.ts:91-109
const certCount = (certContent.match(/BEGIN CERTIFICATE/g) || []).length;

if (certCount >= 2) {
  // Full chain detected, enable SSL verification
  return {
    rejectUnauthorized: true,
    ca: certContent,
  };
} else {
  // Incomplete chain, fallback to disabled verification
  logger.warn("Incomplete certificate chain");
}
```

**Expected**: Certificate count ≥ 2 (root + intermediate)

#### Step 4: Deploy and Verify

```bash
# Deploy to production
git push origin main

# Wait for deployment to complete (~2 minutes)

# Verify SSL is enabled (check logs)
vercel logs mirrorbuddy --prod | grep "\[SSL\]"
# Expected: "[SSL] Full certificate chain provided, enabling verification"

# Test connection
curl https://mirrorbuddy.vercel.app/api/health
# Expected: "status": "healthy"
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

**2026-01-22** (Latest - Repository-Based Implementation):

- ✅ **IMPLEMENTED**: AWS RDS Global Bundle stored in repository
- ✅ Certificate location: `config/aws-rds-ca-bundle.pem` (108 certificates)
- ✅ Updated `src/lib/db.ts` with file-based loading (no env var limits)
- ✅ SSL verification enabled by default in production
- ✅ No manual setup required for new deployments

**2026-01-22** (Initial):

- Created setup script (`scripts/setup-ssl-certificate.sh`)
- Updated code to support full certificate chain
- Added automatic certificate validation
- Documented setup process

---

**Maintained by**: Engineering Team
**Last Updated**: 2026-01-22
**Status**: ✅ Implemented and Active
**Next Review**: Annually (certificate bundle updates)
