import { test, expect, PROD_URL } from './fixtures';
import { AUTH_COOKIE_NAME } from '@/lib/auth/cookie-constants';

const ADMIN_COOKIE = process.env.ADMIN_READONLY_COOKIE_VALUE;
const ADMIN_COOKIE_NAME = process.env.ADMIN_COOKIE_NAME || AUTH_COOKIE_NAME;

const adminPages = [
  '/admin',
  '/admin/characters',
  '/admin/analytics',
  '/admin/audit',
  '/admin/safety',
  '/admin/knowledge',
  '/admin/funnel',
  '/admin/mission-control/infra',
];

test.describe('PROD-SMOKE: Admin Health', () => {
  test.skip(!ADMIN_COOKIE, 'ADMIN_READONLY_COOKIE_VALUE not set');

  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      {
        name: ADMIN_COOKIE_NAME,
        value: ADMIN_COOKIE!,
        domain: new URL(PROD_URL).hostname,
        path: '/',
        httpOnly: true,
        secure: true,
      },
    ]);
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

    const cookieHeader = `${ADMIN_COOKIE_NAME}=${ADMIN_COOKIE}`;
    const res = await request.post('/api/admin/maintenance/toggle', {
      data: { enabled: true, message: 'Smoke readonly check' },
      headers: { Cookie: cookieHeader },
    });
    expect(res.status()).toBe(403);
  });
});
