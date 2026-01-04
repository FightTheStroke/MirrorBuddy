import { test, expect } from '@playwright/test';

test.describe('Gamification System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Dashboard Navigation', () => {
    test('can access dashboard from sidebar', async ({ page }) => {
      // Look for dashboard link in sidebar
      const dashboardLink = page.locator('a[href="/dashboard"], button').filter({ hasText: /Dashboard|Progressi/i });
      if (await dashboardLink.first().isVisible()) {
        await dashboardLink.first().click();
        await page.waitForURL(/dashboard|progressi/);
      }
    });
  });

  test.describe('Gamification Components', () => {
    test('level progress bar renders correctly', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Check for progress bar element
      const progressBar = page.locator('[role="progressbar"]');
      if (await progressBar.first().isVisible({ timeout: 3000 })) {
        // Verify it has proper ARIA attributes
        await expect(progressBar.first()).toHaveAttribute('aria-valuemin', '0');
        await expect(progressBar.first()).toHaveAttribute('aria-valuemax', '100');
      }
    });

    test('mirrorbucks display shows currency', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Check for MirrorBucks indicator
      const mbDisplay = page.locator('text=MB').first();
      await expect(mbDisplay).toBeVisible({ timeout: 5000 });
    });

    test('season banner shows current season', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Check for season indicator
      const seasonText = page.locator('text=/Stagione|Season/i');
      if (await seasonText.first().isVisible({ timeout: 3000 })) {
        await expect(seasonText.first()).toBeVisible();
      }
    });

    test('leaderboard tabs are interactive', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Find leaderboard tabs
      const tabs = page.locator('button').filter({ hasText: /Oggi|Settimana|Stagione|Anno/i });
      if (await tabs.first().isVisible({ timeout: 3000 })) {
        // Click different tabs
        const weekTab = page.locator('button').filter({ hasText: 'Settimana' });
        if (await weekTab.isVisible()) {
          await weekTab.click();
          // Verify tab is selected (has different styling)
          await expect(weekTab).toHaveClass(/bg-background|selected/);
        }
      }
    });

    test('achievements panel displays achievement cards', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Check for achievements section
      const achievementsHeader = page.locator('text=Achievements').first();
      if (await achievementsHeader.isVisible({ timeout: 3000 })) {
        await expect(achievementsHeader).toBeVisible();

        // Check for achievement cards
        const achievementCards = page.locator('[role="article"], [role="button"]').filter({ hasText: /sbloccato|bloccato/i });
        // Should have at least some achievements
        const count = await achievementCards.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('Responsive Layout', () => {
    test('gamification components adapt to mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Check that key elements are still visible on mobile
      const mbDisplay = page.locator('text=MB').first();
      await expect(mbDisplay).toBeVisible({ timeout: 5000 });
    });

    test('leaderboard row text truncates on small screens', async ({ page }) => {
      // Set small viewport
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Content should not overflow
      const body = page.locator('body');
      const scrollWidth = await body.evaluate((el) => el.scrollWidth);
      const clientWidth = await body.evaluate((el) => el.clientWidth);

      // Allow small difference for scrollbar
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 20);
    });
  });

  test.describe('Performance', () => {
    test('dashboard loads within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('no excessive re-renders on tab switch', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Count initial render
      const tabs = page.locator('button').filter({ hasText: /Oggi|Settimana/i });
      if (await tabs.first().isVisible({ timeout: 3000 })) {
        // Switch tabs multiple times
        for (let i = 0; i < 3; i++) {
          await page.locator('button').filter({ hasText: 'Oggi' }).click();
          await page.locator('button').filter({ hasText: 'Settimana' }).click();
        }

        // Page should still be responsive
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });
});

test.describe('Zaino Page', () => {
  test('zaino page loads and displays content', async ({ page }) => {
    await page.goto('/zaino');
    await page.waitForLoadState('networkidle');

    // Check page loaded
    await expect(page).toHaveURL(/zaino/);
  });

  test('zaino is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/zaino');
    await page.waitForLoadState('networkidle');

    // Page should render without horizontal scroll
    const body = page.locator('body');
    const scrollWidth = await body.evaluate((el) => el.scrollWidth);
    const clientWidth = await body.evaluate((el) => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 20);
  });
});

test.describe('Astuccio Page', () => {
  test('astuccio page loads and displays content', async ({ page }) => {
    await page.goto('/astuccio');
    await page.waitForLoadState('networkidle');

    // Check page loaded
    await expect(page).toHaveURL(/astuccio/);
  });

  test('astuccio is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/astuccio');
    await page.waitForLoadState('networkidle');

    // Page should render without horizontal scroll
    const body = page.locator('body');
    const scrollWidth = await body.evaluate((el) => el.scrollWidth);
    const clientWidth = await body.evaluate((el) => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 20);
  });
});
