# Locale Metrics Dashboard - Import Guide

## Overview

The Locale Metrics Dashboard (`locale-metrics.json`) provides comprehensive monitoring of i18n multi-language features in MirrorBuddy, including:

- **Locale Distribution**: Pie chart showing user distribution across locales
- **Language Switching Events**: Time series tracking language preference changes
- **Error Rates per Locale**: Error percentage breakdown by locale
- **Active Sessions**: Current user sessions by language
- **Routing Latency**: p95 latency for locale detection and routing
- **User Preferences**: Table of user locale preferences
- **Translation Cache Hit Rate**: Cache effectiveness monitoring
- **Locale Detection Success Rate**: Reliability of automatic locale detection
- **Missing Translations**: Count of untranslated strings per locale
- **Maestri Selection**: Usage of locale-specific professors

## Prerequisites

1. **Grafana Cloud Account**: Dashboard is configured for Grafana Cloud
2. **Prometheus Data Source**: Must have Prometheus data source configured in Grafana
3. **Metrics Collection**: Application must be pushing locale metrics via `src/lib/observability/prometheus-push-service.ts`
4. **Metric Names**: Application must emit the following metrics:
   - `locale_sessions_total`
   - `locale_switches_total`
   - `locale_errors_total`
   - `locale_requests_total`
   - `locale_active_sessions`
   - `locale_routing_duration_seconds_bucket` (histogram)
   - `locale_user_preferences`
   - `locale_translation_cache_hits_total`
   - `locale_translation_cache_misses_total`
   - `locale_detection_successful_total`
   - `locale_detection_attempts_total`
   - `locale_missing_translations_total`
   - `locale_maestri_selections_total`

## Import Methods

### Method 1: Via Grafana Cloud UI (Recommended)

1. **Navigate to Dashboards**
   - Go to https://mirrorbuddy.grafana.net/
   - Click "Dashboards" in the left sidebar
   - Click "+ New" → "Import"

2. **Upload JSON**
   - Click "Upload JSON file"
   - Select `locale-metrics.json`
   - Grafana will preview the dashboard configuration

3. **Configure Import Settings**
   - **Folder**: Choose or create "Locale" folder
   - **Unique Identifier**: Leave as `locale-metrics-i18n-v1` (auto-generated if conflict)
   - **Data Source**: Select your Prometheus data source
   - Click "Import"

4. **Verify Dashboard**
   - Confirm dashboard loads without errors
   - Check that all panels populate with data
   - Verify locale variable selector works

### Method 2: Via API

```bash
# Set your Grafana Cloud details
GRAFANA_URL="https://mirrorbuddy.grafana.net"
API_KEY="your-grafana-api-key"
DASHBOARD_JSON=$(cat monitoring/dashboards/locale-metrics.json)

# Import dashboard
curl -X POST \
  "${GRAFANA_URL}/api/dashboards/db" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"dashboard\": ${DASHBOARD_JSON},
    \"overwrite\": true
  }"
```

### Method 3: Via Terraform (Infrastructure as Code)

```hcl
# In your Terraform configuration
resource "grafana_dashboard" "locale_metrics" {
  config_json = file("${path.module}/monitoring/dashboards/locale-metrics.json")
  folder      = grafana_folder.monitoring.id
  overwrite   = true
}
```

## Configuration

### Variables

The dashboard includes a `locale` variable with these features:

- **Type**: Query-based (dynamic from metrics)
- **Multi-select**: Enable to compare multiple locales
- **All** option: Monitor all locales simultaneously
- **Regex support**: Filter by locale patterns (e.g., `en.*` for English variants)

### Time Range

Default: **Last 24 hours** (configurable via dashboard UI)

- Click the time range selector in the top-right
- Options: 5m, 15m, 1h, 6h, 12h, 24h, 7d, 30d
- Or specify custom range

### Auto-Refresh

Default: **30 seconds**

- Change via refresh icon in top toolbar
- Options: 10s, 30s, 1m, 5m, 15m, 30m, 1h
- Disable auto-refresh for static viewing

## Metrics Collection Setup

### 1. Implement Locale Metrics Collector

Create `src/lib/observability/locale-metrics-collector.ts`:

```typescript
import type { MetricSample } from "./http-metrics-collector";

export function collectLocaleMetrics(): MetricSample[] {
  const metrics: MetricSample[] = [];

  // Example: Collect from your application state
  const localeStats = getLocaleStatistics(); // Your impl

  localeStats.forEach((stat) => {
    metrics.push({
      name: "locale_sessions_total",
      value: stat.totalSessions,
      tags: { locale: stat.locale, instance: "mirrorbuddy" },
    });
    metrics.push({
      name: "locale_errors_total",
      value: stat.totalErrors,
      tags: { locale: stat.locale, instance: "mirrorbuddy" },
    });
    // Add more metrics...
  });

  return metrics;
}
```

### 2. Register in Prometheus Push Service

Update `src/lib/observability/prometheus-push-service.ts`:

```typescript
import { collectLocaleMetrics } from "./locale-metrics-collector";

// In the push loop:
const localeMetrics = collectLocaleMetrics();
samples.push(...localeMetrics);
```

### 3. Test Metrics Collection

```bash
# In local development
curl http://localhost:3000/api/metrics | grep locale_

# Should see output like:
# locale_sessions_total{locale="it"} 245
# locale_sessions_total{locale="en"} 189
# ...
```

## Troubleshooting

### No data appears in panels

**Cause**: Metrics not being collected or pushed

**Solution**:

1. Verify metrics are emitted: `curl http://localhost:3000/api/metrics | grep locale_`
2. Check Grafana Cloud credentials in `.env`
3. Verify Prometheus data source is connected
4. Check browser console for JavaScript errors

### "No data" in variable dropdown

**Cause**: Prometheus query for variable returning no results

**Solution**:

1. Manually query Prometheus: `label_values(locale_sessions_total{instance="mirrorbuddy"}, locale)`
2. Ensure at least one metric has been recorded
3. Wait 30+ seconds for metrics to appear (default push interval is 60s)

### Dashboard loads but panels show "Unknown datasource"

**Cause**: Data source name doesn't match

**Solution**:

1. In dashboard settings (gear icon)
2. Go to "Datasources"
3. Click on each unknown data source
4. Select the correct Prometheus data source
5. Click "Update"

### Panels show "No data returned"

**Cause**: Metrics have been collected but query is too restrictive or time range is wrong

**Solution**:

1. Check time range (top-right selector)
2. Adjust locale filter (variable selector)
3. Verify metric names match exactly (case-sensitive)
4. Check Prometheus for the metric using the query directly

## Customization

### Add new panels

1. Click "Add panel" (top-right)
2. Select data source (Prometheus)
3. Write metric query
4. Configure visualization options
5. Click "Apply"

### Change panel colors/thresholds

1. Click panel title → "Edit"
2. Go to "Field Config" tab
3. Adjust thresholds, colors, units
4. Click "Apply"

### Create alerts

1. Click panel title → "Edit"
2. Go to "Alert rules" tab
3. Define alert conditions
4. Set notification channel
5. Click "Create alert"

## Performance Considerations

- Dashboard queries ~10 metrics with 5-minute aggregation window
- Default refresh: 30 seconds (configurable)
- Recommended Prometheus retention: 15 days minimum for trend analysis
- With 5+ locales, panels will query ~50-100 time series

## Support

- **Grafana Docs**: https://grafana.com/docs/
- **Prometheus Queries**: https://prometheus.io/docs/prometheus/latest/querying/basics/
- **MirrorBuddy Operations**: See `docs/operations/RUNBOOK.md`
