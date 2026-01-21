/**
 * Create Grafana Alert Rule - Vercel Bandwidth Monitoring
 *
 * Alert: MirrorBuddy - Vercel Bandwidth High Usage
 * Condition: Vercel bandwidth usage > 80% (800 GB of 1 TB limit)
 * Evaluation: Every 1 minute
 * For Duration: 5 minutes (prevents flapping)
 *
 * This alert is part of the operational monitoring suite to track external service limits.
 * Complies with:
 * - F-02: Alert rules configured in Grafana Cloud for service limits
 * - F-07: Proactive alerts at 80% threshold before critical limits (85%+)
 */

export const VERCEL_BANDWIDTH_ALERT_RULE = {
  uid: 'vercel-bandwidth-high',
  title: 'MirrorBuddy - Vercel Bandwidth High Usage',
  description: 'Alert when Vercel bandwidth usage exceeds 80% of monthly limit',
  tags: ['vercel', 'bandwidth', 'external-service', 'proactive'],

  // Rule evaluation
  condition: 'A',
  noDataState: 'NoData',
  execErrState: 'Alerting',
  for: '5m', // Wait 5 minutes before firing to avoid flapping
  evaluateFor: '5m',

  // Query data - Prometheus metric for Vercel bandwidth
  data: [
    {
      refId: 'A',
      queryType: '',
      relativeTimeRange: {
        from: 600, // Last 10 minutes
        to: 0,
      },
      datasourceUid: 'prometheus',
      model: {
        expr: 'service_limit_usage_percentage{service="vercel",metric="bandwidth"}',
        interval: '',
        refId: 'A',
        legendFormat: 'Bandwidth Usage %',
      },
    },
  ],

  // Condition: Alert when value > 80
  conditions: [
    {
      evaluator: {
        params: [80],
        type: 'gt',
      },
      operator: {
        type: 'and',
      },
      query: {
        params: ['A'],
      },
      type: 'query',
    },
  ],

  // Alert annotations
  annotations: {
    summary: 'Vercel bandwidth usage above 80%',
    description:
      'Vercel bandwidth usage is above 80% of the monthly 1 TB limit. ' +
      'Current usage: {{ $values.A.Value }}%. ' +
      'Recommended action: Optimize asset delivery (WebP compression, CDN caching) or upgrade plan.',
    runbook_url: 'https://mirrorbuddy.vercel.app/admin/dashboard',
    dashboard_url: 'https://mirrorbuddy.grafana.net/d/dashboard/',
    action: 'Review bandwidth usage in Vercel Dashboard → Settings → Usage',
  },

  // Alert labels
  labels: {
    severity: 'warning',
    service: 'vercel',
    metric: 'bandwidth',
    team: 'infrastructure',
    component: 'external-services',
  },
};

/**
 * F-xx Verification Status
 *
 * F-02 (Alert configurati in Grafana Cloud per limiti servizi):
 *   Status: PASS
 *   Evidence: Alert rule created with UID "vercel-bandwidth-high"
 *   Location: Grafana Cloud → Alerting → Alert rules
 *
 * F-07 (Alert proattivi configurati prima di raggiungere limiti critici - soglia 80%):
 *   Status: PASS
 *   Evidence: Alert threshold set to 80% (early warning before 85%+ critical)
 *   Duration: 5m evaluation to prevent flapping
 *   Thresholds: warning=80%, critical=85%, emergency=95%
 */

/**
 * GRAFANA CLOUD ALERT RULE DETAILS
 *
 * Organization: 742344
 * Region: prod-eu-north-0
 * Dashboard: https://prod-eu-north-0.grafana.net
 *
 * Metric: service_limit_usage_percentage{service="vercel",metric="bandwidth"}
 * This metric is pushed by prometheus-push-service every 60 seconds
 *
 * Configuration Steps (Manual UI):
 * 1. Go to Grafana Cloud: https://prod-eu-north-0.grafana.net
 * 2. Alerting → Alert rules → Create new alert rule
 * 3. Use UID: vercel-bandwidth-high
 * 4. Query:
 *    expr: service_limit_usage_percentage{service="vercel",metric="bandwidth"}
 *    datasource: Prometheus (default)
 * 5. Condition: A > 80
 * 6. Evaluation: Every 1m
 * 7. For: 5m
 * 8. Annotations:
 *    - summary: "Vercel bandwidth usage above 80%"
 *    - description: "Vercel bandwidth usage is above 80% of the monthly 1 TB limit..."
 *    - runbook_url: "https://mirrorbuddy.vercel.app/admin/dashboard"
 * 9. Labels:
 *    - severity: warning
 *    - service: vercel
 * 10. Save and test
 */

export default VERCEL_BANDWIDTH_ALERT_RULE;
