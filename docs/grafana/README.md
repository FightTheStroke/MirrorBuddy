# Grafana Dashboards

This directory contains Grafana dashboard JSON definitions for MirrorBuddy observability.

## Tier Dashboard

**File**: `tier-dashboard.json`

**Purpose**: Monitor subscription tier metrics including user distribution, activity, and tier changes.

### Metrics Tracked

The dashboard visualizes the following Prometheus metrics collected by `src/lib/observability/tier-metrics-collector.ts`:

- **mirrorbuddy_users_by_tier**: Total users by subscription tier
- **mirrorbuddy_active_users_by_tier**: Active users (conversations in last 7 days) by tier
- **mirrorbuddy_tier_upgrades_total**: Cumulative count of tier upgrades
- **mirrorbuddy_tier_downgrades_total**: Cumulative count of tier downgrades

### Panel Overview

| Panel                    | Type                  | Description                                     | Metric                                                                 |
| ------------------------ | --------------------- | ----------------------------------------------- | ---------------------------------------------------------------------- |
| Users by Tier            | Pie Chart             | Distribution of users across subscription tiers | `mirrorbuddy_users_by_tier`                                            |
| Active Users by Tier     | Time Series           | 7-day active user count per tier over time      | `mirrorbuddy_active_users_by_tier`                                     |
| Tier Changes Over Time   | Time Series (Stacked) | Daily rate of upgrades and downgrades           | `mirrorbuddy_tier_upgrades_total`, `mirrorbuddy_tier_downgrades_total` |
| Tier Upgrades (30-day)   | Pie Chart             | Upgrade volume in the last 30 days              | `mirrorbuddy_tier_upgrades_total`                                      |
| Tier Downgrades (30-day) | Pie Chart             | Downgrade volume in the last 30 days            | `mirrorbuddy_tier_downgrades_total`                                    |

### Import to Grafana Cloud

#### Method 1: Via Grafana UI (Recommended)

1. Open your Grafana Cloud instance at `https://yourorg.grafana.net/`
2. Navigate to **Dashboards** → **New** → **Import**
3. Paste the contents of `tier-dashboard.json` into the "Import via JSON" field
4. Select your Prometheus data source when prompted
5. Click **Import**

#### Method 2: Via Grafana CLI

```bash
# Set environment variables
export GRAFANA_URL="https://yourorg.grafana.net"
export GRAFANA_API_KEY="your-api-key"

# Import dashboard
grafana-cli admin import-dashboard ./tier-dashboard.json \
  --url $GRAFANA_URL \
  --apikey $GRAFANA_API_KEY
```

#### Method 3: Programmatic via Grafana API

```bash
curl -X POST "https://yourorg.grafana.net/api/dashboards/db" \
  -H "Authorization: Bearer $GRAFANA_API_KEY" \
  -H "Content-Type: application/json" \
  -d @tier-dashboard.json
```

### Configuration

**Data Source**: The dashboard is configured to use a Prometheus data source named `prometheus`.

If your data source has a different name:

1. Open the imported dashboard in edit mode
2. For each panel, click the panel title → **Edit**
3. In the Query tab, change the data source from `Prometheus` to your data source name
4. Save the dashboard

**Refresh Interval**: Default is 30 seconds. Adjust in dashboard settings:

- Dashboard settings (gear icon) → **Refresh**

**Time Range**: Default is last 7 days. Adjust using the time picker in the top-right corner.

### Tier Metrics Pipeline

Metrics flow through this pipeline:

```
Prisma DB (tier_subscription, tier_audit_log)
    ↓
tier-metrics-collector.ts (collects samples)
    ↓
prometheus-push-service.ts (pushes to Grafana Cloud)
    ↓
Grafana Cloud (Prometheus)
    ↓
This Dashboard (visualizes)
```

### Grafana Cloud Setup

Ensure your `.env` contains:

```bash
GRAFANA_CLOUD_PROMETHEUS_URL=https://prometheus-blocks-prod-us-central1.grafana.net/api/prom/push
GRAFANA_CLOUD_PROMETHEUS_USER=your-instance-id
GRAFANA_CLOUD_API_KEY=your-api-key
```

Test metrics push locally:

```bash
npm run test-grafana-push
# or
npx tsx scripts/test-grafana-push.ts
```

### Troubleshooting

#### Dashboard shows no data

1. **Check metrics are being pushed**:

   ```bash
   curl -X GET "https://yourorg.grafana.net/api/v1/query" \
     -H "Authorization: Bearer $GRAFANA_API_KEY" \
     -d 'query=mirrorbuddy_users_by_tier'
   ```

