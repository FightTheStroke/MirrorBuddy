/**
 * E2E Tests: Analytics Page Responsive Grid
 *
 * Tests analytics page grid layout on mobile, tablet, and desktop viewports
 * F-45: Analytics page grid 2 columns on mobile
 *
 * Acceptance Criteria:
 * 1. Analytics cards show 2 columns on mobile
 * 2. 1 column on very small screens (xs < 375px)
 * 3. Full-width cards for complex charts
 * 4. Proper spacing with gap-3 on mobile
 * 5. Cards don't overflow horizontally
 *
 * Run: npx playwright test e2e/analytics-responsive-grid.spec.ts
 */

import { test, expect } from "./fixtures/auth-fixtures";
import {
  waitForPageReady,
  checkLayoutStability,
} from "./admin-visual-regression-helpers";

// ============================================================================
// ANALYTICS GRID RESPONSIVE TESTS
// ============================================================================

test.describe("Analytics Page Grid - Very Small Mobile (xs < 375px)", () => {
  test.use({ viewport: { width: 320, height: 667 } }); // Very small mobile

  test("analytics - 1 column on very small screens", async ({ adminPage }) => {
    await adminPage.goto("/admin/analytics");
    await waitForPageReady(adminPage);

    // Check detailed cards grid (the main grid)
    const detailedCardsGrid = await adminPage
      .locator("div.grid.grid-cols-1.lg\\:grid-cols-2")
      .first();

    // Get computed grid template columns
    const gridTemplateColumns = await detailedCardsGrid.evaluate((el) => {
      return window.getComputedStyle(el).gridTemplateColumns;
    });

    // Should show 1 column (single value or auto)
    expect(gridTemplateColumns).not.toContain(" ");

    // Verify no horizontal overflow
    const bodyWidth = await adminPage.evaluate(() => {
      return Math.max(
        document.body.scrollWidth,
        document.documentElement.scrollWidth,
      );
    });

    expect(
      bodyWidth,
      `Content wider than viewport: ${bodyWidth} > 320`,
    ).toBeLessThanOrEqual(330); // Allow small margin
  });

  test("analytics - cards are full width on very small screens", async ({
    adminPage,
  }) => {
    await adminPage.goto("/admin/analytics");
    await waitForPageReady(adminPage);

    const card = await adminPage.locator('[role="region"] >> nth=0').first();

    if (card) {
      const cardWidth = await card.evaluate((el) => {
        return el.getBoundingClientRect().width;
      });

      const viewportWidth = 320;

      // Card should be nearly full width (allowing for padding)
      expect(cardWidth).toBeGreaterThan(viewportWidth * 0.85);
    }
  });
});

test.describe("Analytics Page Grid - Mobile (375px - 640px)", () => {
  test.use({ viewport: { width: 375, height: 667 } }); // Mobile: iPhone SE

  test("analytics - 2 columns on mobile", async ({ adminPage }) => {
    await adminPage.goto("/admin/analytics");
    await waitForPageReady(adminPage);

    // Check detailed cards grid
    const detailedCardsGrid = await adminPage
      .locator("div.grid.grid-cols-1.lg\\:grid-cols-2")
      .first();

    if (detailedCardsGrid) {
      // Get all cards within the grid
      const _cards = await detailedCardsGrid.locator('[role="region"]').all();

      // We expect cards to be laid out in 2 columns on mobile
      // This is verified by checking the computed grid template columns
      const gridStyle = await detailedCardsGrid.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          gridTemplateColumns: style.gridTemplateColumns,
          gap: style.gap,
        };
      });

      // gridTemplateColumns should have 2 columns (e.g., "1fr 1fr" or similar)
      const columnCount = (gridStyle.gridTemplateColumns.match(/\d+fr/g) || [])
        .length;
      expect(columnCount).toBe(2);

      // Check gap is present (gap-3 = 0.75rem = 12px)
      expect(gridStyle.gap).toBeTruthy();
    }
  });

  test("analytics - no horizontal overflow on mobile", async ({
    adminPage,
  }) => {
    await adminPage.goto("/admin/analytics");
    await waitForPageReady(adminPage);

    const layoutIssues = await checkLayoutStability(adminPage);
    expect(
      layoutIssues,
      `Mobile layout issues: ${layoutIssues.join(", ")}`,
    ).toHaveLength(0);

    const bodyWidth = await adminPage.evaluate(() => {
      return Math.max(
        document.body.scrollWidth,
        document.documentElement.scrollWidth,
      );
    });
    const viewportWidth = 375;

    expect(
      bodyWidth,
      `Content wider than viewport: ${bodyWidth} > ${viewportWidth}`,
    ).toBeLessThanOrEqual(viewportWidth + 10);
  });

  test("analytics - cards have proper spacing on mobile", async ({
    adminPage,
  }) => {
    await adminPage.goto("/admin/analytics");
    await waitForPageReady(adminPage);

    const detailedCardsGrid = await adminPage
      .locator("div.grid.grid-cols-1.lg\\:grid-cols-2")
      .first();

    if (detailedCardsGrid) {
      const gridGap = await detailedCardsGrid.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return parseFloat(style.gap);
      });

      // gap-3 should be approximately 12px (0.75rem)
      // Accept 10-16px range for browser rendering differences
      expect(gridGap).toBeGreaterThanOrEqual(10);
      expect(gridGap).toBeLessThanOrEqual(16);
    }
  });

  test("analytics - screenshot mobile layout", async ({ adminPage }) => {
    await adminPage.goto("/admin/analytics");
    await waitForPageReady(adminPage);

    await expect(adminPage).toHaveScreenshot("analytics-mobile-grid.png", {
      fullPage: true,
    });
  });
});

