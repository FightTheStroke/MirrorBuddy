/**
 * Production Smoke Tests — Admin Console (Extended)
 *
 * Comprehensive admin API endpoint verification.
 * Verifies ALL admin endpoints reject unauthenticated access.
 * Read-only, no data mutations even with valid auth.
 */

import { test, expect } from './fixtures';
import { ADMIN_COOKIE_NAME as DEFAULT_ADMIN_COOKIE_NAME } from '@/lib/auth/cookie-constants';

test.describe('PROD-SMOKE: Admin API Security', () => {
  const adminGetEndpoints = [
    '/api/admin/counts',
    '/api/admin/analytics/locales',
    '/api/admin/audit-logs',
    '/api/admin/audit',
    '/api/admin/business-kpi',
    '/api/admin/characters',
    '/api/admin/control-panel',
    '/api/admin/cost-tracking',
    '/api/admin/email-campaigns',
    '/api/admin/email-stats',
    '/api/admin/email-templates',
    '/api/admin/env-audit',
    '/api/admin/feature-flags',
    '/api/admin/funnel/metrics',
    '/api/admin/funnel/users',
    '/api/admin/grafana',
    '/api/admin/health-aggregator',
    '/api/admin/infra-panel',
    '/api/admin/key-vault',
    '/api/admin/safety',
  ];

  for (const endpoint of adminGetEndpoints) {
    test(`${endpoint} rejects unauthenticated GET`, async ({ request }) => {
      const res = await request.get(endpoint);
      expect(res.status()).toBeGreaterThanOrEqual(400);
    });
  }

  test('Admin cleanup-users rejects unauthenticated POST', async ({ request }) => {
    const res = await request.post('/api/admin/cleanup-users');
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('Admin character seed rejects unauthenticated POST', async ({ request }) => {
    const res = await request.post('/api/admin/characters/seed');
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('Admin email test rejects unauthenticated POST', async ({ request }) => {
    const res = await request.post('/api/admin/email-test');
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe('PROD-SMOKE: Admin Pages Navigation', () => {
  const ADMIN_COOKIE = process.env.ADMIN_READONLY_COOKIE_VALUE;
  const ADMIN_COOKIE_NAME = process.env.ADMIN_COOKIE_NAME || DEFAULT_ADMIN_COOKIE_NAME;
  const adminTest = ADMIN_COOKIE ? test : test.skip;

  const adminPages = [
    { path: '/admin', label: 'Dashboard' },
    { path: '/admin/users', label: 'Users' },
    { path: '/admin/characters', label: 'Characters' },
    { path: '/admin/analytics', label: 'Analytics' },
    { path: '/admin/audit', label: 'Audit' },
    { path: '/admin/safety', label: 'Safety' },
    { path: '/admin/invites', label: 'Invites' },
    { path: '/admin/tiers', label: 'Tiers' },
    { path: '/admin/knowledge', label: 'Knowledge' },
    { path: '/admin/communications/campaigns', label: 'Campaigns' },
    { path: '/admin/feature-flags', label: 'Feature Flags' },
    { path: '/admin/funnel', label: 'Funnel' },
    { path: '/admin/mission-control/infra', label: 'Infrastructure' },
  ];

  for (const { path, label } of adminPages) {
    adminTest(`Admin page ${label} (${path}) loads`, async ({ page, context }) => {
      await context.addCookies([
        {
          name: ADMIN_COOKIE_NAME,
          value: ADMIN_COOKIE!,
          domain: 'mirrorbuddy.vercel.app',
          path: '/',
          httpOnly: true,
          secure: true,
        },
      ]);

      await page.goto(path);

      // Page should load without error
      const title = await page.title();
      expect(title).not.toContain('404');
      expect(title).not.toContain('Error');

      // Should have some visible content (not blank/error)
      const body = await page.textContent('body');
      expect(body?.length).toBeGreaterThan(50);
    });
  }

  adminTest('Read-only admin cannot execute destructive mutations', async ({ request }) => {
    const cookieHeader = `${ADMIN_COOKIE_NAME}=${ADMIN_COOKIE}`;
    const res = await request.post('/api/admin/cleanup-users', {
      headers: { Cookie: cookieHeader },
    });
    expect(res.status()).toBe(403);
  });
});
