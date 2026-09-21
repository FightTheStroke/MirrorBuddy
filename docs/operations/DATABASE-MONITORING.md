# Database Connection Pool Monitoring

**ADR**: 0067 - Database Performance Optimization
**Date**: 2026-01-22
**Status**: Active

## Overview

MirrorBuddy monitors PostgreSQL connection pool statistics via Prometheus metrics and health endpoints. This enables proactive detection of connection pool exhaustion and performance degradation.

## Metrics Available

### Prometheus Metrics (`/api/metrics`)

| Metric                                    | Type  | Description                     | Alert Threshold              |
| ----------------------------------------- | ----- | ------------------------------- | ---------------------------- |
| `mirrorbuddy_db_pool_size_total`          | gauge | Total pool size (active + idle) | -                            |
| `mirrorbuddy_db_pool_connections_active`  | gauge | Connections executing queries   | >4 (80% of max 5)            |
| `mirrorbuddy_db_pool_connections_idle`    | gauge | Idle connections available      | <1 (low availability)        |
| `mirrorbuddy_db_pool_requests_waiting`    | gauge | Requests waiting for connection | >0 (pool exhausted)          |
| `mirrorbuddy_db_pool_utilization_percent` | gauge | Pool utilization (0-100)        | >80% (high), >90% (critical) |

### Health Endpoint (`/api/health/detailed`)

```json
{
  "checks": {
    "database": {
      "status": "pass",
      "latencyMs": 45,
      "connectionPool": {
        "total": 2,
        "active": 1,
        "idle": 1,
        "waiting": 0,
        "utilization": 20
      }
    }
  }
}
```

## Pool Configuration

**File**: `packages/db/src/client.ts` (re-exported by `apps/web/src/lib/db.ts`)

```typescript
const pool = new Pool({
  max: 5, // Maximum concurrent connections
  min: 0, // Allow all idle connections to be released
  idleTimeoutMillis: 30000, // 30s idle timeout
  connectionTimeoutMillis: 10000, // 10s connection timeout
});

if (process.env.VERCEL === '1') {
  attachDatabasePool(pool);
}
```

