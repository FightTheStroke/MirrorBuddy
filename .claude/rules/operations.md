# Operations Rules - MirrorBuddy

## Health Endpoints

| Endpoint                        | Purpose                 | Use Case                   |
| ------------------------------- | ----------------------- | -------------------------- |
| `GET /api/health`               | Basic health            | Load balancers, k8s probes |
| `GET /api/health/detailed`      | Full metrics            | Dashboards, debugging      |
| `GET /api/metrics`              | Prometheus format       | Grafana scraping           |
| `GET /api/admin/service-limits` | External service quotas | Admin monitoring           |

## Service Limits Monitoring

**Dashboard**: `/admin/service-limits` (admin-only)

Monitors real-time usage across 5 external services:

- Vercel (bandwidth, builds, functions)
- Supabase (database, storage, connections)
- Resend (email quota)
- Azure OpenAI (TPM, RPM)
- Redis KV (storage, commands)

**Alert thresholds**: Warning (≥80%) | Critical (≥95%)

**Reference**: docs/operations/RUNBOOK.md - Service Limits Monitoring section

## Grafana Cloud

**Dashboard**: https://mirrorbuddy.grafana.net/d/dashboard/

**Environment variables** (in `.env`):

```bash
GRAFANA_CLOUD_PROMETHEUS_URL=https://...
GRAFANA_CLOUD_PROMETHEUS_USER=...
GRAFANA_CLOUD_API_KEY=...
```

**Test push**: `npx tsx scripts/test-grafana-push.ts`

**Implementation**: `src/lib/observability/prometheus-push-service.ts`

## Cron Jobs

Configured in `vercel.json`, documented in `docs/operations/CRON-JOBS.md`.

| Job                      | Schedule       | Purpose                     |
| ------------------------ | -------------- | --------------------------- |
| `metrics-push`           | _/5 _ \* \* \* | SLI/HTTP metrics to Grafana |
| `business-metrics-daily` | 0 3 \* \* \*   | Daily KPIs to Grafana       |
| `data-retention`         | 0 3 \* \* \*   | GDPR data cleanup           |
| `trial-nurturing`        | 0 9 \* \* \*   | Trial user email automation |

**Test locally**: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/{job}`

## Runbooks

| Document                                | Purpose                   |
| --------------------------------------- | ------------------------- |
| `docs/operations/SLI-SLO.md`            | Service level definitions |
| `docs/operations/RUNBOOK.md`            | Incident response         |
| `docs/operations/RUNBOOK-PROCEDURES.md` | Maintenance procedures    |
| `docs/operations/CRON-JOBS.md`          | Cron job documentation    |

## Observability Stack

```
src/lib/observability/
├── prometheus-push-service.ts  # Metrics push to Grafana Cloud
└── ...

src/lib/logger/
└── ...                         # Structured JSON logging
```

## Quick Debugging

```bash
# Check health
curl http://localhost:3000/api/health

# Check detailed metrics
curl http://localhost:3000/api/health/detailed

# View Prometheus metrics
curl http://localhost:3000/api/metrics
```

## Sentry Error Tracking

**DSN Configuration** (required for all environments):

```bash
SENTRY_DSN=https://xxxxx@o123456.ingest.sentry.io/123456
SENTRY_ENVIRONMENT=production  # or staging, development
```

**Validation**:

- **Non-empty**: If empty, Sentry is disabled (no errors captured)
- **Format**: Must start with `https://` and contain `@o` marker
- **Environment mismatch**: DSN and SENTRY_ENVIRONMENT must align (e.g., prod DSN in staging = data pollution)

**Common issues**:

- Empty DSN in Vercel → no error tracking in production
- Staging DSN used in production → errors sent to wrong project
- Always verify: `echo $SENTRY_DSN | grep -q '@o'` returns 0

**Test locally**: `curl http://localhost:3000/api/health/detailed | grep sentry`

## ADR References

- ADR 0037: Deferred production items (auth, Redis, IaC)
- ADR 0047: Grafana Cloud observability
