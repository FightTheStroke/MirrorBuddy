# Grafana Web Vitals Dashboard

## Overview

The **Client Performance** dashboard provides real-time monitoring of Core Web Vitals metrics, enabling data-driven optimization of user experience.

**Dashboard Location**: `src/lib/observability/grafana-dashboards/web-vitals-dashboard.json`

## Quick Import

### Option 1: Grafana Cloud UI

1. Navigate to your Grafana Cloud instance
2. Go to **Dashboards** → **Import**
3. Copy-paste the contents of `web-vitals-dashboard.json`
4. Select your Prometheus data source
5. Click **Import**

### Option 2: Grafana API

```bash
GRAFANA_URL="https://mirrorbuddy.grafana.net"
GRAFANA_API_KEY="your-api-key"
DASHBOARD_JSON="src/lib/observability/grafana-dashboards/web-vitals-dashboard.json"

curl -X POST "${GRAFANA_URL}/api/dashboards/db" \
  -H "Authorization: Bearer ${GRAFANA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @"${DASHBOARD_JSON}"
```

## Dashboard Panels

### 1. LCP P75 by Route (Largest Contentful Paint)

**What it measures**: Time until the largest content element becomes visible

**PromQL Query**:
```promql
histogram_quantile(0.75, sum by(route, le) (rate(web_vitals_lcp_seconds_bucket[$__rate_interval])))
```

**Thresholds**:
- **Green** (Good): < 2.5s
- **Yellow** (Needs Improvement): 2.5s - 4s
- **Red** (Poor): > 4s

**Interpretation**:
- High LCP → Users wait too long for main content
- Route breakdown identifies slow pages
- Target: 75% of users see content in < 2.5s

### 2. CLS P75 by Route (Cumulative Layout Shift)

**What it measures**: Visual stability (unexpected layout shifts)

**PromQL Query**:
```promql
histogram_quantile(0.75, sum by(route, le) (rate(web_vitals_cls_score_bucket[$__rate_interval])))
```

**Thresholds**:
- **Green** (Good): < 0.1
- **Yellow** (Needs Improvement): 0.1 - 0.25
- **Red** (Poor): > 0.25

**Interpretation**:
- High CLS → Page elements jump around unexpectedly
- Common causes: images without dimensions, late-loading fonts
- Target: < 0.1 for 75% of users

### 3. INP P75 by Route (Interaction to Next Paint)

**What it measures**: Responsiveness to user interactions (clicks, taps)

**PromQL Query**:
```promql
histogram_quantile(0.75, sum by(route, le) (rate(web_vitals_inp_seconds_bucket[$__rate_interval])))
```

**Thresholds**:
- **Green** (Good): < 200ms
- **Yellow** (Needs Improvement): 200ms - 500ms
- **Red** (Poor): > 500ms

**Interpretation**:
- High INP → UI feels sluggish, unresponsive
- Indicates JavaScript blocking main thread
- Target: < 200ms for 75% of interactions

### 4. FCP P75 by Route (First Contentful Paint)

**What it measures**: Time until ANY content becomes visible

**PromQL Query**:
```promql
histogram_quantile(0.75, sum by(route, le) (rate(web_vitals_fcp_seconds_bucket[$__rate_interval])))
```

**Thresholds**:
- **Green** (Good): < 1.8s
- **Yellow** (Needs Improvement): 1.8s - 3s
- **Red** (Poor): > 3s

**Interpretation**:
- High FCP → Page appears blank for too long
- First impression of speed
- Target: < 1.8s for 75% of users

### 5. TTFB P75 by Route (Time to First Byte)

**What it measures**: Server response time

**PromQL Query**:
```promql
histogram_quantile(0.75, sum by(route, le) (rate(web_vitals_ttfb_seconds_bucket[$__rate_interval])))
```

**Thresholds**:
- **Green** (Good): < 800ms
- **Yellow** (Needs Improvement): 800ms - 1.8s
- **Red** (Poor): > 1.8s

