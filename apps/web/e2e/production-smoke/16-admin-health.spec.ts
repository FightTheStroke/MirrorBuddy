import { test, expect, ADMIN_READONLY_COOKIE_VALUE, addAdminReadOnlyCookie } from './fixtures';

interface BrowserError {
  text: string;
  url: string;
}

const KNOWN_HARMLESS_CONSOLE_ERRORS = [
  {
    text: /status of 403/,
    url: /\/api\/dashboard\/(token-usage|voice-metrics|fsrs-stats|safety-events|a11y-stats)/,
  },
  {
    text: /status of 404/,
    url: /\/admin\/mission-control\?_rsc=/,
  },
];

function isKnownHarmlessConsoleError(error: BrowserError) {
  return KNOWN_HARMLESS_CONSOLE_ERRORS.some(
    (allowed) => allowed.text.test(error.text) && allowed.url.test(error.url),
  );
}

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
    test(`Admin health page loads meaningful content: ${pagePath}`, async ({ page }) => {
      const consoleErrors: BrowserError[] = [];
      const pageErrors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') {
          consoleErrors.push({ text: message.text(), url: message.location().url });
        }
      });
      page.on('pageerror', (error) => pageErrors.push(error.message));

      const response = await page.goto(pagePath, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      expect(response).not.toBeNull();
      expect(response!.status()).toBe(200);
      await expect(page).toHaveURL(new RegExp(`${pagePath}/?$`));
      const main = page.locator('main');
      await expect(main).toBeVisible({ timeout: 15000 });
      await expect.poll(async () => (await main.innerText()).trim().length).toBeGreaterThan(100);

      const mainText = await main.innerText();
      expect(mainText).not.toMatch(
        /Not Configured|Vercel Not Configured|Redis Not Configured|Application error|Unhandled Runtime Error|Internal Server Error/i,
      );

      await page.waitForTimeout(2000);
      expect(pageErrors).toEqual([]);
      expect(consoleErrors.filter((error) => !isKnownHarmlessConsoleError(error))).toEqual([]);
    });
  }

  test('Infrastructure page renders status without exposing a destructive confirmation', async ({
    page,
  }) => {
    await page.goto('/admin/mission-control/infra');
    await expect(page.getByText('Service Health Summary')).toBeVisible();

    const body = (await page.textContent('body')) || '';
    expect(body).toMatch(/healthy|degraded|down|unknown/i);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /conferma/i })).toHaveCount(0);
  });
});
