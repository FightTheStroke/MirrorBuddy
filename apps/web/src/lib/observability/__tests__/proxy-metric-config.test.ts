// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { collectHttpMetrics } from '../http-metrics-collector';
import { metricsStore } from '../metrics-store';

const repository = new URL('../../../../../../', import.meta.url);
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, repository)), 'utf8');
const retired = [
  'trial_started_total',
  'trial_engaged_total',
  'trial_limit_hit_total',
  'trial_beta_requested_total',
  'invite_requested_total',
  'invite_approved_total',
  'invite_rejected_total',
  'invite_first_login_total',
  'invite_active_total',
  'budget_used_eur',
  'budget_limit_eur',
  'budget_projected_monthly_eur',
  'budget_usage_percent',
  'abuse_flagged_total',
  'abuse_blocked_total',
  'abuse_score_total',
  'conversion_trial_to_engaged',
  'conversion_engaged_to_limit',
  'conversion_limit_to_request',
  'conversion_request_to_approved',
  'conversion_approved_to_login',
  'conversion_login_to_active',
];

interface Target {
  expr: string;
  legendFormat?: string;
}

interface Panel {
  id: number;
  title: string;
  description?: string;
  targets?: Target[];
  options?: { content?: string };
}

interface Dashboard {
  panels: Panel[];
}

const dashboard = JSON.parse(read('grafana/mirrorbuddy-dashboard.json')) as Dashboard;
const beta = JSON.parse(read('grafana/dashboards/mirrorbuddy-beta.json')) as Dashboard;
const alerts = JSON.parse(read('grafana/alerts/mirrorbuddy-alerts.json')) as {
  alertRules: { uid: string; data: { model: { expr: string } }[] }[];
  contactPoints: { name: string }[];
  notificationPolicies: { receiver: string };
};
const script = read('scripts/test-grafana-push.ts');
const queries = [
  ...dashboard.panels.flatMap((panel) => panel.targets?.map((target) => target.expr) ?? []),
  ...beta.panels.flatMap((panel) => panel.targets?.map((target) => target.expr) ?? []),
  ...alerts.alertRules.flatMap((alert) => alert.data.map((query) => query.model.expr)),
];

describe('proxy-only Grafana consumer contract', () => {
  beforeEach(() => metricsStore.reset());
  afterEach(() => metricsStore.reset());

  it('retires unsupported series without replacing missing telemetry with zero', () => {
    for (const query of queries) {
      for (const name of retired) expect(query).not.toMatch(new RegExp(`\\b${name}\\b`));
      expect(query).not.toMatch(/\bhttp_(?:request|error)/);
    }
    expect(beta.panels.some((panel) => /unavailable/i.test(panel.options?.content ?? ''))).toBe(
      true,
    );
  });

  it('removes dashboard-only usage queries without changing the source retirement count', () => {
    expect(retired).toHaveLength(22);
    for (const name of [
      'trial_voice_seconds_total',
      'trial_tool_calls_total',
      'trial_chats_total',
    ]) {
      for (const query of queries) expect(query).not.toMatch(new RegExp(`\\b${name}\\b`));
    }
    expect(beta.panels.filter((panel) => [13, 14, 15, 17].includes(panel.id))).toEqual([]);
  });

  it('resolves every proxy legend placeholder from real collected sample labels', () => {
    metricsStore.recordLatency('/api/chat', 200);
    metricsStore.recordError('/api/chat', 403);
    const samples = collectHttpMetrics({ instance: 'mirrorbuddy', env: 'production' }, 42);
    const targets = [...dashboard.panels, ...beta.panels]
      .flatMap((panel) => panel.targets ?? [])
      .filter((target) => target.expr.includes('proxy_http_'));

    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) {
      const name = target.expr.match(/\bproxy_http_\w+/)?.[0];
      const sample = samples.find((metric) => metric.name === name);
      expect(sample, target.expr).toBeDefined();
      expect(sample?.labels.route).toBe('/api/chat');
      const placeholders = [...(target.legendFormat ?? '').matchAll(/{{\s*(\w+)\s*}}/g)];
      expect(placeholders.length).toBeGreaterThan(0);
      for (const [, label] of placeholders) {
        expect(sample?.labels, `${name} legend label ${label}`).toHaveProperty(label);
      }
    }
  });

  it('plots direct per-worker five-minute gauges, not fleet or application percentiles', () => {
    const latency = dashboard.panels.find((panel) => panel.id === 21);
    const errors = dashboard.panels.find((panel) => panel.id === 22);
    expect(latency?.targets?.[0].expr).toBe(
      'proxy_http_request_duration_seconds_p95{env="production"}',
    );
    expect(errors?.targets?.[0].expr).toBe('proxy_http_request_error_rate{env="production"}');
    for (const panel of [latency, errors]) {
      expect(panel?.title).toMatch(/proxy/i);
      expect(panel?.description).toMatch(/5.minute/i);
      expect(panel?.description).toMatch(/not.*application/i);
      expect(panel?.targets?.[0].legendFormat).toContain('{{worker}}');
      expect(panel?.targets?.[0].expr).not.toMatch(
        /\b(rate|increase|avg|sum|histogram_quantile)\(/,
      );
    }
    expect(dashboard.panels.find((panel) => panel.id === 20)?.title).toMatch(
      /proxy diagnostics.*not application SLOs/i,
    );
  });

  it('removes unsupported alerts while retaining notification destinations', () => {
    for (const uid of [
      'budget-80-percent',
      'budget-95-percent',
      'abuse-spike',
      'conversion-drop',
      'invite-backlog',
    ]) {
      expect(alerts.alertRules.some((alert) => alert.uid === uid)).toBe(false);
    }
    expect(alerts.contactPoints.map((point) => point.name)).toContain('mirrorbuddy-team');
    expect(alerts.notificationPolicies.receiver).toBe('mirrorbuddy-team');
  });

  it('isolates synthetic proxy samples from production and uses diagnostic names', () => {
    expect(script).not.toMatch(/[`'"]http_(?:request|error)/);
    expect(script).toContain('env=test');
    expect(script).toContain('worker=synthetic-test');
    expect(script).toContain('synthetic=true');
    expect(script).toContain('proxy_http_request_duration_seconds_p95');
    expect(script).toContain('proxy_http_request_error_rate');
    expect(script).not.toContain('quantile=0.95');
    expect(script).not.toMatch(/,method=/);
    expect(script).toMatch(/not application/i);
  });
});