**Interpretation**:
- High TTFB → Server/network issues, slow API calls
- Indicates backend optimization opportunities
- Target: < 800ms for 75% of requests

### 6. Performance by Device Type

**What it measures**: Distribution of good/needs-improvement/poor ratings across devices

**PromQL Query**:
```promql
sum by(device_type, rating) (rate(web_vitals_lcp_seconds_count[$__rate_interval]))
```

**Interpretation**:
- Identifies which devices struggle most
- Mobile often has worse performance (slower CPU, network)
- Use to prioritize optimization (if 60% mobile users, optimize mobile first)

### 7. Poor Performance Heatmap by Hour

**What it measures**: When users experience poor performance (LCP rating = "poor")

**PromQL Query**:
```promql
sum by(hour) (increase(web_vitals_lcp_seconds_count{rating="poor"}[1h]))
```

**Interpretation**:
- Identifies peak problem times (e.g., heavy traffic hours)
- Correlate with server load, deployments, external API issues
- Use for capacity planning and incident investigation

## Dashboard Variables

### `$route` (Multi-select)

Filter panels by specific routes (e.g., `/chat`, `/learn`, `/dashboard`)

**Usage**: Drill down into specific pages

### `$device_type` (Multi-select)

Filter by device type (mobile, tablet, desktop)

**Usage**: Compare performance across devices

## Alert Configuration

Pre-configured alert rules in `src/lib/observability/grafana-dashboards/web-vitals-alerts.json`:

**LCP**: Warning > 2.5s | Critical > 4s
**CLS**: Warning > 0.1 | Critical > 0.25
**INP**: Warning > 200ms | Critical > 500ms

All: 1m evaluation, 5m hold, labels (severity/metric), annotations (summary/description/runbook_url)

**Import via Grafana API**:
```bash
curl -X POST "https://mirrorbuddy.grafana.net/api/v1/rules" \
  -H "Authorization: Bearer ${GRAFANA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @"src/lib/observability/grafana-dashboards/web-vitals-alerts.json"
```

## Troubleshooting

### No Data Showing

1. **Check metrics are being pushed**:
   ```bash
   # Verify web vitals API is receiving data
   curl -s http://localhost:3000/api/health/detailed | jq '.dependencies.webVitals'
   ```

2. **Check Grafana Cloud config**:
   ```bash
   # Ensure env vars are set
   echo $GRAFANA_CLOUD_PROMETHEUS_URL
   echo $GRAFANA_CLOUD_PROMETHEUS_USER
   echo $GRAFANA_CLOUD_API_KEY
   ```

3. **Verify metrics in Grafana Explore**:
   ```promql
   web_vitals_lcp_seconds_count
   ```
   If this returns nothing, metrics aren't reaching Grafana Cloud

### Queries Return Empty

- **Time range too narrow**: Extend to 24h (web vitals sent from client)
- **No traffic**: Generate test traffic with browser
- **Label mismatch**: Check `route` label matches actual routes

## Retention Policy (90 Days for Aggregated Metrics)

Grafana Cloud retention is configured to balance data availability with privacy compliance and cost efficiency.

### Overview

| Metric Category | Retention | Compliance | Purpose |
|-----------------|-----------|-----------|---------|
| **Aggregated Metrics** | 90 days | Non-PII, privacy-safe | Trend analysis, SLI/SLO tracking, quarterly reviews |
| **User ID Tagged** | 30 days | PII handling | Privacy-by-design, GDPR compliance |
| **Safety Incidents** | 365 days | Legal hold | Audit trail, incident investigation |

### Configuration Details

#### Aggregated Metrics (90 days)

Web Vitals and performance metrics without user identification:

```promql
web_vitals_lcp_seconds
web_vitals_cls_score
web_vitals_inp_seconds
web_vitals_fcp_seconds
web_vitals_ttfb_seconds
session_duration_seconds
error_rate
api_latency_seconds
database_latency_seconds
```

