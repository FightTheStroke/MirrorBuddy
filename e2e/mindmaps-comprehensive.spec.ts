/**
 * Mindmap Tool Smoke Tests
 * Simplified for Astuccio tool flow.
 */

import { test, expect } from '@playwright/test';

test.describe('Mindmap Tool Smoke', () => {
  test('opens without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/astuccio');
    await page.waitForLoadState('networkidle');

    const mindmapButton = page.getByRole('button', { name: /Mappa Mentale/i }).first();
    await expect(mindmapButton).toBeVisible();
    await mindmapButton.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('ResizeObserver')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
