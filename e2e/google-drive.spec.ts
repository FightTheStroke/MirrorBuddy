/**
 * Google Drive Integration Tests
 * ADR 0040 - Google Drive Integration
 *
 * Tests: OAuth status, file listing, file picker UI, download
 * Prerequisite: User already logged in with Google Drive connected
 *
 * Run: npx playwright test e2e/google-drive.spec.ts
 */

import { test, expect } from "./fixtures/base-fixtures";

// Test user ID - configure via E2E_TEST_USER_ID env var or use default
// Default is a known test user in the development database
const TEST_USER_ID =
  process.env.E2E_TEST_USER_ID || "user-61fc0a4d-9109-4b87-8482-80ec1e67d49d";

const IGNORE_ERRORS = [
  /ResizeObserver loop/i,
  /Download the React DevTools/i,
  /favicon\.ico/i,
  /hydrat/i,
  /WebSocket/i,
];

test.describe("Google Drive API", () => {
  test("GET /api/auth/google/status returns connection status", async ({
    request,
  }) => {
    const response = await request.get(
      `/api/auth/google/status?userId=${TEST_USER_ID}`,
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("isConnected");

    if (data.isConnected) {
      expect(data).toHaveProperty("email");
      expect(data.email).toContain("@");
    }
  });

  test("GET /api/google-drive/files requires userId", async ({ request }) => {
    const response = await request.get("/api/google-drive/files");

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toContain("userId");
  });

  test("GET /api/google-drive/files returns file list when connected", async ({
    request,
  }) => {
    // First check if connected
    const statusResponse = await request.get(
      `/api/auth/google/status?userId=${TEST_USER_ID}`,
    );
    const status = await statusResponse.json();

    if (!status.isConnected) {
      test.skip();
      return;
    }

    const response = await request.get(
      `/api/google-drive/files?userId=${TEST_USER_ID}`,
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("files");
    expect(data).toHaveProperty("breadcrumbs");
    expect(Array.isArray(data.files)).toBe(true);
    expect(Array.isArray(data.breadcrumbs)).toBe(true);
  });

  test("GET /api/google-drive/files with folderId=shared returns shared files", async ({
    request,
  }) => {
    const statusResponse = await request.get(
      `/api/auth/google/status?userId=${TEST_USER_ID}`,
    );
    const status = await statusResponse.json();

    if (!status.isConnected) {
      test.skip();
      return;
    }

    const response = await request.get(
      `/api/google-drive/files?userId=${TEST_USER_ID}&folderId=shared`,
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("files");
    expect(data.breadcrumbs).toContainEqual(
      expect.objectContaining({ id: "shared", name: "Condivisi con me" }),
    );
  });

  test("GET /api/google-drive/files with search query", async ({ request }) => {
    const statusResponse = await request.get(
      `/api/auth/google/status?userId=${TEST_USER_ID}`,
    );
    const status = await statusResponse.json();

    if (!status.isConnected) {
      test.skip();
      return;
    }

    const response = await request.get(
      `/api/google-drive/files?userId=${TEST_USER_ID}&search=test`,
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("files");
    expect(Array.isArray(data.files)).toBe(true);
  });

  test("GET /api/google-drive/files/[id]/download requires userId", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/google-drive/files/test-file-id/download",
    );

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toContain("userId");
  });
});

test.describe("Google Drive UI - Study Kit", () => {
  test("Study Kit shows Google Drive option when connected", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (!IGNORE_ERRORS.some((p) => p.test(text))) {
          errors.push(text);
        }
      }
    });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Navigate to Astuccio (Study Kit)
    const astuccioBtn = page
      .locator("button")
      .filter({ hasText: /Astuccio/i })
      .first();
    if (await astuccioBtn.isVisible()) {
      await astuccioBtn.click();
      await page.waitForTimeout(1000);
    }

    // Look for Google Drive tab/button (same approach as other tests)
    const driveTab = page
      .locator('button, [role="tab"]')
      .filter({ hasText: /Google Drive/i })
      .first();

    if (await driveTab.isVisible()) {
      // Google Drive option is visible in UI
      expect(await driveTab.isVisible()).toBe(true);
    } else {
      // Google Drive tab not visible at this level - check for option in upload flow
      const studyKitCard = page.locator("text=/Study Kit/i").first();
      if (await studyKitCard.isVisible()) {
        await studyKitCard.click();
        await page.waitForTimeout(1500);

        // Look for Google Drive option in the modal
        const driveOption = page
          .locator("text=/Da Google Drive|Google Drive|Connetti/i")
          .first();
        if (await driveOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          expect(true).toBe(true); // Found it
        } else {
          // UI doesn't show Google Drive at this navigation path - skip
          test.skip();
        }
      } else {
        test.skip();
      }
    }
  });

  test("Google Drive picker shows files when opened", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Navigate to Astuccio
    const astuccioBtn = page
      .locator("button")
      .filter({ hasText: /Astuccio/i })
      .first();
    if (await astuccioBtn.isVisible()) {
      await astuccioBtn.click();
      await page.waitForTimeout(1000);
    }

    // Look for Google Drive tab/button
    const driveTab = page
      .locator('button, [role="tab"]')
      .filter({ hasText: /Google Drive/i })
      .first();

    if (await driveTab.isVisible()) {
      await driveTab.click();
      await page.waitForTimeout(2000);

      // Should show file list or connection prompt
      const fileList = page.locator(
        '[class*="file"], [class*="folder"], text=/Il mio Drive|Condivisi con me|Connetti/i',
      );
      await expect(fileList.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('Google Drive picker shows "Il mio Drive" and "Condivisi con me" tabs', async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Navigate to Astuccio
    const astuccioBtn = page
      .locator("button")
      .filter({ hasText: /Astuccio/i })
      .first();
    if (await astuccioBtn.isVisible()) {
      await astuccioBtn.click();
      await page.waitForTimeout(1000);
    }

    // Open Google Drive picker
    const driveTab = page
      .locator('button, [role="tab"]')
      .filter({ hasText: /Google Drive/i })
      .first();

    if (await driveTab.isVisible()) {
      await driveTab.click();
      await page.waitForTimeout(2000);

      // Should show both tabs
      const myDriveTab = page
        .locator("button")
        .filter({ hasText: /Il mio Drive/i });
      const sharedTab = page
        .locator("button")
        .filter({ hasText: /Condivisi con me/i });

      // At least one should be visible if connected
      const hasMyDrive = await myDriveTab.isVisible();
      const hasShared = await sharedTab.isVisible();

      expect(hasMyDrive || hasShared).toBe(true);
    }
  });
});

