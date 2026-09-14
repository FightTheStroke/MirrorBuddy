import { test, expect } from './fixtures/auth-fixtures';

test.describe('admin metric truth', () => {
  test('counts endpoint never returns daily activity from ten-minute retention', async ({
    adminRequest,
  }) => {
    const response = await adminRequest.get('/api/admin/counts');
    expect(response.ok()).toBeTruthy();
    const counts = await response.json();
    expect(counts.activeUsers24h).toBeNull();
    expect(counts.metrics.activeUsers24h.unavailabilityReason).toBe('retentionWindow');
    expect(counts.metrics.totalUsers.source).toBeTruthy();
    expect(counts.metrics.totalUsers.computedAt).toBeTruthy();
  });

  test('analytics keeps failures visible and never invents zero cost or perfect accuracy', async ({
    adminPage,
  }) => {
    await adminPage.route('**/api/dashboard/**', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Synthetic read failure' }),
      }),
    );
    await adminPage.goto('/admin/analytics');
    await expect(adminPage.locator('[data-metric-status="failed"]').first()).toBeVisible();
    await expect(adminPage.getByText('€0.00', { exact: true })).toHaveCount(0);
    await expect(adminPage.getByText('100%', { exact: true })).toHaveCount(0);
    await expect(adminPage.locator('section')).toHaveCount(7);
  });

  test('an explicit optional denial differs from a failed collection', async ({ adminPage }) => {
    await adminPage.route('**/api/dashboard/**', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Synthetic read failure' }),
      }),
    );
    await adminPage.route('**/api/dashboard/session-metrics?days=7', (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Optional analytics not permitted',
          code: 'OPTIONAL_ANALYTICS_DENIED',
        }),
      }),
    );
    await adminPage.goto('/admin/analytics');
    await expect(adminPage.locator('[data-metric-status="disabled"]').first()).toBeVisible();
    await expect(adminPage.locator('[data-metric-status="failed"]').first()).toBeVisible();
  });
});
