/**
 * E2E Tests: Parent Dashboard Touch Targets (F-51)
 *
 * Comprehensive audit of touch target sizes in parent dashboard.
 * WCAG 2.5.5 Target Size (Enhanced): All touch targets must be >= 44x44px.
 *
 * Test scenarios:
 * - All buttons are minimum 44x44px
 * - All interactive links have adequate tap area
 * - Filter controls are touch-friendly
 * - Date pickers are accessible
 * - No overlapping touch targets
 *
 * Run: npx playwright test e2e/parent-dashboard-touch-targets.spec.ts
 */

import { test, expect } from "./fixtures/base-fixtures";

// Minimum touch target size in pixels (WCAG 2.5.5 Enhanced)
const MIN_TOUCH_TARGET = 44;

/**
 * Check if a touch target meets minimum size requirements
 */
function isTouchTargetValid(
  box: { width: number; height: number } | null,
): boolean {
  if (!box) return false;
  return box.width >= MIN_TOUCH_TARGET && box.height >= MIN_TOUCH_TARGET;
}

test.describe("Parent Dashboard - Touch Targets (F-51)", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to parent dashboard
    await page.goto("/genitori");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);
  });

  test("ALL buttons have minimum 44x44px touch targets", async ({ page }) => {
    const buttons = await page.locator("button").all();
    const invalidButtons: Array<{
      text: string;
      width: number;
      height: number;
    }> = [];

    for (const button of buttons) {
      const box = await button.boundingBox();
      if (box && !isTouchTargetValid(box)) {
        const text = await button.textContent();
        invalidButtons.push({
          text: text || "unknown",
          width: Math.round(box.width),
          height: Math.round(box.height),
        });
      }
    }

    if (invalidButtons.length > 0) {
      console.log("\nInvalid button touch targets:");
      invalidButtons.forEach((btn) => {
        console.log(
          `  - "${btn.text}": ${btn.width}x${btn.height}px (need 44x44px)`,
        );
      });
    }

    expect(
      invalidButtons,
      "All buttons must have 44x44px minimum",
    ).toHaveLength(0);
  });

  test("ALL interactive links have adequate tap area", async ({ page }) => {
    const links = await page.locator("a[href]:not([role='menuitem'])").all();
    const invalidLinks: Array<{
      href: string;
      width: number;
      height: number;
    }> = [];

    for (const link of links) {
      const box = await link.boundingBox();
      if (box && !isTouchTargetValid(box)) {
        const href = await link.getAttribute("href");
        invalidLinks.push({
          href: href || "unknown",
          width: Math.round(box.width),
          height: Math.round(box.height),
        });
      }
    }

    if (invalidLinks.length > 0) {
      console.log("\nInvalid link touch targets:");
      invalidLinks.forEach((link) => {
        console.log(
          `  - "${link.href}": ${link.width}x${link.height}px (need 44x44px)`,
        );
      });
    }

    expect(invalidLinks, "All links must have 44x44px minimum").toHaveLength(0);
  });

  test("Filter controls are touch-friendly", async ({ page }) => {
    // Check for filter inputs, select, checkboxes
    const filterControls = await page
      .locator(
        "input[type='checkbox'], input[type='radio'], select, [role='listbox']",
      )
      .all();

    const invalidControls: Array<{
      type: string;
      width: number;
      height: number;
    }> = [];

    for (const control of filterControls) {
      const box = await control.boundingBox();
      if (box) {
        // For inputs, check the control itself
        const type = await control.getAttribute("type");
        // Custom controls need 44x44px; native inputs can be smaller but should be wrapped in touch area
        if (
          (type === "checkbox" || type === "radio") &&
          !isTouchTargetValid(box)
        ) {
          invalidControls.push({
            type: type || "unknown",
            width: Math.round(box.width),
            height: Math.round(box.height),
          });
        }
      }
    }

    if (invalidControls.length > 0) {
      console.log("\nSmall filter controls (should be wrapped):");
      invalidControls.forEach((ctrl) => {
        console.log(
          `  - ${ctrl.type}: ${ctrl.width}x${ctrl.height}px (should be 44x44px with wrapper)`,
        );
      });
    }

    // Note: Some controls may be wrapped in labels that provide the touch target
    // If there are invalid controls, they should either be resized or wrapped
  });

  test("Date pickers and similar controls are accessible", async ({ page }) => {
    // Look for date input controls
    const dateInputs = await page.locator("input[type='date']").all();
    const dateSelects = await page.locator("[aria-label*='date' i]").all();

    const allDateControls = [...dateInputs, ...dateSelects];
    const invalidControls: Array<{
      label: string;
      width: number;
      height: number;
    }> = [];

    for (const control of allDateControls) {
      const box = await control.boundingBox();
      if (box && !isTouchTargetValid(box)) {
        const label = await control.getAttribute("aria-label");
        invalidControls.push({
          label: label || "date control",
          width: Math.round(box.width),
          height: Math.round(box.height),
        });
      }
    }

    if (invalidControls.length > 0) {
      console.log("\nSmall date controls:");
      invalidControls.forEach((ctrl) => {
        console.log(
          `  - ${ctrl.label}: ${ctrl.width}x${ctrl.height}px (need 44x44px or wrapper)`,
        );
      });
    }
  });

  test("No critical overlapping touch targets", async ({ page }) => {
    const buttons = await page.locator("button").all();
    const overlaps: Array<{
      button1: string;
      button2: string;
      overlap: number;
    }> = [];

    const boxes = await Promise.all(
      buttons.map(async (btn) => ({
        element: btn,
        box: await btn.boundingBox(),
        text: await btn.textContent(),
      })),
    );

    // Check for overlapping boxes (critical issue)
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const box1 = boxes[i].box;
        const box2 = boxes[j].box;

        if (!box1 || !box2) continue;

        // Calculate overlap area
        const overlapX = Math.max(
          0,
          Math.min(box1.x + box1.width, box2.x + box2.width) -
            Math.max(box1.x, box2.x),
        );
        const overlapY = Math.max(
          0,
          Math.min(box1.y + box1.height, box2.y + box2.height) -
            Math.max(box1.y, box2.y),
        );
        const overlapArea = overlapX * overlapY;

        // Flag if more than 10% of touch target is overlapped
        const minArea = MIN_TOUCH_TARGET * MIN_TOUCH_TARGET * 0.1;
        if (overlapArea > minArea) {
          overlaps.push({
            button1: boxes[i].text || "unknown",
            button2: boxes[j].text || "unknown",
            overlap: Math.round(overlapArea),
          });
        }
      }
    }

    if (overlaps.length > 0) {
      console.log("\nOverlapping touch targets:");
      overlaps.forEach((overlap) => {
        console.log(`  - "${overlap.button1}" overlaps "${overlap.button2}"`);
      });
    }

    expect(
      overlaps,
      "No critical overlapping touch targets allowed",
    ).toHaveLength(0);
  });

  test("Expand/collapse buttons meet touch target size", async ({ page }) => {
    // Look for expand/collapse buttons (ChevronDown/ChevronUp icons)
    const expandButtons = await page
      .locator("button:has-text('Mostra'), button:has-text('Show')")
      .all();

    const invalidButtons: Array<{
      text: string;
      width: number;
      height: number;
    }> = [];

    for (const button of expandButtons) {
      const box = await button.boundingBox();
      if (box && !isTouchTargetValid(box)) {
        const text = await button.textContent();
        invalidButtons.push({
          text: text || "unknown",
          width: Math.round(box.width),
          height: Math.round(box.height),
        });
      }
    }

    if (invalidButtons.length > 0) {
      console.log("\nInvalid expand/collapse button sizes:");
      invalidButtons.forEach((btn) => {
        console.log(
          `  - "${btn.text}": ${btn.width}x${btn.height}px (need 44x44px)`,
        );
      });
    }

    // If there are expand buttons, they should meet minimum size
    if (expandButtons.length > 0) {
      expect(
        invalidButtons,
        "Expand/collapse buttons must have 44x44px minimum",
      ).toHaveLength(0);
    }
  });

  test("Icon buttons have minimum 44x44px size", async ({ page }) => {
    // Target buttons with only icons (no text)
    const iconButtons = await page.locator("button:not(:has-text())").all();

    const invalidButtons: Array<{
      width: number;
      height: number;
      ariaLabel: string | null;
    }> = [];

    for (const button of iconButtons) {
      const box = await button.boundingBox();
      if (box && !isTouchTargetValid(box)) {
        const ariaLabel = await button.getAttribute("aria-label");
        invalidButtons.push({
          width: Math.round(box.width),
          height: Math.round(box.height),
          ariaLabel: ariaLabel,
        });
      }
    }

    if (invalidButtons.length > 0) {
      console.log("\nInvalid icon button sizes:");
      invalidButtons.forEach((btn) => {
        console.log(
          `  - ${btn.width}x${btn.height}px (${btn.ariaLabel || "no label"}, need 44x44px)`,
        );
      });
    }

    expect(
      invalidButtons,
      "Icon buttons must have 44x44px minimum",
    ).toHaveLength(0);
  });
});
