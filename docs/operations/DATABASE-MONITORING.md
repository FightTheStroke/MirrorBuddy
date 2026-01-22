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

**File**: `src/lib/db.ts`

```typescript
const pool = new Pool({
  max: 5, // Maximum concurrent connections
  min: 0, // No idle connections (serverless)
  idleTimeoutMillis: 30000, // 30s idle timeout
  connectionTimeoutMillis: 10000, // 10s connection timeout
});
```

**Rationale**: Optimized for Vercel serverless (stateless, short-lived functions).

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
