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
  -H "Authorization: Bearer YOUR_API_KEY" \
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
     -H "Authorization: Bearer YOUR_API_KEY" \
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

## Related Dashboards

- Dashboard for Web Vitals: See `docs/operations/grafana-web-vitals.md`
- Dashboard for Session Health: See `docs/adr/0047-grafana-cloud-observability.md`
