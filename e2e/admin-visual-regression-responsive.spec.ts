/**
 * E2E Tests: Admin Visual Regression - Responsive Design
 *
 * Visual regression tests for admin pages on mobile and tablet viewports
 * F-01: Admin UI responsive design verification
 *
 * Run: npx playwright test e2e/admin-visual-regression-responsive.spec.ts
 */

import { test, expect } from "./fixtures/auth-fixtures";
import {
  waitForPageReady,
  checkLayoutStability,
  checkSpacingConsistency,
} from "./admin-visual-regression-helpers";

// ============================================================================
// RESPONSIVE DESIGN TESTS
// ============================================================================

test.describe("Admin Visual Regression - Mobile Responsive (F-01)", () => {
  test.use({ viewport: { width: 375, height: 667 } }); // Mobile: iPhone SE

  test("admin dashboard mobile - no horizontal scroll", async ({
    adminPage,
  }) => {
    await adminPage.goto("/admin");
    await waitForPageReady(adminPage);

    const layoutIssues = await checkLayoutStability(adminPage);
    expect(
      layoutIssues,
      `Mobile layout issues: ${layoutIssues.join(", ")}`,
    ).toHaveLength(0);

    // Verify no horizontal scroll on mobile
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
    ).toBeLessThanOrEqual(viewportWidth + 10); // Allow 10px margin

    await expect(adminPage).toHaveScreenshot("admin-dashboard-mobile.png", {
      fullPage: true,
    });
  });

  test("admin users mobile - responsive grid", async ({ adminPage }) => {
    await adminPage.goto("/admin/users");
    await waitForPageReady(adminPage);

    const spacingIssues = await checkSpacingConsistency(adminPage);
    expect(
      spacingIssues,
      `Mobile spacing issues: ${spacingIssues.join(", ")}`,
    ).toHaveLength(0);

    const bodyWidth = await adminPage.evaluate(() => {
      return Math.max(
        document.body.scrollWidth,
        document.documentElement.scrollWidth,
      );
    });

    expect(bodyWidth).toBeLessThanOrEqual(385);
    await expect(adminPage).toHaveScreenshot("admin-users-mobile.png", {
      fullPage: true,
    });
  });

  test("admin invites mobile - responsive layout", async ({ adminPage }) => {
    await adminPage.goto("/admin/invites");
    await waitForPageReady(adminPage);

    const layoutIssues = await checkLayoutStability(adminPage);
    expect(layoutIssues).toHaveLength(0);

    await expect(adminPage).toHaveScreenshot("admin-invites-mobile.png", {
      fullPage: true,
    });
  });
});

test.describe("Admin Visual Regression - Tablet Responsive (F-01)", () => {
  test.use({ viewport: { width: 768, height: 1024 } }); // Tablet: iPad

  test("admin dashboard tablet - responsive layout", async ({ adminPage }) => {
    await adminPage.goto("/admin");
    await waitForPageReady(adminPage);

    const layoutIssues = await checkLayoutStability(adminPage);
    expect(
      layoutIssues,
      `Tablet layout issues: ${layoutIssues.join(", ")}`,
    ).toHaveLength(0);

    const spacingIssues = await checkSpacingConsistency(adminPage);
    expect(
      spacingIssues,
      `Tablet spacing issues: ${spacingIssues.join(", ")}`,
    ).toHaveLength(0);

    await expect(adminPage).toHaveScreenshot("admin-dashboard-tablet.png", {
      fullPage: true,
    });
  });

  test("admin users tablet - grid adaptation", async ({ adminPage }) => {
    await adminPage.goto("/admin/users");
    await waitForPageReady(adminPage);

    const spacingIssues = await checkSpacingConsistency(adminPage);
    expect(spacingIssues).toHaveLength(0);

    await expect(adminPage).toHaveScreenshot("admin-users-tablet.png", {
      fullPage: true,
    });
  });
});
