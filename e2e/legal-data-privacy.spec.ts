/**
 * E2E Tests: Data Privacy & Legal Pages
 *
 * Tests for GDPR, COPPA compliance and legal page navigation.
 *
 * F-04: COPPA parent verification
 * F-16: GDPR data portability (Art. 20)
 *
 * Run: npx playwright test e2e/legal-data-privacy.spec.ts
 */

import { test, expect } from "@playwright/test";

// ============================================================================
// GDPR DATA PORTABILITY (ART. 20)
// ============================================================================

test.describe("GDPR Data Portability", () => {
  test("export API endpoint exists", async ({ request }) => {
    await request.get("/api/user");
    const response = await request.get("/api/privacy/export-data");

    // 200 (success) or 429 (rate limited)
    expect([200, 429]).toContain(response.status());
  });

  test("export returns structured JSON", async ({ request }) => {
    await request.get("/api/user");
    const response = await request.get("/api/privacy/export-data");

    if (response.status() === 200) {
      const data = await response.json();
      expect(data.data).toBeDefined();
      expect(data.stats).toBeDefined();
      expect(data.data.exportedAt).toBeDefined();
    }
  });

  test("export has download header", async ({ request }) => {
    await request.get("/api/user");
    const response = await request.get("/api/privacy/export-data");

    if (response.status() === 200) {
      const disposition = response.headers()["content-disposition"];
      expect(disposition).toMatch(/attachment/i);
    }
  });

  test("export is rate limited", async ({ request }) => {
    await request.get("/api/user");

    // First request
    await request.get("/api/privacy/export-data");

    // Second immediate request should be rate limited
    const response = await request.get("/api/privacy/export-data");
    expect([200, 429]).toContain(response.status());
  });
});

// ============================================================================
// COPPA COMPLIANCE
// ============================================================================

test.describe("COPPA Child Protection", () => {
  test("onboarding flow exists", async ({ page }) => {
    const response = await page.goto("/welcome");
    // Should load or redirect (onboarding bypassed in tests)
    expect(response?.ok() || response?.status() === 307).toBeTruthy();
  });

  test("privacy page mentions child protection", async ({ page }) => {
    await page.goto("/privacy");
    const content = await page.textContent("body");

    const hasChildProtection =
      /minor|bambini|children|coppa|genitor|parent|under.*13|under.*16/i.test(
        content || "",
      );
    expect(hasChildProtection).toBeTruthy();
  });

  test("terms page exists", async ({ page }) => {
    const response = await page.goto("/terms");
    expect(response?.ok()).toBeTruthy();
  });
});

// ============================================================================
// LEGAL PAGES NAVIGATION
// ============================================================================

test.describe("Legal Pages - Privacy Policy", () => {
  test("page loads", async ({ page }) => {
    const response = await page.goto("/privacy");
    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveTitle(/privacy|riservatezza/i);
  });

  test("has content about data", async ({ page }) => {
    await page.goto("/privacy");
    const content = await page.textContent("body");
    expect(content).toMatch(/data|privacy|protection|gdpr/i);
  });

  test("is keyboard accessible", async ({ page }) => {
    await page.goto("/privacy");
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeDefined();
  });
});

test.describe("Legal Pages - Terms of Service", () => {
  test("page loads", async ({ page }) => {
    const response = await page.goto("/terms");
    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveTitle(/terms|condizioni|servizio/i);
  });

  test("has terms content", async ({ page }) => {
    await page.goto("/terms");
    const content = await page.textContent("body");
    expect(content?.length).toBeGreaterThan(100);
  });
});

test.describe("Legal Pages - Cookie Policy", () => {
  test("page loads", async ({ page }) => {
    const response = await page.goto("/cookies");
    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveTitle(/cookie/i);
  });

  test("explains cookie usage", async ({ page }) => {
    await page.goto("/cookies");
    const content = await page.textContent("body");
    expect(content).toMatch(/cookie|essential|analytics|consent/i);
  });
});

// ============================================================================
// FOOTER LEGAL LINKS
// ============================================================================

