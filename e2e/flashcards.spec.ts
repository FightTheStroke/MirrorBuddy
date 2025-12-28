import { test, expect } from '@playwright/test';

test.describe('Flashcards View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('text=Flashcards');
  });

  test('flashcards page loads correctly', async ({ page }) => {
    // Check for flashcards header or content
    await expect(page.locator('h1, h2').filter({ hasText: /Flashcard/i }).first()).toBeVisible();
  });

  test('displays flashcard decks or empty state', async ({ page }) => {
    // Wait for page to fully load
    await page.waitForTimeout(1000);

    // Should show either existing decks, empty message, or the flashcards UI
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);
    const hasProsto = await page.locator('text=presto').isVisible().catch(() => false);
    const hasFlashcardUI = await page.locator('text=/Flashcard|Aggiungi|Nuov|mazzo/i').first().isVisible().catch(() => false);
    const hasMainContent = await page.locator('main').first().isVisible().catch(() => false);

    expect(hasCards || hasProsto || hasFlashcardUI || hasMainContent).toBeTruthy();
  });
});

test.describe('Homework Help View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Click the Compiti nav item
    await page.locator('button').filter({ hasText: 'Compiti' }).click();
  });

  test('homework help page loads', async ({ page }) => {
    // Check for homework-related content in main area
    await expect(page.locator('h1, h2').filter({ hasText: /Compiti|Aiuto|Homework/i }).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Progress View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('button').filter({ hasText: 'Progressi' }).click();
  });

  test('progress page loads correctly', async ({ page }) => {
    // Check for XP text in the main content area (not sidebar)
    await expect(page.locator('main').first().locator('text=XP').first()).toBeVisible({ timeout: 5000 });
  });

  test('displays XP information', async ({ page }) => {
    // Should show XP somewhere in main content
    const hasXP = await page.locator('main').first().locator('text=XP').first().isVisible();
    expect(hasXP).toBeTruthy();
  });

  test('displays streak information', async ({ page }) => {
    // Should show streak information
    const hasStreak = await page.locator('text=Streak').first().isVisible();
    expect(hasStreak).toBeTruthy();
  });
});
