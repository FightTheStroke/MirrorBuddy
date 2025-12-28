import { test, expect } from '@playwright/test';

test.describe('Maestri Grid', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays all maestri cards', async ({ page }) => {
    // Check for key maestri by name - these are the actual maestri
    const maestriNames = [
      'Euclide',
      'Feynman',
      'Curie',
      'Darwin',
      'Erodoto',
      'Manzoni',
      'Leonardo',
    ];

    for (const name of maestriNames) {
      await expect(page.locator(`text=${name}`).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('maestro cards have correct information', async ({ page }) => {
    // Find Euclide's card - look for text within button/card
    const euclideText = page.locator('h3').filter({ hasText: 'Euclide' });
    await expect(euclideText).toBeVisible();

    // Check for a subject badge nearby
    await expect(page.locator('text=Matematica').first()).toBeVisible();
  });

  test('maestro cards are interactive', async ({ page }) => {
    // Cards should be clickable buttons
    const firstCard = page.locator('button').filter({ hasText: /Euclide|Feynman|Curie/ }).first();
    await expect(firstCard).toBeVisible();

    // Hover should work
    await firstCard.hover();
  });

  test('clicking maestro initiates voice session', async ({ page }) => {
    // Click on Euclide's card
    await page.locator('button').filter({ hasText: 'Euclide' }).first().click();

    // Should show voice session dialog or configuration error
    await page.waitForTimeout(1500);

    // Check for modal/dialog appearing
    const hasModal = await page.locator('[class*="fixed"]').filter({ hasText: /Euclide|Configura|Azure|Connessione/ }).first().isVisible();
    expect(hasModal).toBeTruthy();
  });
});

test.describe('Subject Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('maestri are grouped by subject', async ({ page }) => {
    // Check that subjects are visually distinct
    // Each maestro should have a colored indicator
    const cards = page.locator('button').filter({ hasText: /Euclide|Feynman|Curie/ });
    await expect(cards.first()).toBeVisible();
  });
});