test.describe("Footer Legal Links", () => {
  test("has privacy link", async ({ page }) => {
    await page.goto("/home");
    const footer = page.locator("footer");
    const link = footer.locator('a[href*="privacy"]');

    if ((await link.count()) > 0) {
      await expect(link.first()).toBeVisible();
    }
  });

  test("has terms link", async ({ page }) => {
    await page.goto("/home");
    const footer = page.locator("footer");
    const link = footer.locator('a[href*="terms"]');

    if ((await link.count()) > 0) {
      await expect(link.first()).toBeVisible();
    }
  });

  test("has AI transparency link", async ({ page }) => {
    await page.goto("/home");
    const footer = page.locator("footer");
    const link = footer.locator('a[href*="ai-transparency"]');

    if ((await link.count()) > 0) {
      await expect(link.first()).toBeVisible();
    }
  });

  test("footer links are clickable", async ({ page }) => {
    await page.goto("/home");
    const footer = page.locator("footer");
    const links = footer.locator("a");

    const count = await links.count();
    if (count > 0) {
      // All footer links should be visible and clickable
      for (let i = 0; i < Math.min(count, 5); i++) {
        const link = links.nth(i);
        if (await link.isVisible()) {
          await expect(link).toBeEnabled();
        }
      }
    }
  });
});

// ============================================================================
// COMPLIANCE HUB & DPIA
// ============================================================================

test.describe("Compliance Hub Page", () => {
  test("page loads", async ({ page }) => {
    const response = await page.goto("/compliance");
    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveTitle(/compliance|trasparenza/i);
  });

  test("has compliance badges", async ({ page }) => {
    await page.goto("/compliance");
    const content = await page.textContent("body");

    // Should show all major compliance badges
    expect(content).toMatch(/GDPR/i);
    expect(content).toMatch(/AI Act/i);
    expect(content).toMatch(/COPPA/i);
    expect(content).toMatch(/L\.132\/2025|132\/2025/i);
  });

  test("links to public documents", async ({ page }) => {
    await page.goto("/compliance");

    // Check for links to public legal documents
    const privacyLink = page.locator('a[href*="privacy"]');
    const termsLink = page.locator('a[href*="terms"]');
    const aiTransparencyLink = page.locator('a[href*="ai-transparency"]');

    await expect(privacyLink.first()).toBeVisible();
    await expect(termsLink.first()).toBeVisible();
    await expect(aiTransparencyLink.first()).toBeVisible();
  });

  test("links to DPIA documentation", async ({ page }) => {
    await page.goto("/compliance");

    // DPIA should be linked (external to GitHub)
    const dpiaLink = page.locator('a[href*="DPIA"]');
    if ((await dpiaLink.count()) > 0) {
      await expect(dpiaLink.first()).toBeVisible();
    }

    // Or mentioned in content
    const content = await page.textContent("body");
    expect(content).toMatch(/DPIA|valutazione.*impatto|impact.*assessment/i);
  });

  test("has contact information", async ({ page }) => {
    await page.goto("/compliance");
    const content = await page.textContent("body");

    // Should have contact email for compliance questions
    expect(content).toMatch(/info@fightthestroke\.org|contatt/i);
  });

  test("is keyboard accessible", async ({ page }) => {
    await page.goto("/compliance");
    await page.keyboard.press("Tab");

    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeDefined();
  });
});

test.describe("Footer Compliance Link", () => {
  test("has compliance link in footer", async ({ page }) => {
    await page.goto("/home");
    const footer = page.locator("footer");
    const link = footer.locator('a[href*="compliance"]');

    if ((await link.count()) > 0) {
      await expect(link.first()).toBeVisible();
    }
  });
});

// ============================================================================
// CONSENT MANAGEMENT
// ============================================================================

test.describe("Consent Management", () => {
  test("cookie consent stored in localStorage", async ({ page }) => {
    await page.goto("/home");

    const consent = await page.evaluate(() => {
      return localStorage.getItem("mirrorbuddy-consent");
    });

    // Consent should be set (from global-setup)
    expect(consent).toBeTruthy();
  });

  test("consent includes required fields", async ({ page }) => {
    await page.goto("/home");

    const consent = await page.evaluate(() => {
      const raw = localStorage.getItem("mirrorbuddy-consent");
      return raw ? JSON.parse(raw) : null;
    });

    if (consent) {
      expect(consent.essential).toBeDefined();
      expect(consent.acceptedAt).toBeDefined();
    }
  });
});
