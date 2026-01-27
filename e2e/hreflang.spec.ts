import { test, expect } from "@playwright/test";

test.describe("hreflang tags", () => {
  test.describe("on welcome page", () => {
    test("should have hreflang tags for all locales", async ({ page }) => {
      await page.goto("/it/welcome");

      // Wait for hreflang tags to be added to head
      await page.waitForTimeout(500);

      const hreflangLinks = await page
        .locator('link[rel="alternate"][hreflang]')
        .all();
      expect(hreflangLinks.length).toBeGreaterThanOrEqual(5); // At least 5 locales
    });

    test("should include Italian hreflang", async ({ page }) => {
      await page.goto("/it/welcome");
      await page.waitForTimeout(500);

      const itLink = await page
        .locator('link[rel="alternate"][hreflang="it"]')
        .first();
      const href = await itLink.getAttribute("href");
      expect(href).toContain("/it/welcome");
    });

    test("should include English hreflang", async ({ page }) => {
      await page.goto("/it/welcome");
      await page.waitForTimeout(500);

      const enLink = await page
        .locator('link[rel="alternate"][hreflang="en"]')
        .first();
      const href = await enLink.getAttribute("href");
      expect(href).toContain("/en/welcome");
    });

    test("should include x-default hreflang", async ({ page }) => {
      await page.goto("/it/welcome");
      await page.waitForTimeout(500);

      const xDefaultLink = await page
        .locator('link[rel="alternate"][hreflang="x-default"]')
        .first();
      const href = await xDefaultLink.getAttribute("href");
      expect(href).toContain("/it/welcome");
    });

    test("should have self-referencing hreflang", async ({ page }) => {
      await page.goto("/en/welcome");
      await page.waitForTimeout(500);

      const enLink = await page
        .locator('link[rel="alternate"][hreflang="en"]')
        .first();
      const href = await enLink.getAttribute("href");
      expect(href).toBe("https://mirrorbuddy.edu/en/welcome");
    });
  });

  test.describe("on home page", () => {
    test("should have hreflang tags on home page", async ({ page }) => {
      await page.goto("/it");
      await page.waitForTimeout(500);

      const hreflangLinks = await page
        .locator('link[rel="alternate"][hreflang]')
        .all();
      expect(hreflangLinks.length).toBeGreaterThanOrEqual(5);
    });

    test("should update hreflang tags when navigating between locales", async ({
      page,
    }) => {
      await page.goto("/it/welcome");
      await page.waitForTimeout(500);

      const initialLinks = await page
        .locator('link[rel="alternate"][hreflang="it"]')
        .all();
      expect(initialLinks.length).toBeGreaterThan(0);

      // Navigate to English version
      await page.goto("/en/welcome");
      await page.waitForTimeout(500);

      const enLink = await page
        .locator('link[rel="alternate"][hreflang="en"]')
        .first();
      const href = await enLink.getAttribute("href");
      expect(href).toContain("/en/welcome");
    });
  });

  test.describe("across different pages", () => {
    const pages = [
      { url: "/it/privacy", name: "Privacy" },
      { url: "/en/terms", name: "Terms" },
      { url: "/fr/welcome", name: "Welcome FR" },
    ];

    pages.forEach(({ url, name }) => {
      test(`should have hreflang tags on ${name} page`, async ({ page }) => {
        await page.goto(url);
        await page.waitForTimeout(500);

        const hreflangLinks = await page
          .locator('link[rel="alternate"][hreflang]')
          .all();
        expect(hreflangLinks.length).toBeGreaterThanOrEqual(5);

        // Verify each hreflang tag has valid attributes
        for (const link of hreflangLinks) {
          const rel = await link.getAttribute("rel");
          const hreflang = await link.getAttribute("hreflang");
          const href = await link.getAttribute("href");

          expect(rel).toBe("alternate");
          expect(hreflang).toBeTruthy();
          expect(href).toMatch(/^https?:\/\//);
        }
      });
    });
  });
});
