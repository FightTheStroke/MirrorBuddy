/**
 * Mindmap Tool Entry E2E Tests
 * Updated for Astuccio tool-driven flow.
 */

import { test, expect } from '@playwright/test';

async function openMindmapDialog(page: import('@playwright/test').Page) {
  await page.goto('/astuccio');
  await page.waitForLoadState('networkidle');

  const mindmapButton = page.getByRole('button', { name: /Mappa Mentale/i }).first();
  await expect(mindmapButton).toBeVisible();
  await mindmapButton.click();
  await expect(page.locator('[role="dialog"]')).toBeVisible();
}

test.describe('Mindmap Tool Entry', () => {
  test('mindmap tool opens selection dialog', async ({ page }) => {
    await openMindmapDialog(page);
  });

  test('mindmap tool dialog contains selection steps', async ({ page }) => {
    await openMindmapDialog(page);

    const stepText = page.locator('text=/Materia|Maestro|Chat|Voce|Voice/i');
    await expect(stepText.first()).toBeVisible();
  });
});
