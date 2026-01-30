/**
 * E2E Tests: Admin Mission Control - UI Pages
 *
 * Tests page rendering and UI elements for mission control panels.
 * Panels: key-vault, health, stripe, ops-dashboard,
 *         infra, ai-email, business-kpi, control-panel, grafana
 *
 * F-XX: Mission Control Admin Panels (Plan 100 W0)
 */

import { test, expect } from "./fixtures/auth-fixtures";
import { dismissBlockingModals, ADMIN_IGNORE_ERRORS } from "./admin-helpers";

// Mission control page routes
const MISSION_CONTROL_PAGES = [
  { path: "/admin/mission-control/key-vault", name: "Key Vault" },
  { path: "/admin/mission-control/health", name: "Health Monitor" },
  { path: "/admin/mission-control/stripe", name: "Stripe Dashboard" },
  {
    path: "/admin/mission-control/ops-dashboard",
    name: "Operations Dashboard",
  },
  { path: "/admin/mission-control/infra", name: "Infrastructure" },
  { path: "/admin/mission-control/ai-email", name: "AI & Email" },
  { path: "/admin/mission-control/business-kpi", name: "Business KPIs" },
  { path: "/admin/mission-control/control-panel", name: "Control Panel" },
  { path: "/admin/mission-control/grafana", name: "Grafana" },
] as const;

test.describe("Mission Control UI - Page Load", () => {
  test("unauthenticated users cannot access mission control pages", async ({
    page,
  }) => {
    // Mock ToS API (required by project rules)
    await page.route("**/api/tos", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ accepted: true, version: "1.0" }),
      });
    });

    // Try to access a mission control page without auth
    await page.goto("/admin/mission-control/key-vault");
    await page.waitForLoadState("domcontentloaded");

    // Should redirect to login or show unauthorized
    const url = page.url();
    const isRedirectedToLogin = url.includes("/login");
    const isUnauthorized =
      (await page
        .locator('text="Unauthorized"')
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator('text="Non autorizzato"')
        .isVisible()
        .catch(() => false));

    expect(
      isRedirectedToLogin || isUnauthorized,
      "Should redirect to login or show unauthorized message",
    ).toBe(true);
  });
});

