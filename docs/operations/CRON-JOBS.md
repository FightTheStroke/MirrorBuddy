# Cron Jobs - MirrorBuddy

Vercel Cron configuration for scheduled tasks.

## Configuration

All crons are defined in `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/metrics-push", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/business-metrics-daily", "schedule": "0 3 * * *" },
    { "path": "/api/cron/data-retention", "schedule": "0 3 * * *" },
    { "path": "/api/cron/trial-nurturing", "schedule": "0 9 * * *" }
  ]
}
```

## Jobs Overview

| Job                      | Schedule    | Purpose                          | Env Vars                        |
| ------------------------ | ----------- | -------------------------------- | ------------------------------- |
| `metrics-push`           | Every 5 min | Push SLI/HTTP metrics to Grafana | `GRAFANA_*`, `CRON_SECRET`      |
| `business-metrics-daily` | 03:00 UTC   | Push business KPIs to Grafana    | `GRAFANA_*`, `CRON_SECRET`      |
| `data-retention`         | 03:00 UTC   | Clean old telemetry data         | `CRON_SECRET`                   |
| `trial-nurturing`        | 09:00 UTC   | Send trial nurturing emails      | `RESEND_API_KEY`, `CRON_SECRET` |

## Job Details

### 1. metrics-push (Every 5 Minutes)

**File**: `src/app/api/cron/metrics-push/route.ts`

**Purpose**: Push real-time metrics to Grafana Cloud Prometheus.

**Metrics pushed**:

- `mirrorbuddy_http_requests_total` - HTTP request counts by status
- `mirrorbuddy_http_latency_p50/p95/p99` - Response latencies
- `mirrorbuddy_active_users_realtime` - Currently active users
- `mirrorbuddy_funnel_stage_count` - Users per funnel stage

**Required env vars**:

```bash
GRAFANA_CLOUD_PROMETHEUS_URL=https://prometheus-...grafana.net/api/prom/push
GRAFANA_CLOUD_PROMETHEUS_USER=123456
GRAFANA_CLOUD_API_KEY=glc_...
CRON_SECRET=your-secret-here
```

### 2. business-metrics-daily (03:00 UTC)

**File**: `src/app/api/cron/business-metrics-daily/route.ts`

**Purpose**: Push daily business KPIs to Grafana (heavier queries).

**Metrics pushed**:

- `mirrorbuddy_total_users` - Total registered users
- `mirrorbuddy_daily_active_users` - DAU
- `mirrorbuddy_total_sessions` - Chat sessions count
- `mirrorbuddy_voice_minutes_total` - Voice usage
- `mirrorbuddy_funnel_conversion_rate` - Trial to active conversion

### 3. data-retention (03:00 UTC)

**File**: `src/app/api/cron/data-retention/route.ts`

**Purpose**: Clean old telemetry and logs per GDPR retention policy.

**Actions**:

- Delete telemetry events older than 90 days
- Delete error logs older than 30 days
- Delete test data flagged with `isTestData: true`

### 4. trial-nurturing (09:00 UTC)

**File**: `src/app/api/cron/trial-nurturing/route.ts`

**Purpose**: Send automated nurturing emails to trial users.

**Email triggers**:

| Trigger          | Condition              | Email                                            |
| ---------------- | ---------------------- | ------------------------------------------------ |
| 70% Usage Nudge  | Trial at 70%+ usage    | "Stai usando MirrorBuddy! Richiedi accesso beta" |
| 7-Day Inactivity | No activity for 7 days | "Ti manca MirrorBuddy! Torna a studiare"         |

**Deduplication**: Uses `FunnelEvent.metadata` to track sent emails:

- `{ emailSent: true }` for usage nudge
- `{ inactivityReminder: true }` for inactivity reminder

**Required env vars**:

```bash
RESEND_API_KEY=re_...
CRON_SECRET=your-secret-here
```

## Security

All cron endpoints verify `CRON_SECRET` header:

```typescript
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}
```

Vercel automatically sends this header for configured crons.

## Testing Locally

```bash
# Test with curl (requires CRON_SECRET)
curl -X POST http://localhost:3000/api/cron/trial-nurturing \
  -H "Authorization: Bearer $CRON_SECRET"

# Or use GET (Vercel default)
curl http://localhost:3000/api/cron/metrics-push \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Monitoring

### Vercel Dashboard

1. Go to Project > Settings > Crons
2. View execution history and logs
3. Check for failures

### Grafana Alerts

Cron failures trigger alerts via:

- `mirrorbuddy_cron_failures_total` metric
- Slack notification on 3+ consecutive failures

### Manual Trigger

From Vercel dashboard: Project > Functions > Select cron > "Run now"

## Troubleshooting

### Cron not running

1. Check `vercel.json` syntax
2. Verify deployment includes cron changes
3. Check Vercel cron logs for errors

### Email not sending

1. Verify `RESEND_API_KEY` is set
2. Check Resend dashboard for delivery status
3. Verify recipient email is valid

### Metrics not appearing in Grafana

1. Check `GRAFANA_*` env vars are set
2. Test push manually: `npx tsx scripts/test-grafana-push.ts`
3. Check Grafana Cloud > Explore for recent data

## Related

- ADR 0047: Grafana Cloud Observability
- ADR 0068: Conversion Funnel Dashboard
- `docs/operations/RUNBOOK.md` - Incident response
