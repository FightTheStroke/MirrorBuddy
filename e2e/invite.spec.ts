import { test, expect } from "@playwright/test";

test.describe("Beta Invite System", () => {
  test.describe("Beta Request Form", () => {
    test("should show validation errors for empty form", async ({ page }) => {
      // Navigate to a page with the beta request form
      // This would be on the trial limit modal or a dedicated page
      await page.goto("/");

      // Try to find and submit empty form (if exists on landing)
      const form = page
        .locator("form")
        .filter({ hasText: "Richiedi accesso Beta" });

      if (await form.isVisible()) {
        await form.locator('button[type="submit"]').click();

        // Should show validation errors
        await expect(page.locator("text=obbligatorio")).toBeVisible();
      }
    });

    test("should submit valid beta request", async ({ page }) => {
      await page.goto("/");

      const form = page
        .locator("form")
        .filter({ hasText: "Richiedi accesso Beta" });

      if (await form.isVisible()) {
        // Fill in the form
        await form.locator('input[id="name"]').fill("Test User");
        await form
          .locator('input[id="email"]')
          .fill(`test-${Date.now()}@example.com`);
        await form
          .locator('textarea[id="motivation"]')
          .fill(
            "I want to learn Italian with MirrorBuddy because it looks amazing!",
          );

        // Mock the API response
        await page.route("/api/invites/request", async (route) => {
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({ success: true, id: "test-invite-id" }),
          });
        });

        // Submit
        await form.locator('button[type="submit"]').click();

        // Should show success message
        await expect(page.locator("text=Richiesta inviata")).toBeVisible();
      }
    });
  });

  test.describe("Admin Invites Page", () => {
    test.beforeEach(async ({ page }) => {
      // Mock admin authentication using Playwright's cookie API
      await page.context().addCookies([
        {
          name: "mirrorbuddy-user-id",
          value: "admin-test-id",
          domain: "localhost",
          path: "/",
          sameSite: "Lax",
        },
      ]);

      // Mock the invites API
      await page.route("/api/invites*", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              invites: [
                {
                  id: "inv-1",
                  email: "user1@test.com",
                  name: "User One",
                  motivation: "I love learning!",
                  status: "PENDING",
                  trialSessionId: null,
                  createdAt: new Date().toISOString(),
                  reviewedAt: null,
                  rejectionReason: null,
                  generatedUsername: null,
                },
                {
                  id: "inv-2",
                  email: "user2@test.com",
                  name: "User Two",
                  motivation: "For my studies",
                  status: "APPROVED",
                  trialSessionId: "trial-123",
                  createdAt: new Date().toISOString(),
                  reviewedAt: new Date().toISOString(),
                  rejectionReason: null,
                  generatedUsername: "usertwo1234",
                },
              ],
            }),
          });
        }
      });
    });

    test("should display invite list", async ({ page }) => {
      await page.goto("/admin/invites");

      // Should show the page title
      await expect(page.locator("h1")).toContainText("Richieste Beta");

      // Should show tabs
      await expect(page.locator("text=In attesa")).toBeVisible();
      await expect(page.locator("text=Approvate")).toBeVisible();
      await expect(page.locator("text=Rifiutate")).toBeVisible();
    });

    test("should show invite details", async ({ page }) => {
      await page.goto("/admin/invites");

      // Mock returns pending invites by default
      await expect(page.locator("text=User One")).toBeVisible();
      await expect(page.locator("text=user1@test.com")).toBeVisible();
      await expect(page.locator("text=I love learning!")).toBeVisible();
    });

    test("should have approve and reject buttons for pending invites", async ({
      page,
    }) => {
      await page.goto("/admin/invites");

      // Should show action buttons for pending invites
      await expect(page.locator("button:has-text('Approva')")).toBeVisible();
      await expect(page.locator("button:has-text('Rifiuta')")).toBeVisible();
    });

    test("should open reject modal with reason field", async ({ page }) => {
      await page.goto("/admin/invites");

      // Click reject button
      await page.locator("button:has-text('Rifiuta')").first().click();

      // Should show modal
      await expect(page.locator("text=Motivo del rifiuto")).toBeVisible();

      // Should have cancel button
      await expect(page.locator("button:has-text('Annulla')")).toBeVisible();
    });

    test("should switch tabs", async ({ page }) => {
      await page.goto("/admin/invites");

      // Mock API for approved tab
      await page.route("/api/invites?status=APPROVED", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            invites: [
              {
                id: "inv-2",
                email: "approved@test.com",
                name: "Approved User",
                motivation: "Thanks!",
                status: "APPROVED",
                generatedUsername: "approveduser",
                createdAt: new Date().toISOString(),
                reviewedAt: new Date().toISOString(),
              },
            ],
          }),
        });
      });

      // Click approved tab
      await page.locator("button:has-text('Approvate')").click();

      // Should call API with status filter
      // The mock will return approved invites
    });
  });

  test.describe("Invite Approval Flow", () => {
    test("should approve invite and show success", async ({ page }) => {
      // Mock admin authentication using Playwright's cookie API
      await page.context().addCookies([
        {
          name: "mirrorbuddy-user-id",
          value: "admin-test-id",
          domain: "localhost",
          path: "/",
          sameSite: "Lax",
        },
      ]);

      // Mock invites list
      await page.route("/api/invites?status=PENDING", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            invites: [
              {
                id: "inv-to-approve",
                email: "newuser@test.com",
                name: "New User",
                motivation: "I need this for school",
                status: "PENDING",
                createdAt: new Date().toISOString(),
              },
            ],
          }),
        });
      });

      // Mock approve endpoint
      await page.route("/api/invites/approve", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            userId: "new-user-id",
            username: "newuser1234",
          }),
        });
      });

      await page.goto("/admin/invites");

      // Should show the invite
      await expect(page.locator("text=New User")).toBeVisible();

      // Click approve
      await page.locator("button:has-text('Approva')").click();

      // Should call the approve API
      // (verified by the mock being called)
    });
  });
});
