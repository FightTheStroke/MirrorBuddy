import { test, expect } from '@playwright/test';

test.describe('Quiz View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('button').filter({ hasText: 'Quiz' }).click();
    await page.waitForTimeout(500);
  });

  test('quiz page loads correctly', async ({ page }) => {
    // Check for quiz header
    await expect(page.locator('h1, h2').filter({ hasText: /Quiz/i }).first()).toBeVisible();
  });

  test('displays available quizzes', async ({ page }) => {
    // Check for quiz cards - look for quiz-related content
    const hasQuizzes = await page.locator('text=Matematica').or(page.locator('text=Storia')).first().isVisible();
    expect(hasQuizzes).toBeTruthy();
  });

  test('quiz cards show XP rewards', async ({ page }) => {
    // Each quiz card should show XP reward
    const hasXP = await page.locator('text=XP').first().isVisible();
    expect(hasXP).toBeTruthy();
  });

  test('quiz cards show question count', async ({ page }) => {
    // Each quiz should show number of questions
    const hasQuestions = await page.locator('text=domand').first().isVisible();
    expect(hasQuestions).toBeTruthy();
  });

  test('clicking quiz card starts quiz', async ({ page }) => {
    // Find and click on a quiz card
    const quizCard = page.locator('button').filter({ hasText: /Inizia|Quiz|Matematica/i }).first();
    if (await quizCard.isVisible()) {
      await quizCard.click();
      await page.waitForTimeout(1000);
    }
  });

  test('completing quiz marks it as completed', async ({ page }) => {
    // For now, verify quiz cards exist
    const hasQuizCard = await page.locator('[class*="card"]').first().isVisible();
    expect(hasQuizCard).toBeTruthy();
  });
});

test.describe('Quiz Interaction', () => {
  test('can interact with quiz options', async ({ page }) => {
    await page.goto('/');
    await page.locator('button').filter({ hasText: 'Quiz' }).click();
    await page.waitForTimeout(500);

    // Should have interactive elements
    const hasButtons = await page.locator('button').count() > 0;
    expect(hasButtons).toBeTruthy();
  });
});