2. **Verify tier data exists**:

   ```bash
   npx tsx -e "
   import { prisma } from './src/lib/db';
   const users = await prisma.userSubscription.count();
   console.log('Total users with subscriptions:', users);
   await prisma.\$disconnect();
   "
   ```

3. **Check push service logs**:
   - Look for `GRAFANA_CLOUD_PROMETHEUS_URL` in environment
   - Verify no firewall blocks outbound HTTPS to Grafana Cloud

#### Prometheus queries return "No matching series"

1. Confirm metrics exist in Prometheus:
   - In Grafana, click **Explore**
   - Type `mirrorbuddy_` and check autocomplete suggestions

2. Verify tier metrics are enabled:
   - Check `src/lib/observability/prometheus-push-service.ts` includes tier collector
   - Verify `collectTierMetrics()` is called in metrics push cycle

### Further Reading

- **Metrics Collection**: `src/lib/observability/tier-metrics-collector.ts`
- **Metrics Push Service**: `src/lib/observability/prometheus-push-service.ts`
- **Observability ADR**: `docs/adr/0047-grafana-cloud-observability.md`
- **Grafana Cloud Docs**: https://grafana.com/docs/grafana-cloud/

## Per-Locale KPI Dashboard

**File**: `locale-dashboard.json`

**Purpose**: Monitor key performance indicators across different locales/languages (Italian, English, French, German, Spanish).

**Use Case**: Track engagement, adoption, and usage patterns by user language preference to identify regional trends and localization issues.

### Metrics Tracked

The dashboard visualizes the following Prometheus metrics collected by `src/lib/observability/telemetry-metrics-collector.ts`:

- **mirrorbuddy_users_by_locale**: Total users by language locale
- **mirrorbuddy_sessions_by_locale**: Total sessions by locale over time
- **mirrorbuddy_chat_messages_by_locale**: Chat message activity by locale
- **mirrorbuddy_page_views_by_locale**: Page view counts by locale
- **mirrorbuddy_engagement_by_locale**: Engagement activity rate (hourly) by locale
- **mirrorbuddy_feature_usage_by_locale**: Feature adoption distribution by locale

### Panel Overview

| Panel                         | Type              | Description                                           | Metric                                |
| ----------------------------- | ----------------- | ----------------------------------------------------- | ------------------------------------- |
| Users by Locale               | Pie Chart         | Distribution of users across supported locales        | `mirrorbuddy_users_by_locale`         |
| Sessions by Locale (7-day)    | Time Series       | Session count per locale over the last 7 days         | `mirrorbuddy_sessions_by_locale`      |
| Chat Messages by Locale       | Stacked Bar Chart | Daily chat activity aggregated by locale              | `mirrorbuddy_chat_messages_by_locale` |
| Page Views by Locale          | Time Series       | Page view trends per locale                           | `mirrorbuddy_page_views_by_locale`    |
| Engagement Activity by Locale | Time Series       | 1-hour engagement rate per locale                     | `mirrorbuddy_engagement_by_locale`    |
| Feature Usage Distribution    | Stacked Bar Chart | Feature adoption breakdown by locale and feature type | `mirrorbuddy_feature_usage_by_locale` |

### Locale Variable Integration

The dashboard includes a built-in **Locale** template variable allowing users to filter metrics by language:

| Locale      | Code  |
| ----------- | ----- |
| Italian     | `it`  |
| English     | `en`  |
| French      | `fr`  |
| German      | `de`  |
| Spanish     | `es`  |
| All Locales | `All` |

#### Using the Locale Filter

1. Open the dashboard in Grafana
2. Click the **Locale** dropdown at the top
3. Select a specific locale (e.g., `it` for Italian) or `All` for combined metrics
4. All panels automatically update to show filtered data
5. Dashboard URL updates with the variable value (e.g., `?var-locale=it`)

### Locale Metrics Pipeline

Metrics flow through this pipeline:

```
Telemetry Events (TelemetryEvent table)
    ↓
telemetry-metrics-collector.ts (aggregates by locale, 5-min window)
    ↓
prometheus-push-service.ts (pushes to Grafana Cloud)
    ↓
Grafana Cloud (Prometheus)
    ↓
This Dashboard (visualizes by locale)
```

### Metric Collection Requirements

For locale metrics to populate correctly:

1. **Telemetry events must include locale in metadata**:

   ```typescript
   // Example: Recording a telemetry event with locale
   const event = await prisma.telemetryEvent.create({
     data: {
       category: "conversation",
       action: "question_asked",
       sessionId: session.id,
       userId: user.id,
       metadata: JSON.stringify({
         locale: user.locale || "unknown", // Must include locale
         feature: "chat",
         duration_ms: 1234,
       }),
     },
   });
   ```

