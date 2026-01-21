# Alert Testing Guide - MirrorBuddy

Quick reference for testing Grafana alerts during development and maintenance.

## Prerequisites

- Grafana Cloud account access
- GRAFANA_CLOUD_API_KEY in environment
- Grafana credentials for UI verification
- Alert rules must be created (T6-01 through T6-04)

## Test Metric Push Command

All alerts use the same push mechanism. Generic template:

```bash
TIMESTAMP=$(date +%s)
curl -X POST https://prometheus-prod-XX-prod-eu-north-0.grafana.net/api/v1/push/influx/write \
  -H "Authorization: Basic $(echo -n 'USER:KEY' | base64)" \
  -H "Content-Type: text/plain" \
  -d "service_limit_usage_percentage,service=SERVICE,metric=METRIC,instance=mirrorbuddy,env=production value=PERCENTAGE ${TIMESTAMP}000000000"
```

Replace: USER (Grafana org ID), KEY (API key), SERVICE, METRIC, PERCENTAGE

## Alert Testing Procedures

### 1. Vercel Bandwidth (>80%)

**Test threshold**: 85% (to trigger alert after 5-min hold period)

```bash
TIMESTAMP=$(date +%s)
curl -X POST https://prometheus-prod-XX-prod-eu-north-0.grafana.net/api/v1/push/influx/write \
  -H "Authorization: Basic $(echo -n 'ORG_ID:GRAFANA_CLOUD_API_KEY' | base64)" \
  -H "Content-Type: text/plain" \
  -d "service_limit_usage_percentage,service=vercel,metric=bandwidth,instance=mirrorbuddy,env=production value=85 ${TIMESTAMP}000000000"
```

**Verification**:

1. Push metric using above command
2. Wait 1 minute for metric to appear in Prometheus
3. Grafana Cloud → Explore → Query: `service_limit_usage_percentage{service="vercel",metric="bandwidth"}`
4. Verify datapoint shows 85%
5. Alert enters "pending" state
6. After 5 more minutes, alert fires
7. Check: Alerting → Alert instances → Filter by service=vercel

### 2. Supabase Database (>85%)

**Test threshold**: 90% (to trigger alert)

```bash
TIMESTAMP=$(date +%s)
curl -X POST https://prometheus-prod-XX-prod-eu-north-0.grafana.net/api/v1/push/influx/write \
  -H "Authorization: Basic $(echo -n 'ORG_ID:GRAFANA_CLOUD_API_KEY' | base64)" \
  -H "Content-Type: text/plain" \
  -d "service_limit_usage_percentage,service=supabase,metric=database,instance=mirrorbuddy,env=production value=90 ${TIMESTAMP}000000000"
```

**Verification**:

1. Push metric and wait 1 minute for ingestion
2. Query: `service_limit_usage_percentage{service="supabase",metric="database"}`
3. Confirm 90% appears in Prometheus
4. After 5 minutes, alert fires (UID: supabase-db-high)
5. Check notification delivery (email/Slack configured in contact points)

### 3. Resend Emails (>85%)

**Test threshold**: 88% (to trigger alert)

```bash
TIMESTAMP=$(date +%s)
curl -X POST https://prometheus-prod-XX-prod-eu-north-0.grafana.net/api/v1/push/influx/write \
  -H "Authorization: Basic $(echo -n 'ORG_ID:GRAFANA_CLOUD_API_KEY' | base64)" \
  -H "Content-Type: text/plain" \
  -d "service_limit_usage_percentage,service=resend,metric=emails,instance=mirrorbuddy,env=production value=88 ${TIMESTAMP}000000000"
```

**Verification**:

1. Push metric and verify ingestion
2. Query: `service_limit_usage_percentage{service="resend",metric="emails"}`
3. Alert pending for 5 minutes, then fires
4. Dashboard link included in alert: https://mirrorbuddy.grafana.net/d/dashboard/
5. Runbook link: https://mirrorbuddy.vercel.app/admin/dashboard

### 4. Azure OpenAI TPM (>80%)

**Test threshold**: 85% (to trigger alert)

```bash
TIMESTAMP=$(date +%s)
curl -X POST https://prometheus-prod-XX-prod-eu-north-0.grafana.net/api/v1/push/influx/write \
  -H "Authorization: Basic $(echo -n 'ORG_ID:GRAFANA_CLOUD_API_KEY' | base64)" \
  -H "Content-Type: text/plain" \
  -d "service_limit_usage_percentage,service=azure,metric=tpm,instance=mirrorbuddy,env=production value=85 ${TIMESTAMP}000000000"
```

