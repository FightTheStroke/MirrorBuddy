import type { Page } from "@playwright/test";

export async function waitForHomeReady(page: Page) {
  // Wait for network to be idle - crucial for mobile with slower connections
  await page.waitForLoadState("networkidle", { timeout: 30000 });

  // Wait for DOM to be ready
  await page.waitForLoadState("domcontentloaded", { timeout: 30000 });

  // Wait for critical page elements with longer timeout for mobile
  const header = page.locator("header").first();
  const main = page.locator('main, [role="main"]').first();

  await header.waitFor({ state: "visible", timeout: 30000 });
  await main.waitFor({ state: "visible", timeout: 30000 });
}
