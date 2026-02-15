import { test, expect } from './fixtures';
import { ADMIN_COOKIE_NAME as DEFAULT_ADMIN_COOKIE_NAME } from '@/lib/auth/cookie-constants';

const ADMIN_COOKIE = process.env.ADMIN_READONLY_COOKIE_VALUE;
const ADMIN_COOKIE_NAME = process.env.ADMIN_COOKIE_NAME || DEFAULT_ADMIN_COOKIE_NAME;
const adminTest = ADMIN_COOKIE ? test : test.skip;

const adminPages = [
  '/admin',
  '/admin/users',
  '/admin/characters',
  '/admin/analytics',
  '/admin/audit',
  '/admin/safety',
  '/admin/tiers',
  '/admin/knowledge',
  '/admin/funnel',
  '/admin/mission-control/infra',
];

adminTest.describe('PROD-SMOKE: Admin Health', () => {
  adminTest.beforeEach(async ({ context }) => {
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
  });

  for (const pagePath of adminPages) {
    adminTest(`Admin health page loads without console errors: ${pagePath}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(pagePath);
      await expect(page.locator('main')).toBeVisible();

      const body = (await page.textContent('body')) || '';
      expect(body).not.toContain('Not Configured');
      expect(body).not.toContain('Vercel Not Configured');
      expect(body).not.toContain('Redis Not Configured');
      expect(consoleErrors).toEqual([]);
    });
  }

  adminTest(
    'Infrastructure page renders status badges and blocks destructive maintenance action',
    async ({ page, request }) => {
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
    },
  );
});
