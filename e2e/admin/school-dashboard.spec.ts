/**
 * E2E tests for school admin dashboard
 */

import { test, expect } from "../fixtures/base-fixtures";

test.describe("School Admin Dashboard", () => {
  test("renders dashboard with stats cards", async ({ page }) => {
    await page.goto("/admin/school");
    await expect(
      page.locator("h1", { hasText: /School Administration/i }),
    ).toBeVisible();
  });

  test("shows registration requests table", async ({ page }) => {
    await page.goto("/admin/school");
    await expect(
      page.locator("h2", { hasText: /School Registration Requests/i }),
    ).toBeVisible();
    await expect(page.locator("table")).toBeVisible();
  });

  test("has quick action links", async ({ page }) => {
    await page.goto("/admin/school");
    await expect(page.locator("a", { hasText: /Bulk Invite/i })).toBeVisible();
    await expect(page.locator("a", { hasText: /Manage Tiers/i })).toBeVisible();
  });
});
