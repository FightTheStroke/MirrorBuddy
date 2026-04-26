import { test, expect } from './fixtures/base-fixtures';

test.describe('Maintenance flow (placeholder)', () => {
  test.skip('maintenance page renders', async ({ page }) => {
    await page.goto('/maintenance');
    await expect(page.getByRole('main')).toBeVisible();
  });

  test.skip('maintenance banner shows when window is upcoming', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('banner')).toBeVisible();
  });

  test.skip('admin maintenance toggle works', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('button', { name: /activate|deactivate/i })).toBeVisible();
  });
});
