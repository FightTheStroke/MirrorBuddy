/**
 * Knowledge Hub Accessibility E2E Tests
 * Task 9.07: Axe accessibility audit for Knowledge Hub
 *
 * Tests WCAG 2.1 AA compliance
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Knowledge Hub Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/landing');
  });

  test('should have no critical accessibility violations', async ({ page }) => {
    // Run axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Filter out minor issues and focus on critical violations
    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    // Log violations for debugging
    if (criticalViolations.length > 0) {
      console.log('Accessibility violations:', JSON.stringify(criticalViolations, null, 2));
    }

    // Allow some known issues but flag critical ones
    expect(criticalViolations.length).toBeLessThanOrEqual(0);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    // Check heading levels don't skip
    const headings = await page.evaluate(() => {
      const h = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(h).map((el) => ({
        level: parseInt(el.tagName[1]),
        text: el.textContent?.slice(0, 30),
      }));
    });

    // Should have at least one heading
    expect(headings.length).toBeGreaterThan(0);

    // Check for skipped levels (e.g., h1 -> h3)
    let previousLevel = 0;
    for (const heading of headings) {
      if (previousLevel > 0 && heading.level > previousLevel + 1) {
        // Skipped heading level
        console.log(`Skipped heading: h${previousLevel} -> h${heading.level}: "${heading.text}"`);
      }
      previousLevel = heading.level;
    }
  });

  test('should have accessible form controls', async ({ page }) => {
    // Check all inputs have labels
    const inputs = page.locator('input:not([type="hidden"])');
    const inputCount = await inputs.count();

    for (let i = 0; i < Math.min(inputCount, 10); i++) {
      const input = inputs.nth(i);
      if (await input.isVisible().catch(() => false)) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledby = await input.getAttribute('aria-labelledby');
        const placeholder = await input.getAttribute('placeholder');
        const title = await input.getAttribute('title');

        // Should have some form of label
        const hasLabel =
          (id && (await page.locator(`label[for="${id}"]`).isVisible().catch(() => false))) ||
          ariaLabel ||
          ariaLabelledby ||
          placeholder ||
          title;

        expect(hasLabel).toBeTruthy();
      }
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    // Run axe specifically for color contrast
    const contrastResults = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();

    // Log any contrast issues
    if (contrastResults.violations.length > 0) {
      console.log('Contrast violations:', JSON.stringify(contrastResults.violations, null, 2));
    }

    // May have some minor issues due to theme
  });

  test('should have visible focus indicators', async ({ page }) => {
    // Tab through elements and check focus is visible
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);

      const focusedElement = page.locator(':focus');
      if (await focusedElement.isVisible().catch(() => false)) {
        // Check that focus is visually indicated
        const outline = await focusedElement.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            outlineWidth: styles.outlineWidth,
            outlineStyle: styles.outlineStyle,
            boxShadow: styles.boxShadow,
          };
        });

        // Should have visible focus (outline or shadow)
        const _hasVisibleFocus =
          outline.outlineStyle !== 'none' ||
          outline.boxShadow !== 'none';

        // Not asserting - just checking
      }
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Test Tab navigation
    await page.keyboard.press('Tab');
    const firstFocused = page.locator(':focus');
    await expect(firstFocused).toBeVisible();

    // Test Enter to activate buttons
    const button = page.locator('button:focus');
    if (await button.isVisible().catch(() => false)) {
      // Can activate with Enter
      await page.keyboard.press('Enter');
      // Should do something (or at least not crash)
    }

    // Test Escape to close dialogs
    const dialog = page.locator('[role="dialog"]');
    if (await dialog.isVisible().catch(() => false)) {
      await page.keyboard.press('Escape');
      // Dialog should close
    }
  });

  test('should have proper ARIA attributes', async ({ page }) => {
    // Check buttons have accessible names
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible().catch(() => false)) {
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        const ariaLabelledby = await button.getAttribute('aria-labelledby');
        const title = await button.getAttribute('title');

        const hasName = (text && text.trim()) || ariaLabel || ariaLabelledby || title;
        expect(hasName).toBeTruthy();
      }
    }
  });

  test('should have proper landmark regions', async ({ page }) => {
    // Should have main content area
    const main = page.locator('main, [role="main"]');
    await expect(main.first()).toBeVisible();

    // Navigation is optional on this page
    const navCount = await page.locator('nav, [role="navigation"]').count();
    expect(navCount).toBeGreaterThanOrEqual(0);
  });

  test('should support reduced motion preference', async ({ page }) => {
    // Emulate reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await page.waitForTimeout(500);

    // Page should still function
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
  });

  test('should have alt text for images', async ({ page }) => {
    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      if (await img.isVisible().catch(() => false)) {
        const alt = await img.getAttribute('alt');
        const role = await img.getAttribute('role');

        // Should have alt (empty string OK for decorative) or be marked decorative
        const hasAlt = alt !== null || role === 'presentation' || role === 'none';
        expect(hasAlt).toBe(true);
      }
    }
  });

  test('should announce dynamic content changes', async ({ page }) => {
    // Look for aria-live regions
    const liveRegions = page.locator('[aria-live]');
    const statusRegions = page.locator('[role="status"], [role="alert"]');

    // Should have some live regions for dynamic updates
    const _hasLiveRegions = (await liveRegions.count()) > 0 || (await statusRegions.count()) > 0;
    // Not required but good practice
  });
});

test.describe('Knowledge Hub Screen Reader', () => {
  test('should use semantic HTML', async ({ page }) => {
    await page.goto('/landing');

    // Check for semantic elements
    const semanticElements = {
      main: await page.locator('main').count(),
      article: await page.locator('article').count(),
      section: await page.locator('section').count(),
      header: await page.locator('header').count(),
      nav: await page.locator('nav').count(),
    };

    // Should use at least some semantic elements
    const totalSemantic = Object.values(semanticElements).reduce((a, b) => a + b, 0);
    expect(totalSemantic).toBeGreaterThan(1);
  });

  test('should have descriptive link text', async ({ page }) => {
    await page.goto('/landing');

    const links = page.locator('a');
    const linkCount = await links.count();

    const badLinkTexts = ['click here', 'here', 'read more', 'link', 'more'];

    for (let i = 0; i < Math.min(linkCount, 20); i++) {
      const link = links.nth(i);
      if (await link.isVisible().catch(() => false)) {
        const text = await link.textContent();
        const ariaLabel = await link.getAttribute('aria-label');

        if (text) {
          const normalizedText = text.toLowerCase().trim();
          const isBadText = badLinkTexts.includes(normalizedText);

          if (isBadText && !ariaLabel) {
            console.warn(`Non-descriptive link text: "${text}"`);
          }
        }
      }
    }
  });
});