**Rationale**: 90 days provides sufficient history for:
- Monthly performance trend detection
- Quarterly SLI/SLO compliance reports
- Capacity planning and release impact analysis
- Without retaining excessive non-essential data

#### User ID Tagged Metrics (30 days)

Metrics with user identifiers are retained only 30 days:

```promql
user_session_duration{user_id="..."}
user_error_count{user_id="..."}
user_api_calls{user_id="..."}
user_feature_usage{user_id="..."}
```

**Privacy Approach**:
- Keep detailed user metrics for 30 days (debug recent issues)
- After 30 days: aggregate to anonymous summaries OR drop
- Compliant with GDPR "right to be forgotten"
- No personal information (names, emails) anywhere in metrics

**Implementation**: Remove `user_id` label from all metrics pushed to Grafana Cloud via `prometheus-push-service.ts`. If user-level debugging needed, use logs (separate 7-day retention) instead of metrics.

#### Safety Incident Metrics (365 days)

Safety-critical metrics retained for annual audits:

```promql
safety_incident_count
safety_refusal_count
safety_jailbreak_blocked
safety_incident_severity
```

**Rationale**:
- Legal hold for compliance audits
- No user_id in safety logs (use session_id if correlation needed)
- Incident descriptions sanitized of PII before logging

### How to Configure in Grafana Cloud

1. **Log in** to https://mirrorbuddy.grafana.net
2. **Navigate** to Connections → Data Sources → Prometheus (primary)
3. **Edit data source** → Look for **Retention** or **Advanced** tab
4. **Set metric-specific retention** (availability depends on plan tier):
   - Aggregated metrics: 90 days
   - User ID metrics: 30 days
   - Safety incidents: 365 days
5. **Apply** and verify in Grafana Explore that old metrics expire correctly

**Note**: Grafana Cloud Pro/Enterprise plans support metric-level retention rules. Free tier may not support this feature. Check plan details in your Grafana Cloud account.

### Verification

After configuring retention, verify it's working:

```bash
# In Grafana Explore, run this query with different time ranges:
# Should return data for last 90 days, empty before that
web_vitals_lcp_seconds{job="mirrorbuddy"}

# User ID metrics should only show last 30 days
user_session_duration

# Safety metrics should show full year
safety_incident_count
```

### Privacy & Compliance

**GDPR Compliance**:
- User-identified data (30 days) satisfies "right to be forgotten"
- Non-PII aggregates (90 days) require no deletion action
- Safety incidents (1 year) necessary for legal compliance

**CCPA (California)**:
- Metrics contain no personal information (no names, emails, addresses)
- User_id dropped before retention expiration
- Data minimization principle followed

**Data Minimization**:
- Only essential metrics retained
- No user behavior profiles
- No marketing/tracking data
- Server-side aggregation preferred over user-level detail

### Configuration Reference

Complete retention settings documented in:
`src/lib/observability/grafana-dashboards/retention-config.json`

## Related Documentation

- [ADR 0047: Grafana Cloud Observability](../adr/0047-grafana-cloud-observability.md)
- [RUNBOOK.md](./RUNBOOK.md) - Grafana Cloud setup
- [SLI-SLO.md](./SLI-SLO.md) - Performance SLOs
- [Web Vitals Collector](../../src/lib/analytics/web-vitals-collector.ts) - Client-side implementation

## Performance Budget (F-06)

| Metric | P75 Target | Enforcement |
|--------|------------|-------------|
| LCP | < 2.5s | Alert if > 4s |
| CLS | < 0.1 | Alert if > 0.25 |
| INP | < 200ms | Alert if > 500ms |
| FCP | < 1.8s | Alert if > 3s |
| TTFB | < 800ms | Alert if > 1.8s |

---

*Version 1.0 | January 2026 | F-06 Implementation*
