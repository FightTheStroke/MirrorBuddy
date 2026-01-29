/**
 * E2E tests for the new Research and School dashboards.
 */

import { test, expect } from "./fixtures/auth-fixtures";

test.describe("Admin New Dashboards", () => {
  test("Research Dashboard is accessible and contains expected sections", async ({
    adminPage,
  }) => {
    await adminPage.goto("/admin/research");
    await adminPage.waitForLoadState("domcontentloaded");

    // Check title
    await expect(adminPage.locator("h1")).toContainText(/Research Analytics/i);

    // Check stats cards
    await expect(adminPage.locator("text=Total Participants")).toBeVisible();
    await expect(adminPage.locator("text=2,543")).toBeVisible();

    // Check charts presence
    await expect(
      adminPage.locator("text=Growth in Participation"),
    ).toBeVisible();
    await expect(
      adminPage.locator("text=Method Efficiency by Subject"),
    ).toBeVisible();

    // Check Heatmap ARIA support
    const heatmap = adminPage.locator('[role="grid"][aria-label*="heatmap"]');
    await expect(heatmap).toBeVisible();

    // Verify heatmap cell accessibility
    const cell = adminPage.locator(
      '[aria-label="Euclide with Alex: 85% Scaffolding"]',
    );
    await expect(cell).toBeVisible();
    await expect(cell).toContainText("85%");
  });

  test("School Portal is accessible and contains expected sections", async ({
    adminPage,
  }) => {
    await adminPage.goto("/admin/school");
    await adminPage.waitForLoadState("domcontentloaded");

    // Check title
    await expect(adminPage.locator("h1")).toContainText(/School Portal/i);
    await expect(adminPage.locator("text=Liceo Scientifico")).toBeVisible();

    // Check classes list
    await expect(adminPage.locator("text=3A - Scientifico")).toBeVisible();
    await expect(adminPage.locator("text=24 Students")).toBeVisible();

    // Check compliance section
    await expect(adminPage.locator("text=Compliance Status")).toBeVisible();
    await expect(
      adminPage.locator("text=Data Protection (GDPR)"),
    ).toBeVisible();

    // Check search functionality presence
    await expect(
      adminPage.locator('input[placeholder="Search classes..."]'),
    ).toBeVisible();
  });

  test("Navigation from Sidebar works", async ({ adminPage }) => {
    await adminPage.goto("/admin");
    await adminPage.waitForLoadState("domcontentloaded");

    // Click Research in sidebar
    await adminPage.click("aside >> text=Research");
    await expect(adminPage).toHaveURL(/\/admin\/research/);

    // Click School Portal in sidebar
    await adminPage.click("aside >> text=School Portal");
    await expect(adminPage).toHaveURL(/\/admin\/school/);
  });
});
