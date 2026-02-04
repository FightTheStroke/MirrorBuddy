/**
 * E2E Tests - Admin Billing Management
 * Task: T1-16 (F-26 through F-30)
 *
 * SKIPPED: These tests require admin authentication infrastructure not yet available
 * in E2E test environment. loginAsAdmin() requires a seeded admin user in the test DB.
 * TODO: Implement E2E admin fixture with seeded test admin user.
 */

import { test, expect } from "./fixtures/base-fixtures";
import { loginAsAdmin } from "./admin-helpers";

// Skip entire file until admin E2E auth infrastructure is ready
test.describe.skip("Admin Tier Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should display tier list page", async ({ page }) => {
    await page.goto("/admin/tiers");

    // Verify page loads
    await expect(page.locator("h1")).toContainText(/tier|piani/i);

    // Verify tier table exists
    await expect(page.locator("table")).toBeVisible();

    // Verify existing tiers are shown
    await expect(page.getByText(/trial|prova/i).first()).toBeVisible();
    await expect(page.getByText(/base/i).first()).toBeVisible();
    await expect(page.getByText(/pro/i).first()).toBeVisible();
  });

  test("should have create tier button", async ({ page }) => {
    await page.goto("/admin/tiers");

    // Look for create button
    const createBtn = page.locator(
      "a:has-text('Create'), button:has-text('Create'), a:has-text('Nuovo'), button:has-text('Nuovo')",
    );
    await expect(createBtn.first()).toBeVisible();
  });

  test("should have edit links for each tier", async ({ page }) => {
    await page.goto("/admin/tiers");

    // Look for edit links
    const editLinks = page.locator(
      "a:has-text('Edit'), a:has-text('Modifica')",
    );
    await expect(editLinks.first()).toBeVisible();
  });

  test("should have features links for each tier", async ({ page }) => {
    await page.goto("/admin/tiers");

    // Look for features links
    const featuresLinks = page.locator(
      "a:has-text('Features'), a:has-text('Funzionalità')",
    );
    await expect(featuresLinks.first()).toBeVisible();
  });

  test("should have pricing links for each tier", async ({ page }) => {
    await page.goto("/admin/tiers");

    // Look for pricing links
    const pricingLinks = page.locator(
      "a:has-text('Pricing'), a:has-text('Prezzi')",
    );
    await expect(pricingLinks.first()).toBeVisible();
  });

  test("create tier page should load", async ({ page }) => {
    await page.goto("/admin/tiers/new");

    // Verify form elements
    await expect(page.locator("input[name='code']")).toBeVisible();
    await expect(page.locator("input[name='name']")).toBeVisible();
    await expect(page.locator("button[type='submit']")).toBeVisible();
  });
});

test.describe.skip("Admin Revenue Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should display revenue dashboard", async ({ page }) => {
    await page.goto("/admin/revenue");

    // Verify page loads
    await expect(page.locator("h1")).toContainText(/revenue|ricavi|entrate/i);
  });

  test("should show MRR metric", async ({ page }) => {
    await page.goto("/admin/revenue");

    // Look for MRR
    await expect(page.getByText(/MRR/i)).toBeVisible();
    await expect(page.getByText(/€/)).toBeVisible();
  });

  test("should show ARR metric", async ({ page }) => {
    await page.goto("/admin/revenue");

    await expect(page.getByText(/ARR/i)).toBeVisible();
  });

  test("should show churn rate", async ({ page }) => {
    await page.goto("/admin/revenue");

    await expect(page.getByText(/churn/i)).toBeVisible();
    await expect(page.getByText(/%/)).toBeVisible();
  });

  test("should show LTV metric", async ({ page }) => {
    await page.goto("/admin/revenue");

    await expect(page.getByText(/LTV/i)).toBeVisible();
  });

  test("should show subscription counts", async ({ page }) => {
    await page.goto("/admin/revenue");

    await expect(
      page.getByText(/subscription|abbonament/i).first(),
    ).toBeVisible();
  });
});

test.describe.skip("Admin Tax Configuration", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should display tax configuration page", async ({ page }) => {
    await page.goto("/admin/tax");

    // Verify page loads
    await expect(page.locator("h1")).toContainText(/tax|vat|iva/i);
  });

  test("should show EU countries", async ({ page }) => {
    await page.goto("/admin/tax");

    // Verify EU countries are listed
    await expect(page.getByText(/italy|italia/i).first()).toBeVisible();
    await expect(page.getByText(/france|francia/i).first()).toBeVisible();
    await expect(page.getByText(/germany|germania/i).first()).toBeVisible();
  });

  test("should have VAT rate inputs", async ({ page }) => {
    await page.goto("/admin/tax");

    // Look for number inputs for VAT rates
    const vatInputs = page.locator("input[type='number']");
    await expect(vatInputs.first()).toBeVisible();
  });

  test("should have reverse charge toggles", async ({ page }) => {
    await page.goto("/admin/tax");

    // Look for checkboxes
    const checkboxes = page.locator("input[type='checkbox']");
    await expect(checkboxes.first()).toBeVisible();
  });

  test("should have Stripe sync buttons", async ({ page }) => {
    await page.goto("/admin/tax");

    // Look for sync buttons
    const syncBtns = page.locator(
      "button:has-text('Sync'), button:has-text('Sincronizza')",
    );
    await expect(syncBtns.first()).toBeVisible();
  });
});

test.describe.skip("Admin Feature Flags", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should display features page for a tier", async ({ page }) => {
    // First get a tier ID from the list
    await page.goto("/admin/tiers");

    // Click on features link
    const featuresLink = page.locator("a:has-text('Features')").first();
    await featuresLink.click();

    // Verify features page loads
    await expect(page.locator("h1")).toContainText(/feature/i);
  });

  test("should have feature toggles", async ({ page }) => {
    await page.goto("/admin/tiers");
    const featuresLink = page.locator("a:has-text('Features')").first();
    await featuresLink.click();

    // Look for checkboxes (feature toggles)
    const toggles = page.locator("input[type='checkbox']");
    await expect(toggles.first()).toBeVisible();
  });

  test("should have model selection dropdowns", async ({ page }) => {
    await page.goto("/admin/tiers");
    const featuresLink = page.locator("a:has-text('Features')").first();
    await featuresLink.click();

    // Look for select elements (model dropdowns)
    const selects = page.locator("select");
    await expect(selects.first()).toBeVisible();
  });
});
