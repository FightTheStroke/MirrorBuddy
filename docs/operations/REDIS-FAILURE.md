# Redis Failure Runbook

## Overview

MirrorBuddy uses Upstash Redis for rate limiting in production. This runbook covers handling Redis unavailability scenarios.

## Architecture

```
Client Request → API Route → Rate Limiter → Redis (Upstash)
                              ↓ failure
                          503 Service Unavailable
```

**Configuration:**

- Provider: Upstash (managed Redis)
- SLA: 99.99% uptime
- Environment: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

## Production Behavior

When Redis is unavailable in production:

1. **Rate limiting disabled**: All rate limit checks fail
2. **503 response**: API returns "Rate limiting service unavailable"
3. **Retry-After header**: Set to 60 seconds
4. **Logging**: CRITICAL level logged for alerting

```typescript
// src/lib/rate-limit.ts behavior
if (process.env.NODE_ENV === "production" && !isRedisConfigured()) {
  log.error("CRITICAL: Redis not configured in production");
  return {
    success: false,
    error: "Rate limiting service unavailable",
  };
}
```

## Incident Response

### Severity: P1 (Production Down)

**Symptoms:**

- Multiple 503 responses from API
- Log entries: "CRITICAL: Redis not configured in production"
- User complaints about app unavailability

### Step 1: Verify Redis Status

```bash
# Check Upstash dashboard
open https://console.upstash.com

# Test connection
curl -X GET $UPSTASH_REDIS_REST_URL \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" \
  -H "Content-Type: application/json"
```

### Step 2: Check Environment Variables

```bash
# Verify configuration in deployment
vercel env pull --environment production

# Required variables
grep -E "UPSTASH_REDIS" .env.production
```

### Step 3: Emergency Bypass (LAST RESORT)

If Redis cannot be restored quickly and service must continue:

```bash
# Set environment variable in Vercel
vercel env add RATE_LIMIT_BYPASS production
# Value: true

# Redeploy
vercel --prod
```

**WARNING:** Bypass exposes API to abuse. Only use for emergencies, revert immediately after Redis is restored.

### Step 4: Restore Normal Operation

```bash
# Remove bypass
vercel env rm RATE_LIMIT_BYPASS production

# Redeploy
vercel --prod
```

## Monitoring & Alerting

### Log Patterns to Monitor

```
# Critical - Immediate attention
"CRITICAL: Redis not configured in production"
"Redis rate limit error"

# Warning - Investigate
"Redis connection timeout"
"Rate limit fallback to memory"
```

### Metrics

| Metric                     | Alert Threshold |
| -------------------------- | --------------- |
| Redis connection errors    | > 0/min in prod |
| 503 rate limit responses   | > 10/min        |
| Rate limit fallback events | > 0 in prod     |

## Prevention

1. **Use managed Redis**: Upstash provides 99.99% SLA
2. **Monitor Upstash status**: https://status.upstash.com
3. **Set up alerting**: Log-based alerts for CRITICAL entries
4. **Test failover**: Regularly verify bypass procedure works

## Development vs Production

| Environment | Redis Required | Fallback   |
| ----------- | -------------- | ---------- |
| Development | No             | In-memory  |
| Production  | **YES**        | None (503) |
| E2E Tests   | No             | Bypassed   |

## Contact

- **Upstash Support**: support@upstash.com
- **Status Page**: https://status.upstash.com
- **Documentation**: https://docs.upstash.com

## Related

- [ADR-0047: Security Hardening](../adr/0047-security-hardening-plan17.md)
- [SLI/SLO Definitions](./SLI-SLO.md)
- [Main Runbook](./RUNBOOK.md)