2. **Telemetry metrics collector must run**:
   - Configured in `prometheus-push-service.ts`
   - Called every 60 seconds by default
   - Aggregates events from the last 5 minutes

3. **Environment variables must be set**:
   ```bash
   GRAFANA_CLOUD_PROMETHEUS_URL=https://...
   GRAFANA_CLOUD_PROMETHEUS_USER=your-user-id
   GRAFANA_CLOUD_API_KEY=your-grafana-cloud-key
   ```

### Import to Grafana Cloud

#### Method 1: Via Grafana UI (Recommended)

1. Open your Grafana Cloud instance at `https://yourorg.grafana.net/`
2. Navigate to **Dashboards** → **New** → **Import**
3. Paste the contents of `locale-dashboard.json` into the "Import via JSON" field
4. Select your Prometheus data source when prompted
5. Click **Import**

#### Method 2: Via Grafana API

```bash
curl -X POST "https://yourorg.grafana.net/api/dashboards/db" \
  -H "Authorization: Bearer $GRAFANA_API_KEY" \
  -H "Content-Type: application/json" \
  -d @locale-dashboard.json
```

### Configuration

**Data Source**: Uses Prometheus data source named `prometheus`.

**Refresh Interval**: Default 30 seconds (adjust in dashboard settings)

**Time Range**: Default last 7 days

### Troubleshooting

#### Dashboard shows no data

1. **Verify telemetry collection is enabled**:

   ```typescript
   // Check if telemetry events are being recorded
   npx tsx -e "
   import { prisma } from './src/lib/db';
   const count = await prisma.telemetryEvent.count();
   console.log('Total telemetry events:', count);
   const localeEvents = await prisma.telemetryEvent.findMany({
     where: { metadata: { not: null } },
     select: { metadata: true },
     take: 5,
   });
   console.log('Sample events with metadata:', localeEvents);
   await prisma.\$disconnect();
   "
   ```

2. **Check metrics are being pushed**:

   ```bash
   npm run test-grafana-push
   ```

3. **Verify Grafana environment variables**:
   - Confirm `.env` contains `GRAFANA_CLOUD_PROMETHEUS_URL` and `GRAFANA_CLOUD_API_KEY`
   - Check logs for push errors

#### Metrics show as "No matching series"

1. In Grafana **Explore** tab, verify metrics exist:
   - Type `mirrorbuddy_` and check autocomplete
   - Try query: `mirrorbuddy_users_by_locale` (should return results if data exists)

2. Check metric collection is running:
   - Verify `src/lib/observability/telemetry-metrics-collector.ts` exports `collectTelemetryMetrics()`
   - Ensure it's called in `prometheus-push-service.ts`

#### Locale variable not filtering data

1. Verify all panel queries include the locale filter:

   ```promql
   mirrorbuddy_sessions_by_locale{locale=~"$locale"}
   ```

2. For "All" option, use regex to match all locales:
   ```promql
   mirrorbuddy_users_by_locale{locale=~"it|en|fr|de|es"}
   ```

### Further Reading

- **Telemetry Collection**: `src/lib/observability/telemetry-metrics-collector.ts`
- **Metrics Push Service**: `src/lib/observability/prometheus-push-service.ts`
- **Telemetry ADR**: `docs/adr/0006-telemetry-system.md`
- **Observability ADR**: `docs/adr/0047-grafana-cloud-observability.md`
- **Dashboard Variables**: `VARIABLES.md`

## Dashboard Variables

**File**: `VARIABLES.md`

**Purpose**: Dynamic filtering of dashboard metrics using template variables.

MirrorBuddy dashboards support variable-based filtering to enable interactive analysis. Key variables include:

- **$locale** - Filter metrics by user language/locale (it, en, fr, de, es, or All)

For complete setup instructions and examples, see `VARIABLES.md`.

### Quick Import

To add the locale variable to an existing dashboard:

1. Use the template in `locale-variable-template.json`
2. Follow instructions in `VARIABLES.md` → "Programmatic Import"
3. Update dashboard panel queries to use `$locale` in Prometheus expressions

Example query:

```promql
mirrorbuddy_chats_by_locale{locale=~"$locale"}
```

## Related Dashboards

- Dashboard for Web Vitals: See `docs/operations/grafana-web-vitals.md`
- Dashboard for Session Health: See `docs/adr/0047-grafana-cloud-observability.md`
