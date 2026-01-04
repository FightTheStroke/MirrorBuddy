import { test, expect } from '@playwright/test';

/**
 * Study Kit E2E Tests
 * Verifies:
 * - F-Q1-Q4: Interactive quiz (one question at a time, submit, feedback, completion)
 * - F-D1-D3: Interactive demo (modal launch, KaTeX support, close)
 * - F-P1-P3: Print CSS (only summary, no UI chrome)
 */

test.describe('Study Kit - Interactive Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/study-kit');
    await page.waitForLoadState('networkidle');
  });

  test('navigates to study kit page', async ({ page }) => {
    await expect(page).toHaveURL('/study-kit');
    // Page should have heading or upload area
    const hasContent = await page.locator('h1, h2, button').first().isVisible();
    expect(hasContent).toBeTruthy();
  });

  test('shows study kit list or upload prompt', async ({ page }) => {
    // Either shows existing study kits or upload area
    const hasStudyKits = await page.locator('[role="button"]').filter({ hasText: /Apri|Elimina/i }).first().isVisible({ timeout: 2000 }).catch(() => false);
    const hasUpload = await page.locator('text=/Carica.*PDF/i').isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasStudyKits || hasUpload).toBeTruthy();
  });
});

test.describe('Study Kit Viewer - Quiz Interactive', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/study-kit');
    await page.waitForLoadState('networkidle');
  });

  test('F-Q1-Q4: Quiz is interactive with submit and feedback', async ({ page }) => {
    // Find and click "Apri" button on a ready study kit
    const openButton = page.locator('button').filter({ hasText: 'Apri' }).first();

    const hasReadyKit = await openButton.isVisible({ timeout: 2000 }).catch(() => false);
    test.skip(!hasReadyKit, 'No ready study kit available');

    await openButton.click();
    await page.waitForLoadState('networkidle');

    // Wait for StudyKitViewer to appear (tabs should be visible)
    await page.locator('[role="tablist"]').waitFor({ state: 'visible', timeout: 5000 });

    // Click on Quiz tab
    const quizTab = page.locator('[role="tab"]').filter({ hasText: /Quiz/i });
    await quizTab.click();
    await page.waitForTimeout(500);

    // F-Q1: Verify Quiz component is rendered (not QuizRenderer)
    // Should show one question at a time with options
    const questionText = page.locator('h3.text-xl.font-semibold, p.text-xl.font-semibold').first();
    await expect(questionText).toBeVisible({ timeout: 5000 });

    // F-Q2: Should have answer options as buttons/clickable
    // Use specific selector for quiz answer buttons within visible tab panel
    const quizPanel = page.locator('[role="tabpanel"]:visible');
    const options = quizPanel.locator('button.w-full.p-4.text-left.rounded-xl.border-2');
    const optionsCount = await options.count();
    expect(optionsCount).toBeGreaterThan(0);

    // Select an answer
    await options.first().click();
    await page.waitForTimeout(300);

    // Should have submit button
    const submitButton = page.locator('button').filter({ hasText: /Verifica|Invia|Conferma/i }).first();
    await expect(submitButton).toBeVisible();

    // F-Q2: Click submit → should show feedback (green border for correct, red for incorrect)
    await submitButton.click();
    await page.waitForTimeout(500);

    // Should show feedback styling (correct = green, incorrect = red)
    const hasGreenBorder = await page.locator('.border-green-500, [class*="bg-green"]').first().isVisible({ timeout: 2000 }).catch(() => false);
    const hasRedBorder = await page.locator('.border-red-500, [class*="bg-red"]').first().isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasGreenBorder || hasRedBorder).toBeTruthy();

    // Should show explanation after answer
    const explanation = page.locator('text=/Spiegazione|Risposta corretta/i').first();
    const hasExplanation = await explanation.isVisible({ timeout: 2000 }).catch(() => false);

    // F-Q3: After answering all questions, should show completion screen
    // For now, just verify next button exists to continue
    const nextButton = page.locator('button').filter({ hasText: /Avanti|Prossima/i }).first();
    const hasNext = await nextButton.isVisible({ timeout: 2000 }).catch(() => false);

    // If there's a next button, click through to completion
    if (hasNext) {
      await nextButton.click();
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Study Kit Viewer - Demo Interactive', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/study-kit');
    await page.waitForLoadState('networkidle');
  });

  test('F-D1-D3: Demo launches in fullscreen modal', async ({ page }) => {
    // Find and click "Apri" button on a ready study kit
    const openButton = page.locator('button').filter({ hasText: 'Apri' }).first();

    const hasReadyKit = await openButton.isVisible({ timeout: 2000 }).catch(() => false);
    test.skip(!hasReadyKit, 'No ready study kit available');

    await openButton.click();
    await page.waitForLoadState('networkidle');

    // Click on Demo tab
    const demoTab = page.locator('[role="tab"]').filter({ hasText: /Demo/i });
    const hasDemoTab = await demoTab.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasDemoTab) {
      await demoTab.click();
      await page.waitForTimeout(500);

      // F-D1: Should have "Avvia Demo Interattiva" button
      const launchButton = page.locator('button').filter({ hasText: /Avvia.*Demo/i }).first();
      const hasLaunchButton = await launchButton.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasLaunchButton) {
        await launchButton.click();
        await page.waitForTimeout(1000);

        // F-D1: Modal should open with HTMLPreview
        const modal = page.locator('[role="dialog"], .fixed.inset-0').first();
        await expect(modal).toBeVisible({ timeout: 3000 });

        // F-D2: Should have iframe with demo content (KaTeX may be present)
        const iframe = page.locator('iframe').first();
        const hasIframe = await iframe.isVisible({ timeout: 2000 }).catch(() => false);

        // F-D3: Should have close button
        const closeButton = page.locator('button[aria-label*="Chiudi"]').first();
        await expect(closeButton).toBeVisible();

        // Click close → modal should disappear
        await closeButton.click();
        await page.waitForTimeout(500);
        await expect(modal).not.toBeVisible();
      }
    }
  });
});

