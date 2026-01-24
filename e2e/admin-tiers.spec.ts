/**
 * E2E Tests: Admin Tiers Management
 *
 * Tests tier creation and editing flows.
 * T3-02: Create /admin/tiers/[id] edit page
 *
 * Run: npx playwright test e2e/admin-tiers.spec.ts
 */

import { test, expect } from "./fixtures/auth-fixtures";

test.describe("Admin Tiers - Create New Tier", () => {
  test("should display tier creation form with all required fields", async ({
    adminPage,
  }) => {
    await adminPage.goto("/admin/tiers/new");
    await adminPage.waitForLoadState("networkidle");

    await expect(
      adminPage
        .locator("h1, h2")
        .filter({ hasText: /Nuovo Piano|Crea Piano/i }),
    ).toBeVisible();

    await expect(adminPage.locator('input[name="code"]')).toBeVisible();
    await expect(adminPage.locator('input[name="name"]')).toBeVisible();
    await expect(
      adminPage.locator('textarea[name="description"]'),
    ).toBeVisible();
    await expect(
      adminPage.locator('input[name="monthlyPriceEur"]'),
    ).toBeVisible();
    await expect(adminPage.locator('input[name="sortOrder"]')).toBeVisible();
    await expect(
      adminPage.locator('input[name="isActive"], input[type="checkbox"]'),
    ).toBeVisible();

    await expect(
      adminPage.locator("button").filter({ hasText: /Salva|Crea/i }),
    ).toBeVisible();
    await expect(
      adminPage.locator("button, a").filter({ hasText: /Annulla|Indietro/i }),
    ).toBeVisible();
  });

  test("should navigate back to tiers list on cancel", async ({
    adminPage,
  }) => {
    await adminPage.goto("/admin/tiers/new");
    await adminPage.waitForLoadState("networkidle");

    const cancelButton = adminPage
      .locator("button, a")
      .filter({ hasText: /Annulla|Indietro/i })
      .first();
    await cancelButton.click();

    await adminPage.waitForLoadState("networkidle");
    expect(adminPage.url()).toContain("/admin/tiers");
  });

  test("should create new tier with API mock", async ({ adminPage }) => {
    await adminPage.route("**/api/admin/tiers", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            tier: { id: "test-tier-id", code: "test", name: "Test" },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await adminPage.goto("/admin/tiers/new");
    await adminPage.waitForLoadState("networkidle");

    await adminPage.locator('input[name="code"]').fill("test-tier");
    await adminPage.locator('input[name="name"]').fill("Test Tier");
    await adminPage
      .locator('textarea[name="description"]')
      .fill("Test description");
    await adminPage.locator('input[name="monthlyPriceEur"]').fill("9.99");
    await adminPage.locator('input[name="sortOrder"]').fill("1");

    const submitButton = adminPage
      .locator("button")
      .filter({ hasText: /Salva|Crea/i });
    await submitButton.click();

    await adminPage.waitForURL("**/admin/tiers", { timeout: 5000 });
  });
});

test.describe("Admin Tiers - Edit Existing Tier", () => {
  test("should display tier edit form with pre-filled values", async ({
    adminPage,
  }) => {
    await adminPage.route("**/api/admin/tiers/*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "tier-123",
          code: "premium",
          name: "Premium",
          description: "Premium tier with all features",
          monthlyPriceEur: 19.99,
          sortOrder: 2,
          isActive: true,
        }),
      });
    });

    await adminPage.goto("/admin/tiers/tier-123/edit");
    await adminPage.waitForLoadState("networkidle");

    await expect(
      adminPage.locator("h1, h2").filter({ hasText: /Modifica Piano/i }),
    ).toBeVisible();

    const codeInput = adminPage.locator('input[name="code"]');
    await expect(codeInput).toHaveValue("premium");
    const isReadonly = await codeInput.getAttribute("readonly");
    expect(isReadonly).not.toBeNull();

    await expect(adminPage.locator('input[name="name"]')).toHaveValue(
      "Premium",
    );
    await expect(adminPage.locator('textarea[name="description"]')).toHaveValue(
      "Premium tier with all features",
    );
  });

  test("should update tier with API mock", async ({ adminPage }) => {
    await adminPage.route("**/api/admin/tiers/tier-123", async (route) => {
      const method = route.request().method();
      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "tier-123",
            code: "premium",
            name: "Premium",
            description: "Premium tier",
            monthlyPriceEur: 19.99,
            sortOrder: 2,
            isActive: true,
          }),
        });
      } else if (method === "PUT" || method === "PATCH") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            tier: { id: "tier-123", code: "premium", name: "Premium Updated" },
          }),
        });
      }
    });

    await adminPage.goto("/admin/tiers/tier-123/edit");
    await adminPage.waitForLoadState("networkidle");

    const nameInput = adminPage.locator('input[name="name"]');
    await nameInput.clear();
    await nameInput.fill("Premium Updated");

    const submitButton = adminPage
      .locator("button")
      .filter({ hasText: /Salva|Aggiorna/i });
    await submitButton.click();

    await expect(
      adminPage
        .locator('[role="status"], .toast, [aria-live="polite"]')
        .filter({ hasText: /success|aggiornato|salvato/i }),
    ).toBeVisible({ timeout: 3000 });
  });

  test("should navigate to edit page from tiers table", async ({
    adminPage,
  }) => {
    await adminPage.goto("/admin/tiers");
    await adminPage.waitForLoadState("networkidle");

    const editButton = adminPage
      .locator("button, a")
      .filter({ hasText: /Modifica|Edit/i })
      .first();

    const buttonCount = await editButton.count();
    if (buttonCount > 0) {
      await editButton.click();
      await adminPage.waitForLoadState("networkidle");

      expect(adminPage.url()).toMatch(/\/admin\/tiers\/[^\/]+\/edit/);

      await expect(
        adminPage.locator("h1, h2").filter({ hasText: /Modifica Piano/i }),
      ).toBeVisible();
    }
  });
});

