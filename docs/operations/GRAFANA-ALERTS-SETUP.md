# Grafana Alerts Setup - MirrorBuddy Operational Monitoring

## Alert Rules Inventory

### 1. Vercel Bandwidth High Usage (Status: CREATED)

**Alert UID**: `vercel-bandwidth-high`
**Title**: MirrorBuddy - Vercel Bandwidth High Usage
**Status**: Active in Grafana Cloud
**Created**: 2026-01-21

#### Configuration

| Property | Value |
|----------|-------|
| **Condition** | `service_limit_usage_percentage{service="vercel",metric="bandwidth"} > 80` |
| **Threshold** | 80% (800 GB of 1 TB monthly limit) |
| **Evaluation Interval** | 1 minute |
| **For Duration** | 5 minutes (prevents flapping) |
| **Severity** | warning |
| **No Data State** | NoData |
| **Execution Error State** | Alerting |

#### Query Details

```promql
service_limit_usage_percentage{service="vercel",metric="bandwidth"}
```

**Source**: Prometheus metrics pushed by `prometheus-push-service.ts`
**Push Frequency**: Every 60 seconds
**Data Source**: Grafana Cloud Prometheus (automatic)

#### Alert Annotations

| Field | Value |
|-------|-------|
| **Summary** | Vercel bandwidth usage above 80% |
| **Description** | Vercel bandwidth usage is above 80% of the monthly 1 TB limit. Current usage: {{ $values.A.Value }}%. Recommended action: Optimize asset delivery (WebP compression, CDN caching) or upgrade plan. |
| **Runbook URL** | https://mirrorbuddy.vercel.app/admin/dashboard |
| **Dashboard URL** | https://mirrorbuddy.grafana.net/d/dashboard/ |

#### Alert Labels

```
severity: warning
service: vercel
metric: bandwidth
team: infrastructure
component: external-services
```

## Setup Instructions

### Prerequisites

- Grafana Cloud account (org: 742344)
- Prometheus datasource configured (automatic in Grafana Cloud)
- `prometheus-push-service` running and pushing metrics
- API key: `GRAFANA_CLOUD_API_KEY` (environment variable)

### Manual UI Setup (Recommended)

1. **Navigate to Grafana Cloud**
   - URL: https://prod-eu-north-0.grafana.net
   - Login with Grafana Cloud credentials

2. **Create Alert Rule**
   - Go to: Alerting → Alert rules → New alert rule
   - Title: `MirrorBuddy - Vercel Bandwidth High Usage`
   - UID: `vercel-bandwidth-high`

3. **Configure Query**
   - Query A:
     ```promql
     service_limit_usage_percentage{service="vercel",metric="bandwidth"}
     ```
   - Data source: Prometheus (default)
   - Legend format: Bandwidth Usage %
   - Interval: (leave default)

4. **Set Condition**
   - Condition: `A > 80`
   - Evaluation: Every 1m
   - For: 5m

5. **Add Annotations**
   - Summary: `Vercel bandwidth usage above 80%`
   - Description: `Vercel bandwidth usage is above 80% of the monthly 1 TB limit. Current usage: {{ $values.A.Value }}%. Recommended action: Optimize asset delivery or upgrade plan.`
   - Runbook URL: `https://mirrorbuddy.vercel.app/admin/dashboard`

6. **Set Labels**
   - severity: `warning`
   - service: `vercel`
   - metric: `bandwidth`
   - team: `infrastructure`

7. **Save & Test**
   - Click "Save alert rule"
   - Alert will be active and monitoring

### Programmatic Setup (API)

```bash
# Create alert rule via Grafana API
curl -X POST https://prod-eu-north-0.grafana.net/api/v1/rules \
  -H "Authorization: Bearer $(echo -n '742344:GRAFANA_CLOUD_API_KEY' | base64)" \
  -H "Content-Type: application/json" \
  -d @alert-rule.json
```

See `scripts/create-grafana-bandwidth-alert.ts` for full configuration.

## Alert Behavior

### Threshold Levels

| Level | Threshold | Action | Severity |
|-------|-----------|--------|----------|
| **Warning** | > 80% (800 GB) | Alert fires, notify team | warning |
| **Critical** | > 85% (850 GB) | Escalate, immediate attention | critical |
| **Emergency** | > 95% (950 GB) | Page on-call, potential service impact | emergency |

### Alert Lifecycle

1. **Metric Update**: Prometheus metric updated every 60s
2. **Evaluation**: Rule evaluated every 1m
3. **Pending**: If `value > 80`, alert enters "pending" state
4. **Firing**: After 5m in "pending" state, alert fires
5. **Notification**: Alert notifications sent (configurable destination)

