/**
 * Preview deployments must not push metrics.
 *
 * Vercel builds previews with NODE_ENV=production, so the in-process push
 * service started on every preview too: pushing every 60s to the same Grafana
 * account, labelling its samples env=production, and raising
 * `grafana_transport` whenever one of those pushes timed out. All 14 events of
 * that alarm on 21-22 Sep 2026 carried `environment: preview` — noise no user
 * ever saw, mixed into the production dashboards.
 *
 * The cron route already guards on VERCEL_ENV. This makes the service agree.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prometheusPushService } from '../prometheus-push-service';

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

describe('Pushing metrics only from the deployment people actually use', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('GRAFANA_CLOUD_PROMETHEUS_URL', 'https://metrics.example.test/write');
    vi.stubEnv('GRAFANA_CLOUD_PROMETHEUS_USER', 'test');
    vi.stubEnv('GRAFANA_CLOUD_API_KEY', 'test-only');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
  });

  afterEach(() => {
    prometheusPushService.stop();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('stays asleep on a preview deployment', () => {
    vi.stubEnv('VERCEL_ENV', 'preview');

    prometheusPushService.start();

    expect(prometheusPushService.isActive()).toBe(false);
  });

  it('stays asleep on a staging deployment', () => {
    vi.stubEnv('VERCEL_ENV', 'development');

    prometheusPushService.start();

    expect(prometheusPushService.isActive()).toBe(false);
  });

  it('runs on the production deployment', () => {
    vi.stubEnv('VERCEL_ENV', 'production');

    prometheusPushService.start();

    expect(prometheusPushService.isActive()).toBe(true);
  });

  it('still runs where there is no Vercel environment to read', () => {
    prometheusPushService.start();

    expect(prometheusPushService.isActive()).toBe(true);
  });
});
