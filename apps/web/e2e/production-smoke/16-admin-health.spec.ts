import {
  test,
  expect,
  ADMIN_READONLY_COOKIE_VALUE,
  addAdminReadOnlyCookie,
  adminReadOnlyCookieHeader,
} from './fixtures';

const adminPages = [
  '/admin',
  '/admin/analytics',
  '/admin/safety',
  '/admin/funnel',
  '/admin/mission-control/infra',
];

test.describe('PROD-SMOKE: Admin Health', () => {
  test.skip(!ADMIN_READONLY_COOKIE_VALUE, 'ADMIN_READONLY_COOKIE_VALUE not set');

  test.beforeEach(async ({ context }) => {
    await addAdminReadOnlyCookie(context);
  });

  for (const pagePath of adminPages) {
    test(`Admin health page loads: ${pagePath}`, async ({ page }) => {
      await page.goto(pagePath);
      await expect(page).toHaveURL(new RegExp(`${pagePath}/?$`));
      await expect(page.locator('body')).toBeVisible();
      await expect(page.getByText(/Application error|Unhandled Runtime Error/i)).toHaveCount(0);
    });
  }

  test('Infrastructure page renders status badges and blocks destructive maintenance action', async ({
    page,
    request,
  }) => {
    await page.goto('/admin/mission-control/infra');
    await expect(page.getByText('Service Health Summary')).toBeVisible();

    const body = (await page.textContent('body')) || '';
    expect(body).toMatch(/healthy|degraded|down|unknown/i);

    const res = await request.post('/api/admin/maintenance/toggle', {
      data: { enabled: true, message: 'Smoke readonly check' },
      headers: { Cookie: adminReadOnlyCookieHeader() },
    });
    expect(res.status()).toBe(403);
  });
});
