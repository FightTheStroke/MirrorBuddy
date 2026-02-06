/**
 * E2E tests for school registration flow
 */

import { test, expect } from "../fixtures/base-fixtures";

test.describe("School Registration", () => {
  test("renders school registration form", async ({ page }) => {
    await page.goto("/en/schools");
    await expect(
      page.locator("h1", { hasText: /MirrorBuddy for Schools/i }),
    ).toBeVisible();
    await expect(page.locator("#schoolName")).toBeVisible();
    await expect(page.locator("#contactName")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
  });

  test("validates required fields", async ({ page }) => {
    await page.goto("/en/schools");
    const submitButton = page.locator("button[type='submit']");
    await submitButton.click();

    // Browser validation should prevent submission
    const schoolName = page.locator("#schoolName");
    await expect(schoolName).toHaveAttribute("required", "");
  });

  test("tier selector has 3 options", async ({ page }) => {
    await page.goto("/en/schools");
    const tierSelect = page.locator("#tier");
    const options = tierSelect.locator("option");
    await expect(options).toHaveCount(3);
  });
});