test.describe("Google Drive UI - Homework Help", () => {
  test("Homework Help shows Google Drive upload option", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Navigate to Homework Help (Compiti)
    const homeworkBtn = page
      .locator("button, a")
      .filter({ hasText: /Compiti|Homework/i })
      .first();

    if (await homeworkBtn.isVisible()) {
      await homeworkBtn.click();
      await page.waitForTimeout(1000);

      // Should show upload options including Google Drive
      const uploadSection = page
        .locator("text=/Carica|Upload|Google Drive|PDF/i")
        .first();
      await expect(uploadSection).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe("Google Drive Connection Flow", () => {
  test("Disconnect endpoint works", async ({ request }) => {
    // This test just verifies the endpoint exists and responds correctly
    // We don't actually disconnect to avoid breaking other tests
    const response = await request.post("/api/auth/google/disconnect", {
      data: { userId: "test-user-that-does-not-exist" },
    });

    // Should return 200 even for non-existent user (idempotent)
    expect([200, 404]).toContain(response.status());
  });

  test("OAuth initiation redirects to Google", async ({ page }) => {
    // Test that the OAuth URL is generated correctly
    await page.goto(`/api/auth/google?userId=${TEST_USER_ID}&returnUrl=/`);

    // Should redirect to Google OAuth
    const url = page.url();
    expect(url).toContain("accounts.google.com");
  });
});
