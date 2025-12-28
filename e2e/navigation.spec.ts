import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('homepage loads with maestri grid', async ({ page }) => {
    // Check title or main heading
    await expect(page.locator('text=Convergio-Edu').first()).toBeVisible();

    // Check maestri are displayed
    await expect(page.locator('text=Euclide').first()).toBeVisible({ timeout: 10000 });
  });

  test('sidebar navigation works', async ({ page }) => {
    // Click on Quiz nav item
    await page.locator('button').filter({ hasText: 'Quiz' }).click();
    await expect(page.locator('h1, h2').filter({ hasText: /Quiz/i }).first()).toBeVisible({ timeout: 5000 });

    // Click on Flashcards nav item
    await page.locator('button').filter({ hasText: 'Flashcards' }).click();
    await expect(page.locator('h1, h2').filter({ hasText: /Flashcard/i }).first()).toBeVisible({ timeout: 5000 });

    // Click on Progressi nav item
    await page.locator('button').filter({ hasText: 'Progressi' }).click();
    await page.waitForTimeout(500);

    // Click on Impostazioni nav item
    await page.locator('button').filter({ hasText: 'Impostazioni' }).click();
    await expect(page.locator('h1').filter({ hasText: /Impostazioni/i })).toBeVisible({ timeout: 5000 });
  });

  test('sidebar collapses and expands', async ({ page }) => {
    // Find the collapse/expand button specifically
    const collapseButton = page.locator('aside button[aria-label="Chiudi menu"]').or(
      page.locator('aside button[aria-label="Apri menu"]')
    );

    // Should start open
    await expect(page.locator('aside').locator('text=Convergio-Edu')).toBeVisible();

    // Click to collapse
    await collapseButton.first().click();
    await page.waitForTimeout(300);

    // Click to expand again
    await collapseButton.first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('aside').locator('text=Convergio-Edu')).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('mobile layout works', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Page should still load
    await expect(page.locator('aside')).toBeVisible();
  });

  test('tablet layout works', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // Page should display properly
    await expect(page.locator('aside')).toBeVisible();
  });
});
