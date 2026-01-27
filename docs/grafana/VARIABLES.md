# Grafana Dashboard Variables

This document describes how to configure dashboard variables in Grafana for dynamic filtering across MirrorBuddy dashboards.

## Locale Variable ($locale)

**Purpose**: Filter dashboard metrics and data by user locale/language.

### Configuration

The locale variable is a **Custom type** variable that allows users to select from available language locales or view all locales combined.

#### Quick Setup (Grafana UI)

1. Open your dashboard in **Edit** mode
2. Navigate to **Dashboard settings** (gear icon)
3. Select **Variables**
4. Click **Create variable**
5. Fill in the following:

| Field | Value |
|-------|-------|
| **Name** | `locale` |
| **Type** | Custom |
| **Custom options** | `it,en,fr,de,es,All` |
| **Default value** | `All` |
| **Multi-value** | Off |
| **Include All option** | On |

6. Click **Create**
7. **Save** the dashboard (Ctrl+S or Cmd+S)

### Locale Values

| Locale | Description |
|--------|-------------|
| `it` | Italian |
| `en` | English |
| `fr` | French |
| `de` | German |
| `es` | Spanish |
| `All` | All locales combined |

### Using the Variable in Queries

Once the variable is created, reference it in your Prometheus queries using `$locale` or `${locale}`.

#### Example 1: Filter by locale label

```promql
mirrorbuddy_chats_by_locale{locale=~"$locale"}
```

#### Example 2: Use in range queries

```promql
rate(mirrorbuddy_api_requests_total{locale="$locale"}[5m])
```

#### Example 3: Handle "All" value

When `$locale = "All"`, use regex to match all values:

```promql
mirrorbuddy_users_by_locale{locale=~"it|en|fr|de|es"}
```

**Better approach** (recommended): Update your metric collection to tag with `locale="all"` when aggregating across all locales, then use:

```promql
mirrorbuddy_users_by_locale{locale=~"$locale"}
```

### Programmatic Import

To import the locale variable JSON template:

1. **Via Grafana Dashboard JSON**:
   - Download `locale-variable-template.json`
   - Open your dashboard in edit mode
   - Go to **Dashboard settings** → **JSON Model**
   - Find the `"templating"` section
   - Copy the variable object from the template
   - Paste it into your dashboard's `templating.list` array
   - Save the dashboard

2. **Via Grafana API**:

```bash
# Get dashboard
curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
  "https://yourorg.grafana.net/api/dashboards/uid/{dashboard-uid}" \
  > dashboard.json

# Edit dashboard.json to add variable from locale-variable-template.json

# Update dashboard
curl -X POST "https://yourorg.grafana.net/api/dashboards/db" \
  -H "Authorization: Bearer $GRAFANA_API_KEY" \
  -H "Content-Type: application/json" \
  -d @dashboard.json
```

### Complete Dashboard Example

See `locale-variable-template.json` for a complete working variable definition that can be added to any dashboard.

### Metric Collection Requirements

For the locale variable to work effectively, your metrics must include a `locale` label:

```typescript
// Example: Prometheus metric with locale label
const localeHistogram = new Histogram({
  name: 'mirrorbuddy_api_requests_total',
  help: 'Total API requests by locale',
  labelNames: ['locale', 'endpoint', 'method', 'status'],
});

// Record metric with locale
localeHistogram.labels(userLocale, '/api/chat', 'POST', '200').inc();
```

### Dashboard Refresh Behavior

When users change the `$locale` variable:

1. All panels with `locale=~"$locale"` queries automatically re-execute
2. Grafana sends new requests to Prometheus
3. Panels update to show filtered data for the selected locale
4. Variable value persists in the dashboard URL (e.g., `?var-locale=it`)

### Troubleshooting

#### Variable not appearing in dashboard

- Ensure the variable is created in **Dashboard settings** → **Variables**
- Confirm the variable name is exactly `locale` (case-sensitive)
- Refresh the dashboard page

#### Metrics show no data after selecting locale

1. Verify metrics are tagged with the correct locale labels
2. Check that `$locale` value matches metric label values exactly
3. Ensure metrics are being collected and pushed to Prometheus
4. In Grafana **Explore**, test the query manually:
   ```promql
   mirrorbuddy_chats_by_locale{locale="it"}
   ```

#### "All" value not working in queries

- Use `{locale=~"it|en|fr|de|es"}` regex instead of a single "All" label
- OR ensure your metrics have a special `locale="all"` label for aggregated data
- Consider using `ignore` modifiers to handle missing labels

### Related Documentation

- **Grafana Variables Guide**: https://grafana.com/docs/grafana/latest/dashboards/variables/
- **Prometheus Label Matching**: https://prometheus.io/docs/prometheus/latest/querying/basics/#instant-vector-selectors
- **Tier Dashboard**: `tier-dashboard.json` (example dashboard with static data)
- **Observability ADR**: `docs/adr/0047-grafana-cloud-observability.md`

### Next Steps

1. Define metrics with `locale` labels in your observability collectors
2. Import `locale-variable-template.json` into your dashboards
3. Update all dashboard panels to use `$locale` in their Prometheus queries
4. Test with each locale value and the "All" option
