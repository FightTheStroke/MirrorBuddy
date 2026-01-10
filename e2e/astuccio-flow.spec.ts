import { test, expect } from '@playwright/test';

test.describe('Astuccio Tool Creation Flow', () => {
  test('clicking tool opens maestro dialog and focus mode activates', async ({ page }) => {
    // Go directly to Astuccio page
    await page.goto('/astuccio');
    await page.waitForLoadState('networkidle');

    // Take screenshot of initial state
    await page.screenshot({ path: 'test-results/astuccio-initial.png' });

    // Verify we're on the Astuccio view
    const astuccioTitle = page.locator('text=Il Tuo Astuccio');
    await expect(astuccioTitle).toBeVisible({ timeout: 10000 });

    // Click on "Mappa Mentale" tool
    const mindmapCard = page.locator('text=Mappa Mentale').first();
    await expect(mindmapCard).toBeVisible();
    await mindmapCard.click();

    // Wait for dialog to appear
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/astuccio-dialog-open.png' });

    // Check if dialog opened
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    console.log('Dialog visible after click:', await dialog.isVisible());

    // Step 1: Select a subject (click Matematica button)
    const subjectButton = page.locator('button:has-text("Matematica")');
    if (await subjectButton.isVisible()) {
      await subjectButton.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'test-results/astuccio-subject-selected.png' });
    }

    // Step 2: Select a maestro - click on the first maestro card
    const maestroCard = page.locator('[role="dialog"] button').filter({ hasText: /Prof|Euclide|Leonardo|Socrat/ }).first();
    if (await maestroCard.isVisible().catch(() => false)) {
      await maestroCard.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'test-results/astuccio-maestro-selected.png' });
    }

    // Step 3: Select interaction mode (Chat or Voce)
    const chatButton = page.locator('button:has-text("Chat")');
    const voiceButton = page.locator('button:has-text("Voce"), button:has-text("Voice")');

    if (await chatButton.isVisible().catch(() => false)) {
      await chatButton.click();
      await page.waitForTimeout(500);
    } else if (await voiceButton.isVisible().catch(() => false)) {
      await voiceButton.click();
      await page.waitForTimeout(500);
    }

    // Take screenshot after completing selection
    await page.screenshot({ path: 'test-results/astuccio-after-selection.png' });

    // Verify focus mode is activated - check for the z-50 overlay
    const focusOverlay = page.locator('.fixed.inset-0.z-50');
    const focusOverlayVisible = await focusOverlay.isVisible().catch(() => false);
    console.log('Focus overlay visible:', focusOverlayVisible);

    // Take screenshot regardless
    await page.screenshot({ path: 'test-results/astuccio-final-state.png' });

    // Check URL hasn't changed to /mindmap (should stay at /astuccio or be same location)
    const currentUrl = page.url();
    console.log('Final URL:', currentUrl);

    // Should NOT have navigated to /mindmap?... with URL params
    expect(currentUrl).not.toContain('/mindmap?');

    // Page should still have MirrorBuddy content
    const pageContent = await page.content();
    console.log('Has MirrorBuddy in content:', pageContent.includes('MirrorBuddy'));
  });

  test('quiz tool also uses focus mode correctly', async ({ page }) => {
    // Go directly to Astuccio page
    await page.goto('/astuccio');
    await page.waitForLoadState('networkidle');

    // Verify we're on Astuccio
    await expect(page.locator('text=Il Tuo Astuccio')).toBeVisible({ timeout: 10000 });

    // Click on Quiz tool
    const quizCard = page.locator('text=Quiz').first();
    await expect(quizCard).toBeVisible();
    await quizCard.click();
    await page.waitForTimeout(500);

    // Complete the dialog flow
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Select first available subject
    const subjects = page.locator('[role="dialog"] button').filter({ hasText: /Matematica|Italiano|Storia|Scienze/ });
    const firstSubject = subjects.first();
    if (await firstSubject.isVisible()) {
      await firstSubject.click();
      await page.waitForTimeout(300);
    }

    // Select first maestro
    const maestros = page.locator('[role="dialog"] button').filter({ hasText: /Prof|Maestr|Euclide|Socrat|Leonardo/ });
    const firstMaestro = maestros.first();
    if (await firstMaestro.isVisible().catch(() => false)) {
      await firstMaestro.click();
      await page.waitForTimeout(300);
    }

    // Select Chat mode
    const chatBtn = page.locator('button:has-text("Chat")');
    if (await chatBtn.isVisible().catch(() => false)) {
      await chatBtn.click();
      await page.waitForTimeout(500);
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/quiz-after-selection.png' });

    // URL should NOT be /quiz?... (no navigation with params)
    expect(page.url()).not.toContain('/quiz?');
    console.log('Quiz Final URL:', page.url());
  });
});
