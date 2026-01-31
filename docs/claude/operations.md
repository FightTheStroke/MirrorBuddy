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
import { prometheusPushService } from "@/lib/observability";
// Singleton - auto-initialized via cron or manual
// Pushes Influx Line Protocol to Grafana Cloud every 60s (production only)
```

**Env vars**: `GRAFANA_CLOUD_PROMETHEUS_URL`, `GRAFANA_CLOUD_PROMETHEUS_USER`, `GRAFANA_CLOUD_API_KEY`

**Metrics collected**: HTTP latency/errors, funnel metrics, budget/abuse tracking, service limits, tier DAU/WAU/MAU.

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
