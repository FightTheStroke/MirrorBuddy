# Operations & Observability

> Health endpoints, Grafana Cloud metrics push, cron jobs, service limit monitoring

## Quick Reference

| Key           | Value                           |
| ------------- | ------------------------------- |
| Health basic  | `GET /api/health`               |
| Health detail | `GET /api/health/detailed`      |
| Metrics       | `GET /api/metrics`              |
| Observability | `src/lib/observability/`        |
| Cron jobs     | `src/app/api/cron/`             |
| Dashboard     | https://mirrorbuddy.grafana.net |
| ADR           | 0037, 0047, 0058                |

## Health Endpoints

| Endpoint                   | Auth      | Status Codes  | Use Case           |
| -------------------------- | --------- | ------------- | ------------------ |
| `GET /api/health`          | None      | 200, 503      | Load balancers     |
| `HEAD /api/health`         | None      | 200           | Simple alive check |
| `GET /api/health/detailed` | Bearer/IP | 200, 401, 503 | Dashboards         |

### Basic Health Response

```json
{
  "status": "healthy|degraded|unhealthy",
  "version": "1.0.0",
  "timestamp": "2026-01-31T12:00:00Z",
  "uptime": 3600,
  "checks": {
    "database": { "status": "pass|warn|fail", "latency_ms": 15 },
    "ai_provider": {
      "status": "pass|warn|fail",
      "message": "Azure OpenAI configured"
    },
    "memory": { "status": "pass|warn|fail", "message": "45MB / 128MB (35%)" }
  }
}
```

### Detailed Health (Additional Checks)

Database connection pool (total/active/idle/waiting/utilization), AI provider config, memory RSS, safety modules status, Grafana push status, build info (node version, platform).

**Auth**: `Bearer {HEALTH_SECRET}` header or private network IP. Open in development.

## Grafana Cloud Push

```typescript
import { prometheusPushService } from '@/lib/observability';
// Production instrumentation starts the instance-local push service.
// The authenticated cron separately pushes database-backed metrics.
```

**Env vars**: `GRAFANA_CLOUD_PROMETHEUS_URL`, `GRAFANA_CLOUD_PROMETHEUS_USER`, `GRAFANA_CLOUD_API_KEY`

**Metrics collected**: HTTP latency/errors, funnel metrics, budget/abuse tracking, service limits, tier DAU/WAU/MAU.

### Collection ownership and failure semantics

| Path                     | Collector families                                                                                                                                                                                | Cadence                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Instance push            | HTTP, in-memory funnel, budget, abuse, conversion                                                                                                                                                 | Startup and `GRAFANA_CLOUD_PUSH_INTERVAL` (default 60 seconds); best effort on serverless |
| `/api/cron/metrics-push` | SLI/HTTP summary, database active users and cleanup, database funnel/conversion, churn, behavioral/session health, batch funnel recording, waitlist, service limits (Vercel/Supabase/Azure), tier | Existing five-minute schedule                                                             |
| Non-Vercel instance push | Also service limits and tier                                                                                                                                                                      | Same instance interval; unchanged                                                         |

All three Grafana credentials must be nonblank before collecting. Missing Grafana
configuration returns a skipped cron response and logs once per process at info;
an unconfigured Vercel source likewise logs once and publishes only
`metric_collector_enabled=0` / `metric_collector_up=0`, never fabricated usage.
Separate serverless instances have separate once-only state.

A configured source failure emits one warning with `component=metrics-collector`,
collector name and safe error type/code/SQLSTATE/query/status where available.
Warnings group by collector, so transport outages stay separate from source failures;
both push paths share the `grafana_transport` identity.
Driver messages, SQL text, provider response bodies and credentials are excluded.
Valid sibling samples survive, with the failed source marked enabled=1/up=0.
Transport failure is not success: cron returns 502 and reports one warning;
the instance push reports once at its scheduling boundary.
The production watch labels explicitly tagged collector warnings as
`Monitoring warning`, not `Sentry error`, when both issue and latest-event severity
are warning. These tickets remain actionable, including total transport outages
when Grafana cannot receive health samples. No alert is filtered out. Error-level
incidents, other warnings and unclassifiable events retain their existing handling.
Cron section health uses distinct names (`cron-http`, `realtime-active-users`,
`funnel-metrics`, `churn-metrics`, `behavioral-metrics`, `batch-funnel`,
`waitlist-metrics`, `database-backed`) so it cannot overwrite timer health.
Batch funnel persistence retains its existing error reporting: lost analytics
writes are not reclassified as harmless collection failures.

**Issue #1018 remains open.** Database-backed collection is already centralized on
Vercel, but instance-local HTTP/funnel/budget/abuse/conversion state cannot be moved
to cron without durable aggregation: the cron instance cannot read other instances'
memory. Removing the timer alone would drop genuine measurements. Completing the
single-schedule design needs lossless aggregation and actual received Grafana
samples at the known cadence, not just a quiet error feed. This reliability change
does not change cloud schedules, credentials or access.

**Historical Supabase failures:** PR #1017 documented connection failures
(`08006`/`XX000`) and lost error attribution; PR #1040 removed database-collector
fanout from Vercel instance timers. The current `pg_database_size` and
`COUNT(*) FROM pg_stat_activity` queries are unchanged: no SQL defect or production
permission failure is established by the available issue evidence. Preserve
named-query and driver-code diagnostics rather than guessing a query rewrite.

## Cron Jobs

| Job              | Schedule       | Path                               | Purpose             |
| ---------------- | -------------- | ---------------------------------- | ------------------- |
| metrics-push     | _/5 _ \* \* \* | `/api/cron/metrics-push`           | SLI/HTTP to Grafana |
| business-metrics | 0 3 \* \* \*   | `/api/cron/business-metrics-daily` | Daily KPIs          |
| data-retention   | 0 3 \* \* \*   | `/api/cron/data-retention`         | GDPR cleanup        |
| trial-nurturing  | 0 9 \* \* \*   | `/api/cron/trial-nurturing`        | Email automation    |
| rotate-ip-salt   | 0 0 1 \* \*    | `/api/cron/rotate-ip-salt`         | Privacy: IP salt    |

All cron jobs require `Authorization: Bearer {CRON_SECRET}` header.

**Test locally**: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/{job}`

## Service Limits Dashboard

**Admin page**: `/admin/service-limits` - monitors 5 external services:
Vercel (bandwidth/builds/functions), Supabase (DB/storage/connections), Resend (email), Azure OpenAI (TPM/RPM), Redis KV (storage/commands).

**Thresholds**: Warning >= 80%, Critical >= 95%.

## Memory Thresholds

| Heap Size  | Warn    | Fail    |
| ---------- | ------- | ------- |
| Serverless | > 200MB | > 400MB |
| Standard   | > 70%   | > 90%   |

## See Also

- `docs/operations/SLI-SLO.md` - Service level definitions
- `docs/operations/RUNBOOK.md` - Incident response
- `docs/operations/CRON-JOBS.md` - Cron documentation
- `src/lib/observability/prometheus-push-service.ts` - Push implementation
