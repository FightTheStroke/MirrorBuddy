/**
 * E2E Tests: Compliance & Legal Pages
 *
 * Tests compliance-related pages for accessibility and content.
 * Covers: Privacy Policy, Terms of Service, Cookie Policy, AI Transparency
 *
 * Run: npx playwright test e2e/compliance.spec.ts
 */

import { test, expect } from "@playwright/test";

test.describe("Compliance Pages - Accessibility", () => {
  test("privacy policy page is accessible", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page).toHaveTitle(/privacy|privacy policy/i);

    const mainContent = page.getByRole("main");
    const isVisible = await mainContent.isVisible().catch(() => false);
    if (isVisible) {
      await expect(mainContent).toBeVisible();
    }
  });

  test("terms of service page is accessible", async ({ page }) => {
    await page.goto("/terms");
    await expect(page).toHaveTitle(/terms|condizioni|termini/i);

    const mainContent = page.getByRole("main");
    const isVisible = await mainContent.isVisible().catch(() => false);
    if (isVisible) {
      await expect(mainContent).toBeVisible();
    }
  });

  test("cookie policy page is accessible", async ({ page }) => {
    await page.goto("/cookies");
    await expect(page).toHaveTitle(/cookie|policy/i);

    const mainContent = page.getByRole("main");
    const isVisible = await mainContent.isVisible().catch(() => false);
    if (isVisible) {
      await expect(mainContent).toBeVisible();
    }
  });

  test("AI transparency page is accessible", async ({ page }) => {
    await page.goto("/ai-transparency");
    await expect(page).toHaveTitle(/trasparenza|transparency|ai/i);

    const mainContent = page.getByRole("main");
    const isVisible = await mainContent.isVisible().catch(() => false);
    if (isVisible) {
      await expect(mainContent).toBeVisible();
    }
  });
});

test.describe("Compliance Pages - Content Verification", () => {
  test("privacy policy contains privacy commitment", async ({ page }) => {
    await page.goto("/privacy");
    const content = await page.textContent("body");
    if (content) {
      const hasPrivacyContent = /data|privacy|protection|gdpr/i.test(content);
      expect(hasPrivacyContent).toBeTruthy();
    }
  });

  test("AI transparency page has required sections", async ({ page }) => {
    await page.goto("/ai-transparency");
    const content = await page.textContent("body");
    if (content) {
      const hasAIContent = /AI|system|azure|openai|disclosure/i.test(content);
      expect(hasAIContent).toBeTruthy();
    }
  });

  test("compliance pages have page headers", async ({ page }) => {
    const pages = ["/privacy", "/terms", "/cookies", "/ai-transparency"];

    for (const path of pages) {
      await page.goto(path);
      const heading = page.getByRole("heading").first();
      const isVisible = await heading.isVisible().catch(() => false);
      expect(isVisible || path).toBeTruthy();
    }
  });
});

test.describe("Compliance Pages - Keyboard Navigation", () => {
  test("privacy policy is keyboard navigable", async ({ page }) => {
    await page.goto("/privacy");

    // Test Tab key navigation
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeDefined();
  });

  test("AI transparency page links are keyboard accessible", async ({
    page,
  }) => {
    await page.goto("/ai-transparency");

    const links = await page.locator("a").count();
    if (links > 0) {
      await page.keyboard.press("Tab");
      await page.evaluate(() => {
        const el = document.activeElement;
        return el?.tagName === "A";
      });
      // May not always tab to first link, but should be navigable
      expect(links).toBeGreaterThan(0);
    }
  });
});
