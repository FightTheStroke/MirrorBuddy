import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { collectServiceLimitsSamples } from '../service-limits-metrics';
import { collectTierMetrics } from '../tier-metrics-collector';
import { prometheusPushService } from '../prometheus-push-service';
import { metricsStore } from '../metrics-store';
import {
  incrementTrialStarted,
  incrementTrialEngaged,
  incrementTrialLimitHit,
  incrementBetaRequested,
  incrementInviteRequested,
  incrementInviteApproved,
  incrementInviteRejected,
  incrementFirstLogin,
  incrementActiveUser,
  incrementAbuseFlagged,
  incrementAbuseBlocked,
  addAbuseScore,
  updateBudget,
  resetFunnelMetrics,
} from '../funnel-metrics';

vi.mock('../service-limits-metrics', () => ({ collectServiceLimitsSamples: vi.fn(() => []) }));
vi.mock('../tier-metrics-collector', () => ({ collectTierMetrics: vi.fn(() => []) }));

const fetchMock = vi.fn();
const now = new Date('2026-09-15T12:00:00Z');

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('GRAFANA_CLOUD_PROMETHEUS_URL', 'https://metrics.example.com/write');
  vi.stubEnv('GRAFANA_CLOUD_PROMETHEUS_USER', 'test-user');
  vi.stubEnv('GRAFANA_CLOUD_API_KEY', 'test-key');
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  metricsStore.reset();
  resetFunnelMetrics();
  prometheusPushService.initialize();
});
afterEach(() => {
  prometheusPushService.stop();
  metricsStore.reset();
  resetFunnelMetrics();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('collector ownership', () => {
  it.each(['1', '', undefined])(
    'never runs scheduled sources in the timer (VERCEL=%s)',
    async (vercel) => {
      vi.stubEnv('VERCEL', vercel);
      prometheusPushService.start();
      await vi.advanceTimersByTimeAsync(60_000);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(collectServiceLimitsSamples).not.toHaveBeenCalled();
      expect(collectTierMetrics).not.toHaveBeenCalled();
    },
  );

  it('keeps scheduled collection and transport independent of the interval module', () => {
    for (const file of ['collectors.ts', 'transport.ts']) {
      const source = readFileSync(
        resolve(import.meta.dirname, '../../../app/api/cron/metrics-push', file),
        'utf8',
      );
      expect(source).not.toContain('prometheus-push-service');
    }
  });

  it.each(['1', ''])(
    'delivers all 32 local metric names with their real values (VERCEL=%s)',
    async (vercel) => {
      vi.stubEnv('VERCEL', vercel);
      metricsStore.recordLatency('/api/chat', 200);
      metricsStore.recordError('/api/chat', 500);
      incrementTrialStarted();
      incrementTrialStarted();
      incrementTrialEngaged();
      incrementTrialLimitHit();
      incrementBetaRequested();
      incrementInviteRequested();
      incrementInviteApproved();
      incrementInviteRejected();
      incrementFirstLogin();
      incrementActiveUser();
      updateBudget(25, 100);
      incrementAbuseFlagged();
      incrementAbuseBlocked();
      addAbuseScore(7);

      await prometheusPushService.pushMetrics();

      const expected: Record<string, number> = {
        http_requests_total: 1,
        http_request_duration_seconds_p50: 0.2,
        http_request_duration_seconds_p95: 0.2,
        http_request_duration_seconds_p99: 0.2,
        http_request_errors_total: 1,
        http_request_error_rate: 0.5,
        http_request_errors_by_status: 1,
        http_requests_total_all: 1,
        http_errors_total_all: 1,
        http_error_rate_all: 0.5,
        trial_started_total: 2,
        trial_engaged_total: 1,
        trial_limit_hit_total: 1,
        trial_beta_requested_total: 1,
        invite_requested_total: 1,
        invite_approved_total: 1,
        invite_rejected_total: 1,
        invite_first_login_total: 1,
        invite_active_total: 1,
        budget_used_eur: 25,
        budget_limit_eur: 100,
        budget_projected_monthly_eur: 50,
        budget_usage_percent: 25,
        abuse_flagged_total: 1,
        abuse_blocked_total: 1,
        abuse_score_total: 7,
        conversion_trial_to_engaged: 0.5,
        conversion_engaged_to_limit: 1,
        conversion_limit_to_request: 1,
        conversion_request_to_approved: 1,
        conversion_approved_to_login: 1,
        conversion_login_to_active: 1,
      };
      const lines = (fetchMock.mock.calls[0][1].body as string).split('\n');
      expect(lines.filter((line) => !line.startsWith('metric_collector_'))).toHaveLength(32);
      for (const [name, value] of Object.entries(expected)) {
        const route = name.startsWith('http_') && !name.endsWith('_all') ? ',route=/api/chat' : '';
        const status = name === 'http_request_errors_by_status' ? ',status_code=500' : '';
        expect(lines).toContain(
          `${name},instance=mirrorbuddy,env=production${route}${status} value=${value} ${now.getTime() * 1e6}`,
        );
      }
      for (const collector of ['http', 'funnel', 'budget', 'abuse', 'conversion']) {
        for (const metric of ['up', 'enabled']) {
          expect(lines).toContain(
            `metric_collector_${metric},instance=mirrorbuddy,env=production,collector=${collector} value=1 ${now.getTime() * 1e6}`,
          );
        }
      }
    },
  );
});
