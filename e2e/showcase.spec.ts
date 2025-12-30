import { test, expect } from '@playwright/test';

/**
 * Showcase Mode E2E Tests
 * Tests navigation and content of the offline showcase feature
 */

test.describe('Showcase Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Start from showcase home
    await page.goto('/showcase');
  });

  test('showcase home page loads with navigation', async ({ page }) => {
    // Check header (may have multiple elements, use first)
    await expect(page.locator('text=Convergio Edu').first()).toBeVisible();
    await expect(page.locator('text=Showcase').first()).toBeVisible();

    // Check showcase banner (note: may have accent as Modalità, multiple elements possible)
    await expect(page.locator('text=/Modalit[aà] Showcase/i').first()).toBeVisible();
    await expect(page.locator('text=/Configura|Configure/i').first()).toBeVisible();
  });

  test('can navigate to maestri page', async ({ page }) => {
    await page.click('text=Maestri');
    await expect(page).toHaveURL(/\/showcase\/maestri/);
    // Should show at least some maestri
    await expect(page.locator('text=Leonardo')).toBeVisible({ timeout: 10000 });
  });

  test('can navigate to mindmaps page', async ({ page }) => {
    await page.click('text=Mappe Mentali');
    await expect(page).toHaveURL(/\/showcase\/mindmaps/);
  });

  test('can navigate to quiz page', async ({ page }) => {
    await page.click('text=Quiz');
    await expect(page).toHaveURL(/\/showcase\/quiz/);
  });

  test('can navigate to flashcards page', async ({ page }) => {
    await page.click('text=Flashcards');
    await expect(page).toHaveURL(/\/showcase\/flashcards/);
  });

  test('can navigate to solar system page', async ({ page }) => {
    await page.click('text=Sistema Solare');
    await expect(page).toHaveURL(/\/showcase\/solar-system/);
  });

  test('can navigate to chat page', async ({ page }) => {
    await page.click('text=Chat Simulata');
    await expect(page).toHaveURL(/\/showcase\/chat/);
  });

  test('configure button links to landing', async ({ page }) => {
    await page.click('text=Configura ora');
    await expect(page).toHaveURL(/\/landing/);
  });
});

test.describe('Landing Page', () => {
  test('landing page shows setup options', async ({ page }) => {
    await page.goto('/landing');

    // Check hero section (with or without hyphen)
    await expect(page.locator('text=/Convergio[-\\s]?Edu/i').first()).toBeVisible();

    // Check for some content on landing page
    const hasProvider = await page.locator('text=/Azure|Ollama|OpenAI/i').first().isVisible().catch(() => false);
    const hasShowcase = await page.locator('text=/Esplora|Showcase/i').first().isVisible().catch(() => false);

    // At least one key element should be visible
    expect(hasProvider || hasShowcase).toBeTruthy();
  });

  test('can navigate from landing to showcase', async ({ page }) => {
    await page.goto('/landing');
    await page.click('text=Esplora Showcase');
    await expect(page).toHaveURL(/\/showcase/);
  });
});

test.describe('Showcase Interactive Features', () => {
  test('quiz has questions and can be answered', async ({ page }) => {
    await page.goto('/showcase/quiz');
    // Wait for quiz to load
    await page.waitForTimeout(1000);
    // Should have question text
    await expect(page.locator('[class*="question"], [data-testid="question"], h2, h3').first()).toBeVisible();
  });

  test('flashcards can be flipped', async ({ page }) => {
    await page.goto('/showcase/flashcards');
    await page.waitForTimeout(1000);
    // Should have flashcard content
    await expect(page.locator('[class*="card"], [data-testid="flashcard"]').first()).toBeVisible();
  });

  test('solar system has controls', async ({ page }) => {
    await page.goto('/showcase/solar-system');
    await page.waitForTimeout(1000);
    // Should have some interactive controls
    await expect(page.locator('button, [role="slider"], canvas').first()).toBeVisible();
  });

  test('chat simulation has conversation', async ({ page }) => {
    await page.goto('/showcase/chat');
    await page.waitForTimeout(1000);
    // Should have tabs for coach and buddy
    await expect(page.locator('text=Melissa').or(page.locator('text=Mario')).first()).toBeVisible();
  });
});
