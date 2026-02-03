/**
 * LocalePage Class
 *
 * Locale-aware page wrapper for Playwright tests.
 * Provides methods for navigating and interacting with pages in specific locales.
 */

import type { Page } from "@playwright/test";
import type { Locale } from "@/i18n/config";

/**
 * LocalePage - Locale-aware page wrapper
 *
 * Provides methods for navigating and interacting with pages in specific locales
 */
export class LocalePage {
  constructor(
    public readonly page: Page,
    public readonly locale: Locale,
  ) {}

  /**
   * Navigate to a path with locale prefix
   * @param path - Path without locale prefix (e.g., '/home')
   * @returns Promise resolving when navigation completes
   */
  async goto(path: string): Promise<void> {
    // Ensure path starts with /
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const localizedPath = `/${this.locale}${cleanPath}`;
    const navigate = async () => {
      await this.page.goto(localizedPath, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
    };
    try {
      await navigate();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes("net::ERR_ABORTED") ||
        message.includes("detached")
      ) {
        await this.page.waitForTimeout(1000);
        await navigate();
        return;
      }
      throw error;
    }
  }

  /**
   * Wait for page to be fully loaded in correct locale
   */
  async waitForLocaleLoad(): Promise<void> {
    // Wait for HTML lang attribute to match locale
    await this.page.waitForSelector(`html[lang="${this.locale}"]`, {
      timeout: 5000,
    });
  }

  /**
   * Get current locale from page
   */
  async getCurrentLocale(): Promise<string | null> {
    return await this.page.locator("html").getAttribute("lang");
  }

  /**
   * Check if locale switcher is present and shows correct locale
   */
  async hasLocaleSwitcher(): Promise<boolean> {
    // Look for locale switcher UI element (adjust selector as needed)
    const switcher = this.page.locator('[aria-label*="language"]').first();
    return await switcher.isVisible().catch(() => false);
  }

  /**
   * Switch to a different locale via UI
   * @param _newLocale - Target locale to switch to
   */
  async switchLocale(_newLocale: Locale): Promise<void> {
    // This is a placeholder - implement based on actual UI
    // May need to click language switcher and select option
    throw new Error(
      "switchLocale() not implemented - needs UI-specific implementation",
    );
  }
}
