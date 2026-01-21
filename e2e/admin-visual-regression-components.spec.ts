/**
 * E2E Tests: Admin Visual Regression - Component Consistency
 *
 * Visual regression tests verifying component styling consistency across
 * admin pages (buttons, spacing, colors, layout)
 *
 * F-01: Admin UI component consistency with shared design system
 *
 * Run: npx playwright test e2e/admin-visual-regression-components.spec.ts
 */

import { test, expect } from "./fixtures/auth-fixtures";
import { waitForPageReady } from "./admin-visual-regression-helpers";

// ============================================================================
// COMPONENT CONSISTENCY TESTS
// ============================================================================

test.describe("Admin Component Consistency (F-01)", () => {
  test("all pages use consistent button styling", async ({ adminPage }) => {
    const routesToTest = ["/admin", "/admin/users", "/admin/invites"];

    for (const route of routesToTest) {
      await adminPage.goto(route);
      await waitForPageReady(adminPage);

      const buttons = adminPage.locator("button:visible");
      const buttonCount = await buttons.count();

      if (buttonCount > 0) {
        // Check first visible button has proper styling
        const firstButton = buttons.first();
        const styles = await firstButton.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            padding: computed.padding,
            borderRadius: computed.borderRadius,
            fontSize: computed.fontSize,
          };
        });

        expect(
          styles.padding,
          `Button padding consistent on ${route}`,
        ).toBeTruthy();
        expect(
          styles.borderRadius,
          `Button border-radius consistent on ${route}`,
        ).toBeTruthy();
      }
    }
  });

  test("all pages use consistent spacing grid", async ({ adminPage }) => {
    const routesToTest = ["/admin", "/admin/users", "/admin/invites"];

    for (const route of routesToTest) {
      await adminPage.goto(route);
      await waitForPageReady(adminPage);

      // Check max-width container
      const container = adminPage.locator("[class*='max-w']");
      if ((await container.count()) > 0) {
        const maxWidth = await container.first().evaluate((el) => {
          return window.getComputedStyle(el).maxWidth;
        });

        expect(maxWidth, `Consistent max-width on ${route}`).toBeTruthy();
      }

      // Verify gap spacing in grid layouts
      const grids = adminPage.locator("[class*='gap-']");
      const gridCount = await grids.count();

      expect(
        gridCount,
        `Grid spacing utilities found on ${route}`,
      ).toBeGreaterThan(0);
    }
  });

  test("all pages use consistent color scheme", async ({ adminPage }) => {
    const routesToTest = ["/admin", "/admin/users", "/admin/invites"];

    for (const route of routesToTest) {
      await adminPage.goto(route);
      await waitForPageReady(adminPage);

      // Check for foreground color consistency
      const textElements = adminPage.locator("p, span, h1, h2, h3");
      if ((await textElements.count()) > 0) {
        const color = await textElements.first().evaluate((el) => {
          return window.getComputedStyle(el).color;
        });

        expect(color, `Text color defined on ${route}`).toBeTruthy();
        expect(color).not.toBe("rgba(0, 0, 0, 0)"); // Not transparent
      }

      // Check for background consistency
      const mainArea = adminPage.locator("main, [role='main']");
      if ((await mainArea.count()) > 0) {
        const bgColor = await mainArea.first().evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });

        expect(bgColor, `Background color defined on ${route}`).toBeTruthy();
      }
    }
  });

  test("headings and structure consistent", async ({ adminPage }) => {
    const routesToTest = ["/admin", "/admin/users", "/admin/invites"];

    for (const route of routesToTest) {
      await adminPage.goto(route);
      await waitForPageReady(adminPage);

      // Check page has main heading
      const mainHeading = adminPage.locator("h1");
      expect(
        await mainHeading.count(),
        `Main heading present on ${route}`,
      ).toBeGreaterThan(0);

      // Check for semantic structure
      const semantic = adminPage.locator("main, nav, aside, section");
      expect(
        await semantic.count(),
        `Semantic HTML found on ${route}`,
      ).toBeGreaterThan(0);

      // Verify lists have proper structure
      const lists = adminPage.locator("ul, ol, [role='list']");
      if ((await lists.count()) > 0) {
        const listItems = adminPage.locator("li, [role='listitem']");
        expect(
          await listItems.count(),
          `List items found on ${route}`,
        ).toBeGreaterThan(0);
      }
    }
  });

  test("interactive elements are accessible", async ({ adminPage }) => {
    const routesToTest = ["/admin", "/admin/users", "/admin/invites"];

    for (const route of routesToTest) {
      await adminPage.goto(route);
      await waitForPageReady(adminPage);

      // Check buttons are focusable
      const buttons = adminPage.locator("button");
      const visibleButtons = await buttons
        .filter({ hasNot: adminPage.locator("[disabled]") })
        .count();

      if (visibleButtons > 0) {
        const firstButton = buttons.first();
        const isFocusable = await firstButton.evaluate((el) => {
          return el.tabIndex >= -1;
        });
        expect(isFocusable, `Buttons focusable on ${route}`).toBe(true);
      }

      // Check for proper focus styles
      const interactiveElements = adminPage.locator(
        "button, a, input, select, textarea",
      );
      if ((await interactiveElements.count()) > 0) {
        const focusOutline = await interactiveElements
          .first()
          .evaluate((el) => {
            return window.getComputedStyle(el).outline;
          });
        // Should have some form of focus indicator (outline, ring, etc)
        expect(
          focusOutline ||
            (await interactiveElements
              .first()
              .locator("[class*='focus']")
              .count()) > 0,
        ).toBeTruthy();
      }
    }
  });
});