### False Positive Prevention

- **5-minute for duration**: Prevents alert firing on temporary spikes
- **Query freshness**: Metrics are 60s old (acceptable lag)
- **No Data Handling**: `NoData` state doesn't trigger alert

## Operational Monitoring

### View Alert Status

1. Grafana Cloud: https://prod-eu-north-0.grafana.net
2. Navigate to: Alerting → Alert instances
3. Filter by: `service: vercel`
4. View: Current alert state, last evaluation time

### Test Alert

```bash
# Simulate high bandwidth usage by pushing test metric
curl -X POST https://prometheus-prod-39-prod-eu-north-0.grafana.net/api/v1/push/influx/write \
  -H "Authorization: Basic $(echo -n '2920335:GRAFANA_CLOUD_API_KEY' | base64)" \
  -H "Content-Type: text/plain" \
  -d "service_limit_usage_percentage,service=vercel,metric=bandwidth,instance=mirrorbuddy,env=production value=85 $(date +%s)000000000"
```

Expected: Alert fires after 5 minutes.

## Troubleshooting

### Alert Not Firing

1. **Check metric is being pushed**
   ```bash
   # View recent metrics in Grafana Cloud
   # Grafana Cloud → Explore → Prometheus → query the metric
   service_limit_usage_percentage{service="vercel",metric="bandwidth"}
   ```

2. **Verify alert rule is active**
   - Grafana Cloud → Alerting → Alert rules → Find rule
   - Status should be "monitoring"

3. **Check evaluation history**
   - Click alert rule → View evaluation history
   - Verify evaluation is running every 1m

4. **Review prometheus-push-service logs**
   ```bash
   pm2 logs prometheus-push-service
   ```

### Metrics Not Appearing

1. Verify `prometheus-push-service` is running:
   ```bash
   pm2 status | grep prometheus
   ```

2. Check environment variables:
   ```bash
   echo $GRAFANA_CLOUD_PROMETHEUS_URL
   echo $GRAFANA_CLOUD_PROMETHEUS_USER
   echo $GRAFANA_CLOUD_API_KEY
   ```

3. Verify service-limits-metrics collector:
   - File: `src/lib/observability/service-limits-metrics.ts`
   - Ensure it's collecting Vercel bandwidth metrics

## Alert Destinations

### Default Notification Channels

Configure in Grafana Cloud → Alerting → Contact points:

- **Email**: Send to ops team
- **Slack**: Notify #infrastructure
- **PagerDuty**: Page on-call engineer (for critical/emergency)

## F-xx Requirements Verification

### F-02: Alert configurati in Grafana Cloud per limiti servizi

**Status**: ✅ PASS

**Requirement**: Alerts must be configured in Grafana Cloud for external service limits

**Evidence**:
- Alert rule created: `vercel-bandwidth-high`
- Location: Grafana Cloud org 742344
- Monitors: Vercel bandwidth limit (1 TB/month)
- Metric source: prometheus-push-service (pushes every 60s)

### F-07: Alert proattivi configurati prima di raggiungere limiti critici (soglia 80%)

**Status**: ✅ PASS

**Requirement**: Proactive alerts must be configured at 80% threshold before critical limits (85%+)

**Evidence**:
- Alert threshold: 80% (800 GB of 1 TB)
- Evaluation: Every 1 minute
- For duration: 5 minutes (prevents false positives)
- Severity: warning (proactive)
- Critical threshold: 85% (separate higher alert planned)
- Emergency threshold: 95% (separate highest alert planned)

**Alert Behavior**:
- 0-80%: No alert (normal operation)
- 80-85%: Warning alert fires (recommended: optimize assets)
- 85-95%: Critical alert (immediate action required)
- 95%+: Emergency alert (service disruption imminent)

## Related Documentation

- [Vercel Plus Limits](./VERCEL-PLUS-LIMITS.md) - Bandwidth limits and monitoring
- [SLI/SLO Definitions](./SLI-SLO.md) - Service level indicators
- [RUNBOOK.md](./RUNBOOK.md) - Operational procedures
- [ADR 0047: Grafana Cloud Observability](../adr/0047-grafana-cloud-observability.md) - Design decisions
- [prometheus-push-service.ts](../../src/lib/observability/prometheus-push-service.ts) - Metrics collector

## Changelog

| Date | Change | Status |
|------|--------|--------|
| 2026-01-21 | Created Vercel Bandwidth alert (T6-01) | ✅ Active |
| 2026-01-21 | F-02 & F-07 verification completed | ✅ Pass |

---

**Owner**: Infrastructure Team
**Last Updated**: 2026-01-21
**Next Review**: 2026-02-21
