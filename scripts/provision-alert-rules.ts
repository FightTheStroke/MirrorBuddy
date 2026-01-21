#!/usr/bin/env npx tsx
/**
 * Provision Grafana Alert Rules for MirrorBuddy
 *
 * Task: T6-03 (Wave W6-GrafanaAlerts)
 * F-xx: F-02, F-04, F-18
 *
 * Usage:
 *   GRAFANA_URL=https://mirrorbuddy.grafana.net \
 *   GRAFANA_API_KEY=glc_xxxx \
 *   npx tsx scripts/provision-alert-rules.ts
 *
 * Required Environment Variables:
 *   - GRAFANA_URL: Grafana Cloud instance URL
 *   - GRAFANA_API_KEY: API token with 'alerts:write' scope
 *
 * Setup:
 *   1. Go to Grafana Cloud > Administration > API keys
 *   2. Create new key with scope: alerts:write, rules:read, rules:write
 *   3. Set environment variables
 *   4. Run this script
 */

import fetch from 'node-fetch';

interface AlertRuleConfig {
  uid: string;
  title: string;
  condition: string;
  data: Array<{
    refId: string;
    queryType: string;
    model: {
      expr: string;
      interval: string;
      refId: string;
    };
    datasourceUid: string;
    relativeTimeRange: {
      from: number;
      to: number;
    };
  }>;
  noDataState: string;
  execErrState: string;
  for: string;
  annotations: {
    summary: string;
    description: string;
    runbook_url: string;
    dashboard_uid: string;
  };
  labels: {
    severity: string;
    service: string;
    team: string;
    frequency: string;
  };
}

const GRAFANA_URL = process.env.GRAFANA_URL || 'https://mirrorbuddy.grafana.net';
const GRAFANA_API_KEY = process.env.GRAFANA_API_KEY;

if (!GRAFANA_API_KEY) {
  console.error('❌ Error: GRAFANA_API_KEY environment variable not set');
  console.error('Setup instructions:');
  console.error('  1. Go to Grafana Cloud > Administration > API keys');
  console.error('  2. Create new key with scope: alerts:write, rules:read, rules:write');
  console.error('  3. Set environment variable: export GRAFANA_API_KEY=<your-key>');
  process.exit(1);
}

/**
 * Alert Rule: Resend Email Quota High Usage
 *
 * Configuration:
 * - Metric: service_limit_usage_percentage{service="resend",metric="emails_month"}
 * - Threshold: > 85%
 * - Evaluation: 1 hour (monthly metric, hourly checks sufficient)
 * - Fire duration: 1 hour (wait before firing)
 * - Severity: critical
 *
 * Context:
 * - Free tier limit: 3000 emails/month
 * - Alert at 85%: 2550 emails (450 buffer)
 * - Upgrade recommendation: Paid tier ($20/mo) = 50K/month
 */
const ALERT_RULES: AlertRuleConfig[] = [
  {
    uid: 'alert-resend-email-quota-high',
    title: 'MirrorBuddy - Resend Email Quota High Usage',
    condition: 'A',
    data: [
      {
        refId: 'A',
        queryType: '',
        model: {
          expr: 'service_limit_usage_percentage{service="resend",metric="emails_month"} > 85',
          interval: '',
          refId: 'A',
        },
        datasourceUid: 'prometheus',
        relativeTimeRange: {
          from: 600,
          to: 0,
        },
      },
    ],
    noDataState: 'NoData',
    execErrState: 'Alerting',
    for: '1h',
    annotations: {
      summary: 'Resend monthly email quota above 85%',
      description:
        'Current usage: {{ $values.A.Value }}%. Free tier limit: 3000/month. Action: Upgrade to Paid ($20/mo) for 50K/month capacity.',
      runbook_url: 'https://mirrorbuddy.grafana.net/d/dashboard/?tab=alert',
      dashboard_uid: 'dashboard',
    },
    labels: {
      severity: 'critical',
      service: 'resend',
      team: 'platform',
      frequency: 'monthly',
    },
  },
];

async function createAlertRule(rule: AlertRuleConfig): Promise<void> {
  const endpoint = `${GRAFANA_URL}/api/v1/provisioning/alert-rules`;

  try {
    console.log(`📍 Creating alert rule: ${rule.title}...`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GRAFANA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rule),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `HTTP ${response.status}: ${errorText || response.statusText}`
      );
    }

    const data = (await response.json()) as any;
    console.log(`✅ Alert rule created successfully!`);
    console.log(`   UID: ${data.uid || rule.uid}`);
    console.log(`   Title: ${data.title || rule.title}`);
    console.log(`   Condition: ${rule.condition} (threshold: > 85%)`);
    console.log(`   Fire duration: ${rule.for}`);
  } catch (error) {
    console.error(
      `❌ Failed to create alert rule: ${(error as Error).message}`
    );
    throw error;
  }
}

async function main(): Promise<void> {
  console.log('🚀 MirrorBuddy Alert Rules Provisioning');
  console.log(`   Grafana URL: ${GRAFANA_URL}`);
  console.log('');

  try {
    // Verify Grafana connectivity
    console.log('🔍 Verifying Grafana connectivity...');
    const healthResponse = await fetch(`${GRAFANA_URL}/api/health`, {
      headers: {
        Authorization: `Bearer ${GRAFANA_API_KEY}`,
      },
    });

    if (!healthResponse.ok) {
      throw new Error(`Grafana health check failed: ${healthResponse.status}`);
    }

    console.log('✅ Grafana connectivity verified');
    console.log('');

    // Create all alert rules
    for (const rule of ALERT_RULES) {
      await createAlertRule(rule);
    }

    console.log('');
    console.log('✅ All alert rules provisioned successfully!');
    console.log('');
    console.log('📊 Next steps:');
    console.log('  1. Verify alerts in Grafana: https://mirrorbuddy.grafana.net/alerting/list');
    console.log('  2. Configure notification channels if not already set up');
    console.log('  3. Test alert firing by manually pushing metric > 85%');
    console.log('  4. Review alert history: Grafana > Alerts > Alert history');
    console.log('');
    console.log(
      '📚 Documentation: docs/alerts/ALERT-RULES.md, ADR 0047, RUNBOOK.md'
    );
  } catch (error) {
    console.error(
      '❌ Provisioning failed:',
      (error as Error).message
    );
    process.exit(1);
  }
}

main();
