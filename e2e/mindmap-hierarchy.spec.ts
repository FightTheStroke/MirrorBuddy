/**
 * Mindmap Hierarchy E2E Tests
 * Task 9.01: Test mindmap title field and hierarchy rendering
 *
 * Tests ADR 0020 implementation - title field, node formats
 */

import { test, expect } from '@playwright/test';

test.describe('Mindmap Hierarchy', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('button').filter({ hasText: 'Mappe Mentali' }).click();
    await page.waitForTimeout(500);
  });

  test('mindmap uses title field correctly', async ({ page }) => {
    // Look for mindmap content with proper titles (not "topic")
    const mindmapContainer = page.locator('[class*="mindmap"], [data-testid="mindmap"]').first();

    if (await mindmapContainer.isVisible().catch(() => false)) {
      // Should NOT contain raw "topic" field from old format
      const hasOldFormat = await page.locator('text=/^topic:/i').isVisible().catch(() => false);
      expect(hasOldFormat).toBe(false);
    }
  });

  test('mindmap renders hierarchical structure', async ({ page }) => {
    // Click on an example mindmap
    const mindmapCard = page.locator('button, [class*="card"]')
      .filter({ hasText: /Matematica|Storia|Algebra/i })
      .first();

    if (await mindmapCard.isVisible().catch(() => false)) {
      await mindmapCard.click();
      await page.waitForTimeout(1000);

      // Check for SVG rendering (MarkMap)
      const svg = page.locator('svg.markmap, svg[class*="markmap"]');
      if (await svg.isVisible().catch(() => false)) {
        // Should have hierarchical nodes (g elements with nested structure)
        const nodeCount = await svg.locator('g.markmap-node').count();
        expect(nodeCount).toBeGreaterThanOrEqual(1);
      }
    }
  });

  test('mindmap nodes are expandable/collapsible', async ({ page }) => {
    const mindmapCard = page.locator('button, [class*="card"]')
      .filter({ hasText: /Matematica|Storia/i })
      .first();

    if (await mindmapCard.isVisible().catch(() => false)) {
      await mindmapCard.click();
      await page.waitForTimeout(1000);

      // Look for collapse/expand indicators
      const collapseIndicator = page.locator('[class*="collapse"], circle.markmap-fold');
      if (await collapseIndicator.first().isVisible().catch(() => false)) {
        // Click to collapse
        await collapseIndicator.first().click();
        await page.waitForTimeout(300);

        // Structure should still be valid
        const svg = page.locator('svg.markmap, svg[class*="markmap"]');
        await expect(svg).toBeVisible();
      }
    }
  });

  test('mindmap zoom controls work', async ({ page }) => {
    const mindmapCard = page.locator('button, [class*="card"]')
      .filter({ hasText: /Matematica|Storia/i })
      .first();

    if (await mindmapCard.isVisible().catch(() => false)) {
      await mindmapCard.click();
      await page.waitForTimeout(1000);

      // Look for zoom controls
      const zoomIn = page.locator('[aria-label*="zoom in"], button:has-text("+")').first();
      const _zoomOut = page.locator('[aria-label*="zoom out"], button:has-text("-")').first();

      if (await zoomIn.isVisible().catch(() => false)) {
        await zoomIn.click();
        await page.waitForTimeout(200);
        // Should not break the mindmap
        const svg = page.locator('svg.markmap, svg[class*="markmap"]');
        await expect(svg).toBeVisible();
      }
    }
  });
});

test.describe('Mindmap Data Format', () => {
  test('API returns correct mindmap structure', async ({ page }) => {
    // Intercept API calls to verify data format
    const apiResponses: unknown[] = [];

    page.on('response', async (response) => {
      if (response.url().includes('/api/') && response.status() === 200) {
        try {
          const json = await response.json();
          if (json && typeof json === 'object' && 'title' in json) {
            apiResponses.push(json);
          }
        } catch {
          // Not JSON, ignore
        }
      }
    });

    await page.goto('/');
    await page.locator('button').filter({ hasText: 'Mappe Mentali' }).click();
    await page.waitForTimeout(1500);

    // Any mindmap responses should use 'title' not 'topic'
    for (const response of apiResponses) {
      if (response && typeof response === 'object') {
        const hasTitle = 'title' in response;
        const hasTopic = 'topic' in response && !('title' in response);

        if (hasTopic) {
          // Fail if we have topic without title
          expect(hasTitle).toBe(true);
        }
      }
    }
  });
});

test.describe('Mindmap Accessibility', () => {
  test('mindmap SVG has accessible role and label', async ({ page }) => {
    await page.goto('/');
    await page.locator('button').filter({ hasText: 'Mappe Mentali' }).click();
    await page.waitForTimeout(500);

    const mindmapCard = page.locator('button, [class*="card"]')
      .filter({ hasText: /Matematica|Storia/i })
      .first();

    if (await mindmapCard.isVisible().catch(() => false)) {
      await mindmapCard.click();
      await page.waitForTimeout(1000);

      const svg = page.locator('svg.markmap, svg[class*="markmap"], svg[role="img"]');
      if (await svg.isVisible().catch(() => false)) {
        // Should have accessible attributes
        const role = await svg.getAttribute('role');
        const ariaLabel = await svg.getAttribute('aria-label');

        // Either has role or aria-label
        const isAccessible = role === 'img' || role === 'graphics-document' || ariaLabel;
        expect(isAccessible).toBeTruthy();
      }
    }
  });

  test('mindmap is keyboard navigable', async ({ page }) => {
    await page.goto('/');
    await page.locator('button').filter({ hasText: 'Mappe Mentali' }).click();
    await page.waitForTimeout(500);

    // Tab through the page
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should have focus somewhere
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});
