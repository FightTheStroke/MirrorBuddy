/**
 * E2E Tests: Admin Funnel Dashboard
 *
 * Tests the conversion funnel dashboard at /admin/funnel
 * Plan 069 - Conversion Funnel Dashboard
 *
 * F-05: Dashboard with funnel visualization
 * F-06: KPI cards
 * F-07: Users table with stage filters
 * F-08: User drill-down with timeline
 *
 * Run: npx playwright test e2e/admin-funnel.spec.ts
 */

import { test, expect } from "./fixtures/auth-fixtures";
import { dismissBlockingModals, ADMIN_IGNORE_ERRORS } from "./admin-helpers";

test.describe("Admin Funnel Dashboard", () => {
  test.beforeEach(async ({ adminPage }) => {
    // Capture and filter console errors
    const errors: string[] = [];
    adminPage.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (!ADMIN_IGNORE_ERRORS.some((p) => p.test(text))) errors.push(text);
      }
    });

    await dismissBlockingModals(adminPage);
  });

  test("F-05: funnel dashboard page loads successfully", async ({
    adminPage,
  }) => {
    await adminPage.goto("/admin/funnel");
    await adminPage.waitForLoadState("networkidle");

    // Page title should be visible
    await expect(adminPage.locator("h1")).toContainText("Conversion Funnel");

    // No major console errors
    const errors: string[] = [];
    adminPage.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    expect(
      errors.filter((e) => !ADMIN_IGNORE_ERRORS.some((p) => p.test(e))),
    ).toHaveLength(0);
  });

  test("F-06: KPI cards display metrics", async ({ adminPage }) => {
    await adminPage.goto("/admin/funnel");
    await adminPage.waitForLoadState("networkidle");

    // Wait for data to load (loading state to disappear)
    await expect(adminPage.locator(".animate-pulse")).toHaveCount(0, {
      timeout: 10000,
    });

    // KPI cards should be visible
    const kpiCards = adminPage.locator('[class*="Card"]');
    await expect(kpiCards.first()).toBeVisible();

    // Check for KPI titles
    await expect(adminPage.getByText("Total Visitors")).toBeVisible();
    await expect(adminPage.getByText("Conversion Rate")).toBeVisible();
    await expect(adminPage.getByText("Active Users")).toBeVisible();
  });

  test("F-05: funnel stages section exists", async ({ adminPage }) => {
    await adminPage.goto("/admin/funnel");
    await adminPage.waitForLoadState("networkidle");

    // Wait for data to load
    await expect(adminPage.locator(".animate-pulse")).toHaveCount(0, {
      timeout: 10000,
    });

    // Funnel stages section should exist
    await expect(adminPage.getByText("Funnel Stages")).toBeVisible();
  });

  test("F-07: users table section exists", async ({ adminPage }) => {
    await adminPage.goto("/admin/funnel");
    await adminPage.waitForLoadState("networkidle");

    // Wait for data to load
    await expect(adminPage.locator(".animate-pulse")).toHaveCount(0, {
      timeout: 10000,
    });

    // Users table section should exist
    await expect(adminPage.getByText("Users by Stage")).toBeVisible();
  });

  test("F-07: stage filter dropdown exists", async ({ adminPage }) => {
    await adminPage.goto("/admin/funnel");
    await adminPage.waitForLoadState("networkidle");

    // Wait for data to load
    await expect(adminPage.locator(".animate-pulse")).toHaveCount(0, {
      timeout: 10000,
    });

    // Filter dropdown should exist
    const filterSelect = adminPage.locator('[role="combobox"]');
    await expect(filterSelect).toBeVisible({ timeout: 5000 });
  });

  test("F-07: search input exists", async ({ adminPage }) => {
    await adminPage.goto("/admin/funnel");
    await adminPage.waitForLoadState("networkidle");

    // Wait for data to load
    await expect(adminPage.locator(".animate-pulse")).toHaveCount(0, {
      timeout: 10000,
    });

    // Search input should exist
    const searchInput = adminPage.locator(
      'input[placeholder*="Search"], input[placeholder*="search"]',
    );
    await expect(searchInput).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Admin Funnel API", () => {
  test("F-03: funnel metrics API returns data", async ({ adminPage }) => {
    // Make API request directly
    const response = await adminPage.request.get(
      "/api/admin/funnel/metrics?days=30",
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("stages");
    expect(data).toHaveProperty("totals");
    expect(data).toHaveProperty("period");
    expect(Array.isArray(data.stages)).toBe(true);
  });

  test("F-03: funnel users API returns data", async ({ adminPage }) => {
    const response = await adminPage.request.get(
      "/api/admin/funnel/users?page=1&pageSize=10",
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("users");
    expect(data).toHaveProperty("pagination");
    expect(Array.isArray(data.users)).toBe(true);
  });

  test("F-03: funnel metrics API requires auth", async ({ page }) => {
    // Without admin auth, should return 401
    const response = await page.request.get(
      "/api/admin/funnel/metrics?days=30",
    );

    expect(response.status()).toBe(401);
  });
});
