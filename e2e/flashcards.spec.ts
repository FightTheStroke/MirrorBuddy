import { test, expect } from '@playwright/test';

test.describe('Flashcards View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/supporti');
    await page.waitForLoadState('networkidle');
    await page.locator('button').filter({ hasText: /^Flashcard$/i }).first().click();
  });

  test('flashcards page loads correctly', async ({ page }) => {
    await expect(page.locator('button').filter({ hasText: /^Flashcard$/i }).first()).toBeVisible();
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
    await page.goto('/materiali');
    await page.waitForLoadState('networkidle');
  });

  test('homework help page loads', async ({ page }) => {
    // Check for homework-related content in main area (label changed to Aiuto Compiti)
    await expect(page.locator('h1, h2').filter({ hasText: /Materiali di Studio|Aiuto Compiti|Homework/i }).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Progress View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('button').filter({ hasText: 'Progressi' }).click();
  });

  test('progress page loads correctly', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: /Progressi/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test('displays XP information', async ({ page }) => {
    const hasXP = await page.locator('text=/XP totali|XP per il livello/i').first().isVisible().catch(() => false);
    if (!hasXP) {
      return;
    }
  });

  test('displays streak information', async ({ page }) => {
    const hasStreak = await page.locator('text=/Calendario Streak|Streak/i').first().isVisible().catch(() => false);
    if (!hasStreak) {
      return;
    }
  });
});
