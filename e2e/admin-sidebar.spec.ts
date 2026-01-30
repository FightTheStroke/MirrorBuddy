/**
 * E2E Tests: Admin Sidebar Navigation
 *
 * Tests click-based sidebar navigation (not goto).
 * F-01: Click each sidebar link navigates correctly
 * F-02: No 404 responses during navigation
 * F-03: "Torna all'app" button navigation
 * F-04: Sidebar collapse/expand toggle
 * F-05: Admin logo links to dashboard
 *
 * Run: npx playwright test e2e/admin-sidebar.spec.ts
 *
 * Consolidated from:
 * - full-ui-audit/admin-sidebar-navigation.spec.ts (click-based sidebar tests)
 *
 * Related: e2e/admin.spec.ts (login flow + route audit)
 */

import { test, expect } from "./fixtures/auth-fixtures";
import {
  ADMIN_IGNORE_ERRORS,
  ADMIN_NAV_ITEMS,
  dismissBlockingModals,
  closeOpenDialogs,
  type NavigationIssue,
} from "./admin-helpers";

test.describe("Admin Sidebar Navigation", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("F-01: clicking each sidebar link navigates correctly", async ({
    adminPage,
  }) => {
    await dismissBlockingModals(adminPage);
    const issues: NavigationIssue[] = [];
    const consoleErrors: string[] = [];

    adminPage.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (!ADMIN_IGNORE_ERRORS.some((p) => p.test(text))) {
          consoleErrors.push(text);
        }
      }
    });

    await adminPage.goto("/admin");
    await adminPage.waitForLoadState("domcontentloaded");
    await closeOpenDialogs(adminPage);

    for (const navItem of ADMIN_NAV_ITEMS) {
      const sidebarLink = adminPage
        .locator("aside")
        .locator("a", { hasText: navItem.label })
        .first();

      if (
        !(await sidebarLink.isVisible({ timeout: 2000 }).catch(() => false))
      ) {
        issues.push({
          link: navItem.label,
          expected: navItem.href,
          actual: "NOT FOUND",
          type: "error",
        });
        continue;
      }

      const expectedPath = navItem.href;
      await Promise.all([
        adminPage.waitForURL(
          (url) =>
            navItem.exact
              ? url.pathname === expectedPath
              : url.pathname.startsWith(expectedPath),
          { timeout: 10000 },
        ),
        sidebarLink.click({ force: true }),
      ]).catch(() => {});
      await adminPage.waitForLoadState("domcontentloaded");
      await closeOpenDialogs(adminPage);

      const pathname = new URL(adminPage.url()).pathname;

      if (navItem.exact) {
        if (pathname !== navItem.href) {
          issues.push({
            link: navItem.label,
            expected: navItem.href,
            actual: pathname,
            type: pathname.includes("404") ? "404" : "redirect",
          });
        }
      } else {
        if (!pathname.startsWith(navItem.href)) {
          issues.push({
            link: navItem.label,
            expected: navItem.href,
            actual: pathname,
            type: pathname.includes("404") ? "404" : "redirect",
          });
        }
      }

      await adminPage.waitForTimeout(500);
      const mainElement = adminPage.locator("main").first();
      const hasMainElement = await mainElement.isVisible().catch(() => false);

      if (!hasMainElement) {
        issues.push({
          link: navItem.label,
          expected: "visible <main> element",
          actual: "no main element",
          type: "error",
        });
      }
    }

    if (issues.length > 0) {
      console.log("\n=== ADMIN SIDEBAR NAVIGATION ISSUES ===");
      issues.forEach((issue) => {
        console.log(
          `  [${issue.type.toUpperCase()}] "${issue.link}": expected ${issue.expected}, got ${issue.actual}`,
        );
      });
    }

    expect(issues, `Found ${issues.length} navigation issues.`).toHaveLength(0);
    expect(
      consoleErrors,
      `Console errors: ${consoleErrors.join(", ")}`,
    ).toHaveLength(0);
  });

  test("F-03: 'Torna all\\'app' button navigates to home", async ({
    adminPage,
  }) => {
    await dismissBlockingModals(adminPage);
    let navigationTo404 = false;

    adminPage.on("response", (response) => {
      if (response.status() === 404) navigationTo404 = true;
    });

    await adminPage.goto("/admin");
    await adminPage.waitForLoadState("domcontentloaded");
    await closeOpenDialogs(adminPage);

    const tornaLink = adminPage.locator("aside").locator('a[href="/"]').first();
    const tornaButton = (await tornaLink.isVisible().catch(() => false))
      ? tornaLink
      : adminPage
          .locator("aside")
          .locator("a")
          .filter({ hasText: /Torna.*app/i })
          .first();

    await expect(
      tornaButton,
      "'Torna all'app' button should be visible",
    ).toBeVisible();

    await Promise.all([
      adminPage.waitForURL((url) => !url.pathname.startsWith("/admin"), {
        timeout: 10000,
      }),
      tornaButton.click({ force: true }),
    ]);
    await adminPage.waitForLoadState("domcontentloaded");

    const pathname = new URL(adminPage.url()).pathname;
    const validDestinations = ["/", "/welcome", "/landing"];
    const isValidDestination = validDestinations.some(
      (dest) => pathname === dest || pathname.startsWith(dest),
    );

    expect(pathname, `MUST NOT navigate to "/home" (bug)`).not.toBe("/home");
    expect(
      isValidDestination,
      `Should go to main app but went to "${pathname}"`,
    ).toBe(true);
    expect(navigationTo404, "Should not result in 404").toBe(false);
    expect(
      pathname.startsWith("/admin"),
      `Should navigate away from admin`,
    ).toBe(false);
  });

  test("F-04: sidebar collapse/expand toggle works", async ({ adminPage }) => {
    await dismissBlockingModals(adminPage);

    await adminPage.goto("/admin");
    await adminPage.waitForLoadState("domcontentloaded");
    await closeOpenDialogs(adminPage);

    const sidebar = adminPage.locator("aside").first();
    await expect(sidebar).toBeVisible();

    const toggleButton = sidebar.locator(
      'button[aria-label*="Comprimi"], button[aria-label*="Espandi"]',
    );

    if (await toggleButton.isVisible().catch(() => false)) {
      const initialBox = await sidebar.boundingBox();
      const initialWidth = initialBox?.width || 0;

      await toggleButton.click({ force: true });
      await adminPage.waitForTimeout(400);

      const newBox = await sidebar.boundingBox();
      const newWidth = newBox?.width || 0;

      expect(newWidth, "Sidebar width should change after toggle").not.toBe(
        initialWidth,
      );

      await toggleButton.click({ force: true });
      await adminPage.waitForTimeout(400);

      const finalBox = await sidebar.boundingBox();
      const finalWidth = finalBox?.width || 0;

      expect(
        Math.abs(finalWidth - initialWidth),
        "Sidebar should return to original width",
      ).toBeLessThan(10);
    }
  });

  test("F-05: admin logo links to admin dashboard", async ({ adminPage }) => {
    await dismissBlockingModals(adminPage);

    await adminPage.goto("/admin/users");
    await adminPage.waitForLoadState("domcontentloaded");
    await closeOpenDialogs(adminPage);

    const logoLink = adminPage
      .locator("aside")
      .locator('a[href="/admin"]')
      .first();

    if (await logoLink.isVisible().catch(() => false)) {
      await logoLink.click({ force: true });
      await adminPage.waitForLoadState("domcontentloaded");
      await adminPage.waitForTimeout(500);

      const pathname = new URL(adminPage.url()).pathname;
      expect(pathname, "Logo should link to /admin").toBe("/admin");
    }
  });

  test("F-02: no 404 responses during admin navigation", async ({
    adminPage,
  }) => {
    await dismissBlockingModals(adminPage);
    const notFoundUrls: string[] = [];

    adminPage.on("response", (response) => {
      const url = response.url();
      if (
        response.status() === 404 &&
        !url.includes(".js") &&
        !url.includes(".css") &&
        !url.includes(".png") &&
        !url.includes(".ico")
      ) {
        notFoundUrls.push(url);
      }
    });

    await adminPage.goto("/admin");
    await adminPage.waitForLoadState("domcontentloaded");
    await closeOpenDialogs(adminPage);

    for (const navItem of ADMIN_NAV_ITEMS) {
      const link = adminPage
        .locator("aside")
        .locator("a", { hasText: navItem.label })
        .first();

      if (await link.isVisible({ timeout: 1000 }).catch(() => false)) {
        await Promise.all([
          adminPage.waitForURL(
            (url) =>
              navItem.exact
                ? url.pathname === navItem.href
                : url.pathname.startsWith(navItem.href),
            { timeout: 10000 },
          ),
          link.click({ force: true }),
        ]).catch(() => {});
        await adminPage.waitForLoadState("domcontentloaded");
        await closeOpenDialogs(adminPage);
      }
    }

    expect(
      notFoundUrls,
      `404 errors found: ${notFoundUrls.join(", ")}`,
    ).toHaveLength(0);
  });
});
