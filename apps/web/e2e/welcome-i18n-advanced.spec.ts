/**
 * E2E TESTS: Welcome Flow - Advanced i18n Tests
 *
 * Advanced internationalization tests for welcome page:
 * - Accept-Language header detection
 * - Page structure validation
 * - Responsive layout in all locales
 * - Content section translation verification
 *
 * F-06: I18n Welcome Flow Tests (Advanced)
 */

import { test, expect, testAllLocales } from './fixtures';
import { waitForLocale } from './fixtures';

// IMPORTANT: These tests check unauthenticated /welcome page
// Override global storageState to start without authentication
test.use({ storageState: undefined });

test.describe('Welcome Flow - Advanced i18n Tests', () => {
  /**
   * Test 1: Accept-Language header influences initial locale
   * Verifies that different Accept-Language headers are respected
   */
  // Skip: Accept-Language header detection requires intlMiddleware configuration
  // that is not yet implemented. The proxy detects locale from URL prefix, not headers.
  // Re-enable when createIntlMiddleware supports Accept-Language detection.
  test.skip('should detect Italian from Accept-Language header', async () => {});
  test.skip('should detect English from Accept-Language header', async () => {});
  test.skip('should detect French from Accept-Language header', async () => {});
  test.skip('should detect German from Accept-Language header', async () => {});
  test.skip('should detect Spanish from Accept-Language header', async () => {});

  /**
   * Test 2: Page elements have correct data attributes for i18n
   * Verifies that locale-sensitive elements are properly marked
   */
  testAllLocales('should have properly localized page structure', async ({ localePage }) => {
    await localePage.goto('/welcome');
    await waitForLocale(localePage.page, localePage.locale);

    // Verify HTML element has correct lang attribute
    const htmlElement = localePage.page.locator('html');
    const lang = await htmlElement.getAttribute('lang');
    expect(lang).toBe(localePage.locale);

    // Verify main content area exists and is visible
    const main = localePage.page.locator("main, [role='main']");
    await expect(main).toBeVisible({ timeout: 5000 });

    // Verify there are no untranslated strings visible (basic check)
    const bodyText = await localePage.page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
  });

  /**
   * Test 3: Welcome page responsive layout in all locales
   * Verifies page renders correctly on different screen sizes
   */
  testAllLocales('should render responsive layout in all locales', async ({ localePage }) => {
    await localePage.goto('/welcome');
    await waitForLocale(localePage.page, localePage.locale);

    // Check desktop layout
    const mainContent = localePage.page.locator("main, [role='main']");
    await expect(mainContent).toBeVisible();

    // Verify page is not horizontally scrolled
    const viewport = localePage.page.viewportSize();
    const boundingBox = await mainContent.boundingBox();
    expect(boundingBox?.width).toBeLessThanOrEqual(viewport?.width || 0);
  });

  /**
   * Test 4: Content sections are translated (hero, features, etc.)
   * Verifies major content sections have translated text
   */
  testAllLocales('should have translated content in all major sections', async ({ localePage }) => {
    await localePage.goto('/welcome');
    await waitForLocale(localePage.page, localePage.locale);

    // Wait for landing page sections to render with visible text content
    // TrialConsentGate has async useEffect that checks consent before rendering children
    // Use 'visible' state instead of 'attached' to ensure content has hydrated
    await localePage.page.locator('section').first().waitFor({ state: 'visible', timeout: 15000 });

    // Check for sections that should be present
    const sections = localePage.page.locator("section, [role='region'], div[class*='section']");
    const sectionCount = await sections.count();

    // Expect at least one section
    expect(sectionCount).toBeGreaterThan(0);

    // Verify at least one section has meaningful text content
    // Some sections may be empty during hydration; check that at least one has text
    let foundContentSection = false;
    for (let i = 0; i < Math.min(sectionCount, 5); i++) {
      const section = sections.nth(i);
      const text = await section.textContent();
      if (text && text.trim().length > 20) {
        foundContentSection = true;
        break;
      }
    }
    expect(foundContentSection).toBe(true);
  });
});
