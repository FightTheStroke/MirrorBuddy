import {
  test,
  expect,
  hasProdTestAuthCookie,
  hasProdTestCredentials,
  verifyProdTestUserCookie,
} from './fixtures';

// This file contains the only credential-bearing smoke test. Never retain
// artifacts that could capture the plaintext password field.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

test.describe('PROD-SMOKE: Route contracts', () => {
  test('Unauthenticated /it redirects to the localized welcome page', async ({ page }) => {
    await page.goto('/it');
    await expect(page).toHaveURL(/\/it\/welcome\/?$/, { timeout: 15000 });
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/MirrorBuddy/i);
  });

  test('Unauthenticated /admin redirects to the localized login page', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'commit' });
    await page.waitForURL(/\/(it|en|fr|de|es)\/login/, { timeout: 15000 });
    expect(new URL(page.url()).pathname).toBe('/it/login');
  });

  test.describe('Credential login', () => {
    test('Authenticated login enters the app at /it', async ({ page, request }) => {
      test.skip(!hasProdTestAuthCookie, 'Production test auth cookie is not available');
      test.skip(!hasProdTestCredentials, 'Local production test credentials are not available');

      // Abort before submitting credentials unless the expected ID is already
      // proven to be the dedicated production test identity.
      await verifyProdTestUserCookie(request);

      await page.goto('/it/login');
      await page.getByLabel(/email/i).fill(process.env.PROD_TEST_USER_EMAIL!);
      await page.locator('#password').fill(process.env.PROD_TEST_USER_PASSWORD!);
      const loginResponsePromise = page.waitForResponse(
        (response) =>
          response.url().endsWith('/api/auth/login') && response.request().method() === 'POST',
      );
      await page.getByRole('button', { name: /accedi/i }).click();
      const loginResponse = await loginResponsePromise;
      expect(loginResponse.status()).toBe(200);
      const loginBody = (await loginResponse.json()) as { user?: { id?: string } };
      expect(loginBody.user?.id).toBe(process.env.PROD_TEST_USER_ID);

      await expect(page).toHaveURL(/\/it\/?$/, { timeout: 15000 });
      const userResponse = await page.request.get('/api/user');
      expect(userResponse.status()).toBe(200);
      expect(await userResponse.json()).toMatchObject({
        id: process.env.PROD_TEST_USER_ID,
        isTestData: true,
      });
      await expect(page.getByTestId('intent-card-homework')).toContainText('Fare i compiti');
      await expect(page.getByTestId('intent-card-study')).toContainText('Studiare');
      await expect(page.getByTestId('intent-card-quizMe')).toContainText('Mettiti alla prova');
    });
  });
});