test.describe("Admin Tiers - Features Section", () => {
  test("should display features section with checkboxes", async ({
    adminPage,
  }) => {
    await adminPage.route("**/api/admin/tiers/tier-123", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "tier-123",
          code: "premium",
          name: "Premium",
          description: "Premium tier",
          monthlyPriceEur: 19.99,
          sortOrder: 2,
          isActive: true,
          chatLimitDaily: 50,
          voiceMinutesDaily: 30,
          toolsLimitDaily: 50,
          docsLimitTotal: 10,
          chatModel: "gpt-4o",
          realtimeModel: "gpt-realtime",
          features: {
            video_vision: true,
            voice_enabled: true,
            pdf_export: false,
          },
          availableMaestri: [],
          availableCoaches: [],
          availableBuddies: [],
          availableTools: [],
          stripePriceId: null,
        }),
      });
    });

    await adminPage.goto("/admin/tiers/tier-123/edit");
    await adminPage.waitForLoadState("networkidle");

    await expect(
      adminPage.locator("h2").filter({ hasText: /Funzionalità/i }),
    ).toBeVisible();

    const videoVisionCheckbox = adminPage.locator(
      'input[name="feature-video_vision"]',
    );
    await expect(videoVisionCheckbox).toBeVisible();
    await expect(videoVisionCheckbox).toBeChecked();

    const voiceEnabledCheckbox = adminPage.locator(
      'input[name="feature-voice_enabled"]',
    );
    await expect(voiceEnabledCheckbox).toBeVisible();
    await expect(voiceEnabledCheckbox).toBeChecked();

    const pdfExportCheckbox = adminPage.locator(
      'input[name="feature-pdf_export"]',
    );
    await expect(pdfExportCheckbox).toBeVisible();
    await expect(pdfExportCheckbox).not.toBeChecked();

    await expect(
      adminPage.locator('input[name="feature-flashcards"]'),
    ).toBeVisible();
    await expect(
      adminPage.locator('input[name="feature-mindmaps"]'),
    ).toBeVisible();
    await expect(
      adminPage.locator('input[name="feature-quizzes"]'),
    ).toBeVisible();
    await expect(
      adminPage.locator('input[name="feature-homework_help"]'),
    ).toBeVisible();
    await expect(
      adminPage.locator('input[name="feature-formula_tool"]'),
    ).toBeVisible();
    await expect(
      adminPage.locator('input[name="feature-chart_tool"]'),
    ).toBeVisible();
  });

  test("should toggle feature checkboxes", async ({ adminPage }) => {
    await adminPage.route("**/api/admin/tiers/tier-123", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "tier-123",
          code: "premium",
          name: "Premium",
          description: "Premium tier",
          monthlyPriceEur: 19.99,
          sortOrder: 2,
          isActive: true,
          chatLimitDaily: 50,
          voiceMinutesDaily: 30,
          toolsLimitDaily: 50,
          docsLimitTotal: 10,
          chatModel: "gpt-4o",
          realtimeModel: "gpt-realtime",
          features: {
            video_vision: false,
            pdf_export: false,
          },
          availableMaestri: [],
          availableCoaches: [],
          availableBuddies: [],
          availableTools: [],
          stripePriceId: null,
        }),
      });
    });

    await adminPage.goto("/admin/tiers/tier-123/edit");
    await adminPage.waitForLoadState("networkidle");

    const pdfExportCheckbox = adminPage.locator(
      'input[name="feature-pdf_export"]',
    );
    await expect(pdfExportCheckbox).not.toBeChecked();

    await pdfExportCheckbox.check();
    await expect(pdfExportCheckbox).toBeChecked();

    await pdfExportCheckbox.uncheck();
    await expect(pdfExportCheckbox).not.toBeChecked();
  });

  test("should display feature labels and descriptions", async ({
    adminPage,
  }) => {
    await adminPage.route("**/api/admin/tiers/tier-123", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "tier-123",
          code: "premium",
          name: "Premium",
          description: "Premium tier",
          monthlyPriceEur: 19.99,
          sortOrder: 2,
          isActive: true,
          chatLimitDaily: 50,
          voiceMinutesDaily: 30,
          toolsLimitDaily: 50,
          docsLimitTotal: 10,
          chatModel: "gpt-4o",
          realtimeModel: "gpt-realtime",
          features: {},
          availableMaestri: [],
          availableCoaches: [],
          availableBuddies: [],
          availableTools: [],
          stripePriceId: null,
        }),
      });
    });

    await adminPage.goto("/admin/tiers/tier-123/edit");
    await adminPage.waitForLoadState("networkidle");

    await expect(adminPage.locator("text=Video Vision")).toBeVisible();
    await expect(
      adminPage.locator("text=Enable webcam video analysis"),
    ).toBeVisible();

    await expect(adminPage.locator("text=Voice Chat")).toBeVisible();
    await expect(
      adminPage.locator("text=Enable voice conversations with maestri"),
    ).toBeVisible();

    await expect(adminPage.locator("text=PDF Export")).toBeVisible();
    await expect(adminPage.locator("text=Flashcards")).toBeVisible();
    await expect(adminPage.locator("text=Mind Maps")).toBeVisible();
    await expect(adminPage.locator("text=Quizzes")).toBeVisible();
    await expect(adminPage.locator("text=Homework Help")).toBeVisible();
    await expect(adminPage.locator("text=Formula Tool")).toBeVisible();
    await expect(adminPage.locator("text=Chart Tool")).toBeVisible();
  });
});