test.describe("Mission Control UI - Admin Access", () => {
  test("all mission control pages load for admin users", async ({
    adminPage,
  }) => {
    const errors: string[] = [];

    // Capture console errors (filtered)
    adminPage.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (!ADMIN_IGNORE_ERRORS.some((p) => p.test(text))) {
          errors.push(`${adminPage.url()}: ${text}`);
        }
      }
    });

    await dismissBlockingModals(adminPage);

    // Test each page
    for (const pageInfo of MISSION_CONTROL_PAGES) {
      await adminPage.goto(pageInfo.path);
      await adminPage.waitForLoadState("domcontentloaded");

      // Wait for main content
      const main = adminPage.locator("main, [role='main']").first();
      await expect(main).toBeVisible({ timeout: 10000 });

      // Verify we're on the expected page (not redirected)
      const url = adminPage.url();
      expect(url, `Should be on ${pageInfo.path}, but got ${url}`).toContain(
        pageInfo.path,
      );

      await adminPage.waitForTimeout(300);
    }

    // Report any errors
    if (errors.length > 0) {
      console.log("\nMission Control UI Errors:");
      errors.forEach((err) => console.log(`  ${err}`));
    }

    expect(
      errors,
      `Found ${errors.length} console errors in mission control UI`,
    ).toHaveLength(0);
  });

  test("key-vault page displays secrets table", async ({ adminPage }) => {
    await dismissBlockingModals(adminPage);
    await adminPage.goto("/admin/mission-control/key-vault");
    await adminPage.waitForLoadState("domcontentloaded");

    // Look for table or list of secrets
    const hasTable =
      (await adminPage
        .locator("table")
        .isVisible({ timeout: 5000 })
        .catch(() => false)) ||
      (await adminPage
        .locator('[role="table"]')
        .isVisible({ timeout: 5000 })
        .catch(() => false));

    const hasCards =
      (await adminPage.locator('[class*="card"]').count()) > 0 ||
      (await adminPage.locator('[class*="Card"]').count()) > 0;

    // Should have either a table or cards display
    expect(
      hasTable || hasCards,
      "Key vault should display secrets in table or cards",
    ).toBe(true);
  });

  test("health page displays service status", async ({ adminPage }) => {
    await dismissBlockingModals(adminPage);
    await adminPage.goto("/admin/mission-control/health");
    await adminPage.waitForLoadState("domcontentloaded");

    // Look for health status indicators
    const hasStatusIndicators =
      (await adminPage.locator('[class*="status"]').count()) > 0 ||
      (await adminPage.locator('[class*="Status"]').count()) > 0 ||
      (await adminPage.locator('[role="status"]').count()) > 0;

    const hasCards =
      (await adminPage.locator('[class*="card"]').count()) > 0 ||
      (await adminPage.locator('[class*="Card"]').count()) > 0;

    expect(
      hasStatusIndicators || hasCards,
      "Health page should display service status",
    ).toBe(true);
  });

  test("stripe page displays subscription metrics", async ({ adminPage }) => {
    await dismissBlockingModals(adminPage);
    await adminPage.goto("/admin/mission-control/stripe");
    await adminPage.waitForLoadState("domcontentloaded");

    // Look for metrics or charts
    const hasMetrics =
      (await adminPage.locator('[class*="metric"]').count()) > 0 ||
      (await adminPage.locator('[class*="Metric"]').count()) > 0 ||
      (await adminPage.locator('[class*="card"]').count()) > 0 ||
      (await adminPage.locator('[class*="Card"]').count()) > 0;

    expect(hasMetrics, "Stripe page should display subscription metrics").toBe(
      true,
    );
  });

  test("ops-dashboard page displays real-time metrics", async ({
    adminPage,
  }) => {
    await dismissBlockingModals(adminPage);
    await adminPage.goto("/admin/mission-control/ops-dashboard");
    await adminPage.waitForLoadState("domcontentloaded");

    // Look for dashboard elements
    const hasDashboardElements =
      (await adminPage.locator('[class*="dashboard"]').count()) > 0 ||
      (await adminPage.locator('[class*="Dashboard"]').count()) > 0 ||
      (await adminPage.locator('[class*="metric"]').count()) > 0 ||
      (await adminPage.locator('[class*="card"]').count()) > 0;

    expect(hasDashboardElements, "Ops dashboard should display metrics").toBe(
      true,
    );
  });

  test("control-panel page has interactive controls", async ({ adminPage }) => {
    await dismissBlockingModals(adminPage);
    await adminPage.goto("/admin/mission-control/control-panel");
    await adminPage.waitForLoadState("domcontentloaded");

    // Look for buttons or form controls
    const buttons = await adminPage.locator("button:visible").count();
    const inputs =
      (await adminPage.locator("input:visible").count()) +
      (await adminPage.locator("select:visible").count());

    expect(
      buttons + inputs,
      "Control panel should have interactive controls",
    ).toBeGreaterThan(0);
  });
});

test.describe("Mission Control UI - Navigation", () => {
  test("mission control pages have back/navigation links", async ({
    adminPage,
  }) => {
    await dismissBlockingModals(adminPage);
    await adminPage.goto("/admin/mission-control/key-vault");
    await adminPage.waitForLoadState("domcontentloaded");

    // Look for navigation elements
    const hasNav =
      (await adminPage
        .locator("nav")
        .isVisible({ timeout: 3000 })
        .catch(() => false)) ||
      (await adminPage
        .locator('[role="navigation"]')
        .isVisible({ timeout: 3000 })
        .catch(() => false)) ||
      (await adminPage.locator('a[href*="/admin"]').count()) > 0;

    expect(hasNav, "Page should have navigation elements").toBe(true);
  });

  test("can navigate between mission control pages", async ({ adminPage }) => {
    await dismissBlockingModals(adminPage);

    // Start at one page
    await adminPage.goto("/admin/mission-control/key-vault");
    await adminPage.waitForLoadState("domcontentloaded");
    expect(adminPage.url()).toContain("key-vault");

    // Navigate to another (if there's a link)
    const healthLink = adminPage.locator('a[href*="health"]').first();
    if (await healthLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await healthLink.click();
      await adminPage.waitForLoadState("domcontentloaded");
      expect(adminPage.url()).toContain("health");
    }
  });
});