test.describe("Analytics Page Grid - Tablet (640px - 1024px)", () => {
  test.use({ viewport: { width: 768, height: 1024 } }); // Tablet: iPad

  test("analytics - responsive columns on tablet", async ({ adminPage }) => {
    await adminPage.goto("/admin/analytics");
    await waitForPageReady(adminPage);

    const detailedCardsGrid = await adminPage
      .locator("div.grid.grid-cols-1.lg\\:grid-cols-2")
      .first();

    if (detailedCardsGrid) {
      const gridStyle = await detailedCardsGrid.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          gridTemplateColumns: style.gridTemplateColumns,
        };
      });

      // On tablet (640px < 768px < 1024px), should still show 2 columns
      // until lg breakpoint (1024px)
      const columnCount = (gridStyle.gridTemplateColumns.match(/\d+fr/g) || [])
        .length;
      expect(columnCount).toBe(2);
    }
  });

  test("analytics - no layout issues on tablet", async ({ adminPage }) => {
    await adminPage.goto("/admin/analytics");
    await waitForPageReady(adminPage);

    const layoutIssues = await checkLayoutStability(adminPage);
    expect(
      layoutIssues,
      `Tablet layout issues: ${layoutIssues.join(", ")}`,
    ).toHaveLength(0);
  });

  test("analytics - screenshot tablet layout", async ({ adminPage }) => {
    await adminPage.goto("/admin/analytics");
    await waitForPageReady(adminPage);

    await expect(adminPage).toHaveScreenshot("analytics-tablet-grid.png", {
      fullPage: true,
    });
  });
});

test.describe("Analytics Page Grid - Desktop (1024px+)", () => {
  test.use({ viewport: { width: 1440, height: 900 } }); // Desktop

  test("analytics - 2 columns on desktop lg breakpoint", async ({
    adminPage,
  }) => {
    await adminPage.goto("/admin/analytics");
    await waitForPageReady(adminPage);

    const detailedCardsGrid = await adminPage
      .locator("div.grid.grid-cols-1.lg\\:grid-cols-2")
      .first();

    if (detailedCardsGrid) {
      const gridStyle = await detailedCardsGrid.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          gridTemplateColumns: style.gridTemplateColumns,
        };
      });

      // On desktop (≥1024px), should show 2 columns (lg:grid-cols-2)
      const columnCount = (gridStyle.gridTemplateColumns.match(/\d+fr/g) || [])
        .length;
      expect(columnCount).toBe(2);
    }
  });

  test("analytics - screenshot desktop layout", async ({ adminPage }) => {
    await adminPage.goto("/admin/analytics");
    await waitForPageReady(adminPage);

    await expect(adminPage).toHaveScreenshot("analytics-desktop-grid.png", {
      fullPage: true,
    });
  });
});

test.describe("Analytics Page - Stats Grid Responsive", () => {
  test("stats grid - 2 columns on mobile", async ({ adminPage }) => {
    adminPage.setViewportSize({ width: 375, height: 667 });
    await adminPage.goto("/admin/analytics");
    await waitForPageReady(adminPage);

    // The top stats grid (line 183: grid-cols-1 sm:grid-cols-2 lg:grid-cols-5)
    const statsGrid = await adminPage
      .locator("div.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-5")
      .first();

    if (statsGrid) {
      const gridStyle = await statsGrid.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          gridTemplateColumns: style.gridTemplateColumns,
        };
      });

      // On mobile (375px, which is < 640px sm), should show 1 column
      const columnCount = (gridStyle.gridTemplateColumns.match(/\d+fr/g) || [])
        .length;
      expect(columnCount).toBe(1);
    }
  });

  test("stats grid - 2 columns on sm breakpoint", async ({ adminPage }) => {
    adminPage.setViewportSize({ width: 640, height: 667 });
    await adminPage.goto("/admin/analytics");
    await waitForPageReady(adminPage);

    const statsGrid = await adminPage
      .locator("div.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-5")
      .first();

    if (statsGrid) {
      const gridStyle = await statsGrid.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          gridTemplateColumns: style.gridTemplateColumns,
        };
      });

      // At sm breakpoint (640px), should show 2 columns
      const columnCount = (gridStyle.gridTemplateColumns.match(/\d+fr/g) || [])
        .length;
      expect(columnCount).toBe(2);
    }
  });
});
