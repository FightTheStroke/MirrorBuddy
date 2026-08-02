import { test, expect, hasProdTestCredentials } from './fixtures';

test.describe('PROD-SMOKE: Route contracts', () => {
  test('Unauthenticated /it redirects to the localized welcome page', async ({ page }) => {
    await page.goto('/it');
    await expect(page).toHaveURL(/\/it\/welcome\/?$/, { timeout: 15000 });
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/MirrorBuddy/i);
  });

  test('Unauthenticated /admin redirects to the localized login page', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForURL(/\/(it|en|fr|de|es)\/login/, { timeout: 15000 });
    expect(new URL(page.url()).pathname).toBe('/it/login');
  });

  test('Authenticated login enters the app at /it', async ({ page }) => {
    test.skip(!hasProdTestCredentials, 'Local production test credentials are not available');

    await page.goto('/it/login');
    await page.getByLabel(/email/i).fill(process.env.PROD_TEST_USER_EMAIL!);
    await page.locator('#password').fill(process.env.PROD_TEST_USER_PASSWORD!);
    await page.getByRole('button', { name: /accedi/i }).click();

    await expect(page).toHaveURL(/\/it\/?$/, { timeout: 15000 });
    await expect(page.getByTestId('intent-card-homework')).toContainText('Fare i compiti');
    await expect(page.getByTestId('intent-card-study')).toContainText('Studiare');
    await expect(page.getByTestId('intent-card-quizMe')).toContainText('Mettiti alla prova');
  });
});