**Rationale**: The shared pool supports concurrent requests on Vercel Fluid compute.
`attachDatabasePool` from `@vercel/functions` lets idle connections close before
instance suspension, when ordinary idle timers would stop running. Pool size,
connection timeout, TLS validation and query error propagation remain unchanged.
See [Vercel's connection pooling guidance](https://vercel.com/kb/guide/connection-pooling-with-functions).

The extended Prisma client and its actual pool are cached together on `globalThis`
in development and production, before constructing either resource. Normal warm
requests already reuse the module; the global guard additionally covers repeated
module evaluations in the same JavaScript runtime. Separate runtimes still have
separate pools. `min: 0` permits idle eviction; it does not disable warm reuse.

The runtime reads `DATABASE_URL`, while `prisma.config.ts` prefers `DIRECT_URL`
for migrations (unless an explicit local override is set). The example environment
uses the Supabase transaction pooler on port 6543; it is not evidence of the URL
in a serving deployment. Prisma's pg adapter uses the supplied `pg.Pool`, so pool
limits and connection timeouts come from its options, not Prisma engine URL
parameters such as `connection_limit` or `pool_timeout`. No statement timeout is
set in code; inspect database/role settings before choosing a query deadline.

### September 2026 connection-timeout investigation

Issues #1003 and #964 report connection timeouts; #1047 reports `EAUTHTIMEOUT`.
The reproducible code defect was eager pool/client construction on every module
evaluation, before a development-only client cache. This could multiply production
pools across module copies and make development pool metrics refer to a different
pool from the reused client. It was not a demonstrated per-request leak: pg opens
connections lazily, and incident reports do not prove module duplication occurred.

Before changing production settings, correlate the serving deployment/release and
timestamps with Supabase authentication logs, client/backend connection counts and
Vercel instance concurrency. Verify the redacted host, port and pooling mode of that
deployment's `DATABASE_URL`: transaction pooling on 6543 is appropriate for
short-lived serverless clients; port 5432 may be direct or session pooling depending
on the host. Keep migration traffic on a suitable direct/session connection.
Budget up to five client connections per live runtime plus other clients against
the pooler's client limit, and separately budget pooler backend connections against
PostgreSQL capacity. Do not raise pool size or connection timeouts without evidence
of which limit or handshake stage is failing. Neither this lifecycle correction nor
a successful health probe proves these intermittent incidents resolved.

An `08006` / `EAUTHTIMEOUT` event identifies a failed pooler authentication
handshake, not exhausted storage or a proven quota breach. Correlate its release,
environment and driver cause with provider connection metrics. A successful
one-off connectivity probe does not prove an intermittent incident resolved.

## Monitoring Setup

### 1. Grafana Dashboard

**Metrics to track**:

- Pool utilization trend (gauge)
- Active vs idle connections (stacked area chart)
- Waiting requests (line chart)
- Database latency (histogram)

**Query examples**:

```promql
# Pool utilization percentage
mirrorbuddy_db_pool_utilization_percent

# Active connections
mirrorbuddy_db_pool_connections_active

# Pool exhaustion events
mirrorbuddy_db_pool_requests_waiting > 0
```

### 2. Alerts

**Critical (PagerDuty)**:

```promql
# Pool exhausted (requests waiting)
mirrorbuddy_db_pool_requests_waiting > 0

# Very high utilization (≥90%)
mirrorbuddy_db_pool_utilization_percent >= 90
```

**Warning (Slack)**:

```promql
# High utilization (≥80%)
mirrorbuddy_db_pool_utilization_percent >= 80

# Low idle connections (<20% available)
mirrorbuddy_db_pool_connections_idle / 5 < 0.2
```

### 3. Health Check Integration

**Load balancer** (k8s, ALB):

```bash
curl http://localhost:3000/api/health
# Returns 503 if unhealthy
```

**Monitoring dashboard**:

```bash
curl http://localhost:3000/api/health/detailed
# Requires auth in production
```

## Troubleshooting

### Problem: Pool Exhausted (waiting > 0)

**Symptoms**:

- `mirrorbuddy_db_pool_requests_waiting` > 0
- Slow API responses
- Database timeout errors

**Diagnosis**:

```bash
# Check current pool status
curl http://localhost:3000/api/health/detailed

# Check recent slow queries (Supabase Dashboard)
# Project → Database → Query Performance
```

**Resolution**:

1. **Immediate**: Restart serverless functions (redeploy)
2. **Short-term**: Increase `max` pool size to 10 (src/lib/db.ts)
3. **Long-term**: Optimize slow queries, add indexes, consider Prisma Accelerate

### Problem: High Utilization (>80%)

**Symptoms**:

- `mirrorbuddy_db_pool_utilization_percent` consistently >80%
- Intermittent slow responses

**Diagnosis**:

```bash
# Check pool trends in Grafana
# Check concurrent request rate
```

**Resolution**:

1. **Optimize queries**: Use `EXPLAIN ANALYZE` for slow queries
2. **Add indexes**: Missing indexes on frequently queried columns
3. **Connection pooling**: Consider Supabase Supavisor (pgbouncer)
4. **Scale database**: Upgrade Supabase plan if needed

### Problem: No Idle Connections (idle = 0)

**Symptoms**:

- `mirrorbuddy_db_pool_connections_idle` = 0 constantly
- Every request waits for new connection

**Diagnosis**:
This is **NORMAL** for serverless with `min: 0`. Connections are closed after 30s idle.

**Resolution**:

- No action needed (by design)
- If consistent high traffic, consider increasing `min: 1` to keep warm connection

### Problem: Database Latency >1000ms

**Symptoms**:

- Health check reports "warn" status
- `database.latencyMs` > 1000 in `/api/health/detailed`

**Diagnosis**:

```bash
# Check if cold start or genuine slow query
# Run multiple health checks in succession
for i in {1..5}; do
  curl http://localhost:3000/api/health | jq '.checks.database.latency_ms'
  sleep 1
done
```

**Resolution**:

- **Cold start** (first request >800ms, subsequent <200ms): Normal, no action
- **Consistent slow** (all requests >1000ms): Check Supabase slow query log

## Performance Baselines

### Normal Operation (Serverless)

| Metric             | Expected Range | Notes                     |
| ------------------ | -------------- | ------------------------- |
| Cold start latency | 300-800ms      | TLS handshake + pool init |
| Warm latency       | 20-100ms       | Existing connection reuse |
| Pool utilization   | 0-50%          | Low traffic typical       |
| Active connections | 0-2            | Serverless short-lived    |
| Idle connections   | 0-1            | min: 0 config             |
| Waiting requests   | 0              | Pool never exhausted      |

### High Traffic (>100 req/min)

| Metric             | Expected Range | Alert If                |
| ------------------ | -------------- | ----------------------- |
| Pool utilization   | 50-80%         | >90%                    |
| Active connections | 2-4            | >4 sustained            |
| Idle connections   | 0-1            | Always 0 (increase min) |
| Waiting requests   | 0              | >0                      |

## Code References

**Pool Configuration**: `src/lib/db.ts:115-155`
**Pool Metrics**: `src/lib/metrics/pool-metrics.ts`
**Prometheus Endpoint**: `src/app/api/metrics/route.ts:232-274`
**Health Endpoint**: `src/app/api/health/detailed/route.ts:160-184`

## Related Documentation

- ADR 0067: Database Performance Optimization
- ADR 0028: PostgreSQL + pgvector Architecture
- ADR 0047: Grafana Cloud Observability
- ADR 0058: Observability KPIs
- [Vercel Serverless Functions Limits](https://vercel.com/docs/functions/serverless-functions/limits)
- [node-postgres Pool Documentation](https://node-postgres.com/apis/pool)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pool)

## Changelog

**2026-01-22**: Initial implementation (ADR 0067)

- Added Prometheus metrics for pool statistics
- Integrated pool stats into `/api/health/detailed`
- Configured explicit pool settings for serverless
- Created monitoring documentation

---

**Maintained by**: Engineering Team
**Last Updated**: 2026-01-22
**Next Review**: 2026-04-22 (3 months)
