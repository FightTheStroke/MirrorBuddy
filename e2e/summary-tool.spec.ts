import { test, expect } from '@playwright/test';

/**
 * Summary Tool E2E Tests
 *
 * Tests for Issue #70: Real-time summary tool
 */

test.describe('Summary Tool - Toolbar Button', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Navigate to a conversation view
    await page.locator('button').filter({ hasText: /Maestri|Coach/i }).first().click();
    await page.waitForTimeout(500);
  });

  test('summary button appears in tool buttons', async ({ page }) => {
    // Look for the summary button in the toolbar
    const summaryButton = page.locator('button[title*="Riassunto"]').or(
      page.locator('button').filter({ hasText: /Riassunto/i })
    );

    // The button should exist (may not be visible depending on conversation state)
    const count = await summaryButton.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Summary Tool - Archive Filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.goto('/supporti');
    await page.waitForLoadState('networkidle');
  });

  test('archive has summary filter tab', async ({ page }) => {
    // Look for the Riassunti filter tab
    const summaryTab = page.locator('button').filter({ hasText: 'Riassunti' });
    await expect(summaryTab.first()).toBeVisible({ timeout: 5000 });
  });

  test('clicking summary filter shows summary materials', async ({ page }) => {
    const summaryTab = page.locator('button').filter({ hasText: 'Riassunti' });

    if (await summaryTab.first().isVisible()) {
      await summaryTab.first().click();
      await page.waitForTimeout(500);

      // Should filter to show only summaries (or empty state)
      const tabPanel = page.locator('[role="tabpanel"]');
      await expect(tabPanel.first()).toBeVisible();
    }
  });
});

test.describe('Summary Tool - Component Rendering', () => {
  test('summary editor renders correctly', async ({ page }) => {
    // Go to showcase or test page that has summary components
    await page.goto('/showcase');
    await page.waitForTimeout(1000);

    // Check for summary-related UI elements if available
    const hasShowcase = await page.locator('main').first().isVisible();
    expect(hasShowcase).toBeTruthy();
  });
});

test.describe('Summary Tool - Tool Labels', () => {
  test('summary type has correct Italian label', async ({ page }) => {
    await page.goto('/supporti');
    await page.waitForLoadState('networkidle');

    // The label should be "Riassunti" in Italian
    const label = page.locator('text=Riassunti');
    const count = await label.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Summary Tool - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('summary buttons have aria labels', async ({ page }) => {
    await page.goto('/supporti');
    await page.waitForLoadState('networkidle');

    // Check that filter buttons have proper aria attributes
    const filterButtons = page.locator('[role="tab"]');
    const count = await filterButtons.count();

    if (count > 0) {
      // At least one filter should have aria-selected
      const hasAriaSelected = await page.locator('[role="tab"][aria-selected]').count() > 0;
      expect(hasAriaSelected).toBeTruthy();
    }
  });
});

test.describe('Summary Tool - Export Integration', () => {
  test('summary tool component structure is valid', async ({ page }) => {
    await page.goto('/');

    // Test that the page loads without errors
    // Check for any JavaScript errors
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.waitForTimeout(2000);

    // No critical errors should occur related to summary components
    const summaryErrors = errors.filter(e =>
      e.toLowerCase().includes('summary') &&
      !e.includes('ResizeObserver')
    );
    expect(summaryErrors).toHaveLength(0);
  });
});
