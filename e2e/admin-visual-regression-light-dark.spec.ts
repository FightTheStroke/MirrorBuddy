/**
 * E2E Tests: Admin Visual Regression - Light & Dark Mode
 *
 * Visual regression tests for admin pages in light and dark modes
 * to ensure UI consistency after theming changes and prevent future regressions.
 *
 * F-01: Admin UI reorganized with shared design system (colors, components, spacing)
 *
 * Run: npx playwright test e2e/admin-visual-regression-light-dark.spec.ts
 * Update baselines: npx playwright test e2e/admin-visual-regression-light-dark.spec.ts --update-snapshots
 */

import { test, expect } from "./fixtures/auth-fixtures";
import {
  waitForPageReady,
  checkLayoutStability,
  checkSpacingConsistency,
  checkComponentRendering,
  ADMIN_VISUAL_ROUTES,
} from "./admin-visual-regression-helpers";

// ============================================================================
// LIGHT MODE TESTS
// ============================================================================

test.describe("Admin Visual Regression - Light Mode (F-01)", () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
    });
  });

  const pages = [
    { route: "/admin", name: "dashboard", file: "admin-dashboard-light.png" },
    { route: "/admin/users", name: "users", file: "admin-users-light.png" },
    {
      route: "/admin/invites",
      name: "invites",
      file: "admin-invites-light.png",
    },
    { route: "/admin/safety", name: "safety", file: "admin-safety-light.png" },
  ];

  for (const page of pages) {
    test(`${page.name} page consistency`, async ({ adminPage }) => {
      await adminPage.goto(page.route);
      await waitForPageReady(adminPage);

      const layoutIssues = await checkLayoutStability(adminPage);
      expect(layoutIssues).toHaveLength(0);

      const spacingIssues = await checkSpacingConsistency(adminPage);
      expect(spacingIssues).toHaveLength(0);

      const componentIssues = await checkComponentRendering(adminPage);
      expect(componentIssues).toHaveLength(0);

      await expect(adminPage).toHaveScreenshot(page.file, {
        fullPage: true,
      });
    });
  }
});

// ============================================================================
// DARK MODE TESTS
// ============================================================================

test.describe("Admin Visual Regression - Dark Mode (F-01)", () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
    });
  });

  const pagesDark = [
    { route: "/admin", name: "dashboard", file: "admin-dashboard-dark.png" },
    { route: "/admin/users", name: "users", file: "admin-users-dark.png" },
    {
      route: "/admin/invites",
      name: "invites",
      file: "admin-invites-dark.png",
    },
    { route: "/admin/safety", name: "safety", file: "admin-safety-dark.png" },
  ];

  for (const page of pagesDark) {
    test(`${page.name} page consistency (dark)`, async ({ adminPage }) => {
      await adminPage.goto(page.route);
      await waitForPageReady(adminPage);

      const layoutIssues = await checkLayoutStability(adminPage);
      expect(layoutIssues).toHaveLength(0);

      const spacingIssues = await checkSpacingConsistency(adminPage);
      expect(spacingIssues).toHaveLength(0);

      const componentIssues = await checkComponentRendering(adminPage);
      expect(componentIssues).toHaveLength(0);

      await expect(adminPage).toHaveScreenshot(page.file, {
        fullPage: true,
      });
    });
  }
});
