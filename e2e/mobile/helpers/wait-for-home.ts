import type { Page } from "@playwright/test";

export async function waitForHomeReady(page: Page) {
  // Wait for DOM content to be loaded
  await page.waitForLoadState("domcontentloaded", { timeout: 30000 });

  // Wait for critical page elements with longer timeout for mobile
  const header = page.locator("header").first();
  const main = page.locator('main, [role="main"]').first();

  await header.waitFor({ state: "visible", timeout: 30000 });
  await main.waitFor({ state: "visible", timeout: 30000 });

  // Allow React hydration to complete — elements may briefly unmount/remount
  // during client-side hydration causing boundingBox() to return null
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {
    // networkidle may not fire in some CI environments, continue anyway
  });
}