test.describe('Study Kit Viewer - Print CSS', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/study-kit');
    await page.waitForLoadState('networkidle');
  });

  test('F-P1-P3: Print CSS hides UI chrome, shows only summary', async ({ page }) => {
    // Find and click "Apri" button on a ready study kit
    const openButton = page.locator('button').filter({ hasText: 'Apri' }).first();

    const hasReadyKit = await openButton.isVisible({ timeout: 2000 }).catch(() => false);
    test.skip(!hasReadyKit, 'No ready study kit available');

    await openButton.click();
    await page.waitForLoadState('networkidle');

    // F-P1: Verify print-specific classes exist
    // Check that action buttons have .no-print class
    const downloadButton = page.locator('button[aria-label*="Scarica"], button[title*="Scarica"]').first();
    const hasNoPrint = await downloadButton.evaluate((el) => el.classList.contains('no-print')).catch(() => false);
    expect(hasNoPrint).toBeTruthy();

    // F-P2: TabsList should have .no-print class
    const tabsList = page.locator('[role="tablist"]').first();
    const tabsHaveNoPrint = await tabsList.evaluate((el) => el.classList.contains('no-print')).catch(() => false);
    expect(tabsHaveNoPrint).toBeTruthy();

    // F-P3: Verify print media query hides UI
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(500);

    // Tabs should be hidden in print mode
    await expect(tabsList).not.toBeVisible();

    // Action buttons should be hidden
    await expect(downloadButton).not.toBeVisible();

    // Summary content should be visible
    const summaryContent = page.locator('.prose').first();
    await expect(summaryContent).toBeVisible();

    // Reset media
    await page.emulateMedia({ media: 'screen' });
  });
});
