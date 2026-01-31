# Release Grafana Verification - MirrorBuddy

Grafana Cloud locale metrics verification during release.

---

## 4.1 Access Grafana Dashboard

1. Navigate to: https://mirrorbuddy.grafana.net/d/dashboard/
2. Log in with admin credentials
3. Dashboard loads without errors

**Validates**:

- [ ] Grafana Cloud is accessible
- [ ] MirrorBuddy dashboard renders
- [ ] No 404 or permission errors

---

## 4.2 Verify Locale Metrics

In Grafana, check that all 5 locales have metrics being collected:

**Locales to verify**: `it`, `en`, `fr`, `de`, `es`

### Metrics Overview

Look for dashboard panels showing:

- **Active Users by Locale**: Pie chart or time series
  - [ ] Shows all 5 locales
  - [ ] At least one locale has active users (or > 0 traffic)

- **Session Count by Locale**: Time series or gauge
  - [ ] All locales tracked
  - [ ] Ascending order: it > en > fr > de > es (typical)

- **Chat Messages by Locale**: Time series
  - [ ] All 5 locales showing data points
  - [ ] No missing data for active locales

- **Voice Minutes by Locale**: Time series or stacked bar
  - [ ] All 5 locales tracked
  - [ ] Shows usage across languages

- **Feature Usage by Locale**: Breakdown
  - [ ] Shows which features popular in each locale
  - [ ] Examples: flashcards, mindmap, quiz, etc.

### Quality Metrics

- **Error Rate by Locale**: Should be near 0%
  - [ ] it < 0.1%
  - [ ] en < 0.1%
  - [ ] fr < 0.1%
  - [ ] de < 0.1%
  - [ ] es < 0.1%

- **Average Response Time by Locale**: Should be <1000ms
  - [ ] it < 800ms
  - [ ] en < 800ms
  - [ ] fr < 800ms
  - [ ] de < 800ms
  - [ ] es < 800ms

---

## 4.3 Verify Locale Variable Template

Check that Grafana dashboard filters work correctly:

1. Top of dashboard: Find "Locale" dropdown variable
2. Click dropdown
   - [ ] All 5 options appear: `it`, `en`, `fr`, `de`, `es`
3. Select each locale individually
   - [ ] Dashboard filters correctly
   - [ ] Charts update to show only selected locale
   - [ ] Metrics are non-zero for that locale

**Location**: `docs/grafana/locale-variable-template.json` contains configuration.

---

## 4.4 Troubleshooting

### No Metrics Visible

**Cause**: App not pushing metrics or Grafana ingestion delay

**Solution**:

1. Verify app is running with metrics enabled
2. Run local test: `npx tsx scripts/test-grafana-push.ts`
3. Check environment: `echo $GRAFANA_CLOUD_PROMETHEUS_URL`
4. Wait 5 minutes for Grafana to ingest new metrics
5. Hard refresh dashboard (Cmd+Shift+R)

### Locale Dropdown Missing or Empty

**Cause**: Variable template not loaded or misconfigured

**Solution**:

1. Check Grafana data source: Settings > Data Sources > Prometheus
2. Verify connection to `GRAFANA_CLOUD_PROMETHEUS_URL`
3. Reimport locale variable template from `docs/grafana/locale-variable-template.json`
4. Reload dashboard

### Inconsistent Locale Counts

**Cause**: Not all services reporting locale data

**Solution**:

1. Verify all services are running (app, background jobs)
2. Check cron jobs in Vercel: `docs/operations/CRON-JOBS.md`
3. Ensure metrics collection middleware is enabled in app
4. Wait for next metrics push cycle (typically 5 minutes)

---

## Summary Checklist

- [ ] Grafana Dashboard accessible
- [ ] All 5 locales (it, en, fr, de, es) showing metrics
- [ ] Active users/sessions/messages visible for all locales
- [ ] Error rates < 0.1% per locale
- [ ] Response times < 1000ms per locale
- [ ] Locale variable dropdown works
- [ ] Feature usage breakdown visible by locale

---

**Version**: 1.0.0 (2026-01-25)
