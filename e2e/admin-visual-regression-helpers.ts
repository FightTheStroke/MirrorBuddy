/**
 * Admin Visual Regression Test Helpers
 *
 * Shared utilities for visual regression testing of admin pages
 * Used by: admin-visual-regression-*.spec.ts
 */

import type { Page } from "@playwright/test";

/**
 * Wait for page to be fully rendered and animations complete
 */
export async function waitForPageReady(page: Page) {
  await page.waitForLoadState("networkidle");
  // Wait for any CSS transitions to complete
  await page.waitForTimeout(500);
}

/**
 * Check for layout shifts by verifying key elements have stable bounding boxes
 */
export async function checkLayoutStability(page: Page): Promise<string[]> {
  const issues: string[] = [];

  // Get main content area
  const main = page.locator("main, [role='main']").first();
  if (!(await main.isVisible().catch(() => false))) {
    issues.push("Main content area not visible");
    return issues;
  }

  // Check for common layout shift indicators
  const boundingBox1 = await main.boundingBox();

  // Wait a bit and check again
  await page.waitForTimeout(300);
  const boundingBox2 = await main.boundingBox();

  if (boundingBox1 && boundingBox2) {
    const shift =
      Math.abs(boundingBox1.width - boundingBox2.width) > 5 ||
      Math.abs(boundingBox1.height - boundingBox2.height) > 5;

    if (shift) {
      issues.push(
        `Layout shift detected: ${JSON.stringify(boundingBox1)} -> ${JSON.stringify(boundingBox2)}`,
      );
    }
  }

  return issues;
}

/**
 * Verify spacing consistency by checking standard spacing values
 */
export async function checkSpacingConsistency(page: Page): Promise<string[]> {
  const issues: string[] = [];

  // Check for common spacing classes
  const elementsWithSpacing = page.locator(
    "[class*='gap-'], [class*='p-'], [class*='m-'], [class*='space-']",
  );
  const count = await elementsWithSpacing.count();

  if (count === 0) {
    issues.push("No spacing utilities found - layout may be broken");
  }

  // Verify page header exists and has proper spacing
  const pageHeader = page.locator('[class*="flex"][class*="items-center"]');
  if ((await pageHeader.count()) > 0) {
    const padding = await pageHeader.first().evaluate((el) => {
      return window.getComputedStyle(el).padding;
    });

    if (!padding || padding === "0px") {
      issues.push("Page header has no padding - spacing inconsistent");
    }
  }

  return issues;
}

/**
 * Verify critical components are rendered
 */
export async function checkComponentRendering(page: Page): Promise<string[]> {
  const issues: string[] = [];

  // Check for buttons
  const buttons = page.locator("button:visible");
  const buttonCount = await buttons.count();
  if (buttonCount === 0) {
    issues.push("No buttons found - critical components missing");
  }

  // Check for headings
  const headings = page.locator("h1, h2, h3");
  const headingCount = await headings.count();
  if (headingCount === 0) {
    issues.push("No headings found - page structure incomplete");
  }

  // Check for icons (lucide-react or similar)
  const icons = page.locator("svg, [class*='icon']");
  const iconCount = await icons.count();
  if (iconCount === 0) {
    issues.push("No icons found - visual design incomplete");
  }

  return issues;
}

/**
 * Admin routes to test
 */
export const ADMIN_VISUAL_ROUTES = [
  "/admin",
  "/admin/users",
  "/admin/invites",
  "/admin/safety",
] as const;
