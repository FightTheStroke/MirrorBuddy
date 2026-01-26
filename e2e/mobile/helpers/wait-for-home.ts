import type { Page } from "@playwright/test";

export async function waitForHomeReady(page: Page) {
  const header = page.locator("header").first();
  const main = page.locator('main, [role="main"]').first();
  await header.waitFor({ state: "visible", timeout: 20000 });
  await main.waitFor({ state: "visible", timeout: 20000 });
}
