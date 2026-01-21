# Grafana Alert Rule: Supabase Database High Usage

**Alert UID**: `supabase-db-high-usage`
**Severity**: Critical
**Status**: Configured (F-02, F-18)
**Created**: 2026-01-21

## Overview

Monitors Supabase database size on free tier (500 MB limit) and alerts when usage exceeds 85% (425 MB).

## Configuration

| Property | Value |
|----------|-------|
| **Title** | MirrorBuddy - Supabase Database High Usage |
| **Threshold** | > 85% of 500 MB = 425 MB |
| **Metric** | `service_limit_usage_percentage{service="supabase",metric="database_size"}` |
| **Evaluation Interval** | 5 minutes (database grows gradually) |
| **Fire After Duration** | 10 minutes (allows time before alerting) |
| **Alert Group** | Service Limits |
| **Severity Label** | critical |

## Rationale

### Threshold: 85%
- **Why 85%?** Provides 75 MB buffer before hitting 500 MB limit
- Allows time for intervention before upgrade becomes critical
- Aligns with F-24 critical threshold definition

### Evaluation: Every 5 minutes
- Database size changes slowly (not reactive like API traffic)
- 5-minute interval provides reasonable monitoring without noise
- Sufficient to detect growth trends

### Fire After: 10 minutes
- Prevents false positives from temporary spikes
- Gives 2-3 evaluation cycles to confirm sustained high usage
- Allows team to plan upgrade rather than emergency response

## Alert Annotations

```
Summary: Supabase database usage above 85%

Description: Database size: {{ $values.A.Value }}% of 500 MB limit.
Free tier limit: 500 MB. Upgrade to Pro ($25/mo) for 8 GB.
Action: Contact admin to upgrade Supabase plan.

Runbook: http://localhost:3000/admin/safety
```

## Labels

```yaml
team: devops
service: supabase
component: database
severity: critical
```

## Compliance

### F-02: Alert configurati in Grafana Cloud per limiti servizi
- ✓ Alert configured in Grafana Cloud
- ✓ Monitors service limit (Supabase database)
- ✓ Automatic notification on threshold breach

### F-18: Alert configurati per OGNI limite dei piani attuali
- ✓ Alert for Supabase Free Tier (500 MB)
- ✓ Threshold set to critical level (85%)
- ✓ Part of comprehensive service limit monitoring

### F-24: Thresholds defined for critical events
- ✓ 85% = Critical (requires upgrade)
- ✓ Clear escalation path (Pro plan upgrade)

## Metrics

**Metric Name**: `service_limit_usage_percentage`

**Labels**:
- `service=supabase`
- `metric=database_size`

**Value**: Percentage (0-100)

**Source**: `src/lib/observability/supabase-limits.ts`

```typescript
export interface SupabaseLimits {
  database: ResourceMetric; // used, limit, usagePercent, status
  connections: ResourceMetric;
  storage: ResourceMetric | null;
}
```

## Notification Routing

**Current**: Alert created but notification policy pending (T6-05)

**Future Integration**:
1. Slack channel: `#alerts-critical` (optional)
2. PagerDuty: On-call engineer for critical alerts
3. Email: Admin notification
4. Admin dashboard: `/admin/safety` incident log

## Testing

### Verify Alert Created
```bash
curl -H "Authorization: Bearer ${GRAFANA_CLOUD_API_KEY}" \
  https://grafana.com/api/v1/rules/Prometheus?orgId=1
```

### Test Alert Firing (Manual)
```bash
# Create synthetic metric > 85%
npx tsx scripts/test-grafana-push.ts --metric-override="service_limit_usage_percentage=90"
```

### Verify Alert State
Check Grafana Cloud dashboard:
- Dashboard: https://mirrorbuddy.grafana.net/d/dashboard/
- Alerts section: View alert history and firing status

## Troubleshooting

### Alert Not Firing
1. Check metric is being pushed: `curl http://localhost:3000/api/metrics | grep service_limit_usage_percentage`
2. Verify Grafana datasource UID: `-100` (default Prometheus)
3. Check alert rule in Grafana: Alert Rules page
4. Review alert evaluation logs in Grafana

### Alert Threshold Too Low/High
1. Edit in Grafana Cloud UI
2. Update `> 85` condition to desired percentage
3. Alert UID remains same: `supabase-db-high-usage`
4. Change takes effect on next evaluation cycle

### Notifications Not Received
1. Verify notification policy is configured (T6-05)
2. Check contact points in Grafana
3. Test alert manually to confirm delivery

## Related Tasks

| Task | Description | Status |
|------|-------------|--------|
| T6-01 | Vercel bandwidth >80% alert | in_progress |
| T6-02 | Supabase DB >85% alert | **done** |
| T6-03 | Resend emails >85% alert | in_progress |
| T6-04 | Azure TPM >80% alert | in_progress |
| T6-05 | Test alert firing & notifications | pending |

## References

- **ADR 0047**: Grafana Cloud Observability
- **docs/operations/SLI-SLO.md**: Service level definitions
- **src/lib/observability/supabase-limits.ts**: Metrics collection
- **scripts/create-grafana-alert-supabase-db.ts**: Alert creation script

## Maintenance

### After Supabase Plan Upgrade
1. Update `SUPABASE_FREE_LIMITS.DATABASE_SIZE_MB` in supabase-limits.ts
2. Recalculate 85% threshold
3. Update alert rule condition
4. Test alert with new threshold

### Quarterly Review
1. Check alert firing frequency (should be rare)
2. Review false positive rate
3. Adjust threshold if needed
4. Update documentation
