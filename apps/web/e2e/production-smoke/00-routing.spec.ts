import { test, authenticatedTest, expect, hasProdTestAuthCookie } from './fixtures';

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

  authenticatedTest('Authenticated cookie enters the app at /it', async ({ page }) => {
    authenticatedTest.skip(!hasProdTestAuthCookie, 'Production test auth cookie is not available');
    await page.goto('/it');
    await expect(page).toHaveURL(/\/it\/?$/);
    await expect(page.getByTestId('intent-card-homework')).toContainText('Fare i compiti');
  });
});