**Verification**:

1. Push metric and confirm ingestion
2. Query: `service_limit_usage_percentage{service="azure",metric="tpm"}`
3. Wait 5 minutes for alert to fire (UID: azure-tpm-high)
4. Check alert instances and notification status

## Silencing Alerts During Testing

Prevent false positive notifications while testing:

1. **Grafana Cloud** → Alerting → Silences
2. **Create Silence**:
   - Matcher: `service=SERVICENAME`
   - Duration: 1 hour (or custom)
3. **Apply** before pushing test metrics
4. **Remove** after testing complete

Alternative - Edit contact point to disable notifications temporarily.

## Checking Notification Delivery

### Email Notifications

- Check inbox for alert summary
- Expected subject: `[FIRING] MirrorBuddy - {Service} Usage Alert`
- Contains current value, threshold, and dashboard link

### Slack Notifications

- #infrastructure channel (if configured)
- Bot message with alert name, service, severity
- Click link to navigate to alert instance

### Verification in Grafana

- Alerting → Alert instances
- View "Firing Alerts" tab
- Click alert to see notification history

## Troubleshooting

### Metric Not Appearing in Prometheus

**Symptom**: Query returns empty after push

**Solutions**:

1. Wait 60+ seconds (Prometheus scrape interval)
2. Verify TIMESTAMP is in milliseconds (last 9 digits = microseconds):
   - `$(date +%s)000000000` (correct)
   - Not: `$(date +%s%N)` (may cause parse error)
3. Check authorization header:
   - `echo -n 'ORG_ID:API_KEY' | base64` (verify correct format)
4. Verify URL contains correct region code (XX = prod location)

### Alert Not Firing After 5 Minutes

**Symptom**: Metric pushed but alert stays pending

**Solutions**:

1. Verify alert rule is "monitoring" status (not paused)
2. Check "For Duration" setting in rule (should be 5m)
3. Confirm threshold exceeded (85% > 80%, 90% > 85%, etc.)
4. View rule evaluation history:
   - Alert rule → View evaluation history
   - Check last evaluation timestamp and result
5. Check alert rule query freshness:
   - Data source → Test (should succeed)

### Notification Not Received

**Symptom**: Alert fires but no email/Slack message

**Solutions**:

1. Verify contact point is configured:
   - Alerting → Contact points → Check for email/Slack
2. Check notification policy routes:
   - Alerting → Notification policies → Verify routing
3. Test notification:
   - Contact point settings → Test button
4. Review notification history:
   - Alert instance → "Notification history" tab
5. Check spam folder (for email)

### Authorization Failed (401)

**Symptom**: `curl` returns 401 Unauthorized

**Solutions**:

1. Verify credentials format:
   ```bash
   echo -n 'ORG_ID:GRAFANA_CLOUD_API_KEY' | base64
   # Should output: ORkfZEr1QTI6Z3JhZmF0ZXN0Ym90OnBhc3N3b3Jk... (exact encoding)
   ```
2. Confirm ORG_ID matches Grafana Cloud org number (e.g., 742344)
3. Verify API key is valid and not expired
4. Try with full URL path (no redirects):
   - `https://prometheus-prod-39-prod-eu-north-0.grafana.net/api/v1/push/influx/write`

### Test Metric Value Wrong Format

**Symptom**: Metric appears but value shows `NaN` or unexpected number

**Solutions**:

1. Ensure value is numeric: `value=85` (not `value="85"`)
2. Check timestamp format (9 digits after seconds):
   - Seconds: `1674329400` (10 digits)
   - Nanoseconds: `1674329400000000000` (19 digits total)
3. Verify no spaces in tag values (already escaped in template)

## Quick Test Checklist

- [ ] Silence alerts (prevent notifications)
- [ ] Push test metric using procedure above
- [ ] Wait 60s for metric ingestion
- [ ] Verify metric in Prometheus explorer
- [ ] Wait 5m for alert to fire
- [ ] Confirm "Firing" state in Alert instances
- [ ] Check notification delivered (if enabled)
- [ ] Remove silence
- [ ] Document result (working/needs investigation)

---

**Related**: [GRAFANA-ALERTS-SETUP.md](./GRAFANA-ALERTS-SETUP.md) | [SLI-SLO.md](./SLI-SLO.md) | [RUNBOOK.md](./RUNBOOK.md)

**Updated**: 2026-01-21 | **Owner**: Infrastructure Team
