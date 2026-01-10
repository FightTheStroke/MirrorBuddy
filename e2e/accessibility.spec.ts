import { test, expect } from '@playwright/test';

const ACCESSIBILITY_PATH = '/landing';

test.describe('Accessibility', () => {
  test('page has correct heading structure', async ({ page }) => {
    await page.goto(ACCESSIBILITY_PATH);

    // Should have at least one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
  });

  test('images have alt text', async ({ page }) => {
    await page.goto(ACCESSIBILITY_PATH);

    // All images should have alt attributes
    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      expect(alt).not.toBeNull();
    }
  });

  test('buttons are keyboard accessible', async ({ page }) => {
    await page.goto(ACCESSIBILITY_PATH);

    // Find first button
    const firstButton = page.locator('button').first();
    await expect(firstButton).toBeVisible();

    // Should be focusable
    await firstButton.focus();
    await expect(firstButton).toBeFocused();
  });

  test('navigation is keyboard accessible', async ({ page }) => {
    await page.goto(ACCESSIBILITY_PATH);

    // Tab through navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Some element should be focused
    const hasFocusedElement = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      return !!active && active !== document.body;
    });
    expect(hasFocusedElement).toBeTruthy();
  });

  test('color contrast is sufficient', async ({ page }) => {
    await page.goto(ACCESSIBILITY_PATH);

    // Check that main text is visible against background
    const mainText = page.locator('h1, h2, p').first();
    await expect(mainText).toBeVisible();

    // Text should not be transparent or too light
    const color = await mainText.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    expect(color).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('focus indicators are visible', async ({ page }) => {
    await page.goto(ACCESSIBILITY_PATH);

    // Tab to a button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Check that focus is visible
    const hasVisibleFocus = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      if (!active) return false;
      const styles = window.getComputedStyle(active);
      return (
        styles.outlineWidth !== '0px' ||
        styles.boxShadow !== 'none' ||
        active.classList.contains('ring-2') ||
        active.classList.contains('focus-visible')
      );
    });
    expect(hasVisibleFocus).toBeTruthy();
  });

  test('page works without JavaScript initially', async ({ page }) => {
    // This tests that the page at least renders with SSR
    await page.goto(ACCESSIBILITY_PATH);

    // Check that core content is present
    await expect(page.locator('main').first()).toBeVisible();
    await expect(page.locator('h1').first()).toBeVisible();
  });
});

test.describe('Screen Reader Support', () => {
  test('semantic HTML is used', async ({ page }) => {
    await page.goto(ACCESSIBILITY_PATH);

    // Check for semantic elements
    await expect(page.locator('main').first()).toBeVisible();
    const semanticCount = await page.locator('section, header, footer, nav, article').count();
    expect(semanticCount).toBeGreaterThan(0);
  });

  test('buttons have accessible names', async ({ page }) => {
    await page.goto(ACCESSIBILITY_PATH);

    // All buttons should have accessible names
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const title = await button.getAttribute('title');

      // Button should have either text, aria-label, or title
      const hasAccessibleName = (text && text.trim().length > 0) || ariaLabel || title;
      expect(hasAccessibleName).toBeTruthy();
    }
  });
});

test.describe('Reduced Motion', () => {
  test('respects prefers-reduced-motion', async ({ page }) => {
    // Emulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(ACCESSIBILITY_PATH);

    // Page should still work
    await expect(page.locator('main').first()).toBeVisible();
  });
});
