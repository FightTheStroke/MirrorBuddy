/**
 * Password Reset Email Template Tests
 *
 * Tests the password reset email template function for all locales.
 *
 * Run: npm run test:unit -- password-reset-template
 */

import { describe, it, expect } from "vitest";
import { getPasswordResetEmail } from "../password-reset-template";

const SUPPORTED_LOCALES = ["it", "en", "fr", "de", "es"] as const;
const TEST_RESET_URL = "https://example.com/reset?token=abc123";

describe("getPasswordResetEmail", () => {
  describe("should return email with subject and html", () => {
    SUPPORTED_LOCALES.forEach((locale) => {
      it(`should work for locale: ${locale}`, () => {
        const result = getPasswordResetEmail(TEST_RESET_URL, locale);

        expect(result).toBeDefined();
        expect(result.subject).toBeDefined();
        expect(typeof result.subject).toBe("string");
        expect(result.subject.length).toBeGreaterThan(0);

        expect(result.html).toBeDefined();
        expect(typeof result.html).toBe("string");
        expect(result.html.length).toBeGreaterThan(0);
      });
    });
  });

  describe("should include reset URL in html", () => {
    SUPPORTED_LOCALES.forEach((locale) => {
      it(`should include URL for locale: ${locale}`, () => {
        const result = getPasswordResetEmail(TEST_RESET_URL, locale);
        expect(result.html).toContain(TEST_RESET_URL);
      });
    });
  });

  describe("should include expiry warning", () => {
    SUPPORTED_LOCALES.forEach((locale) => {
      it(`should mention expiry for locale: ${locale}`, () => {
        const result = getPasswordResetEmail(TEST_RESET_URL, locale);
        // Check for "1 hour" or equivalent in various locales
        expect(
          result.html.includes("1 hour") ||
            result.html.includes("1 ora") ||
            result.html.includes("1 heure") ||
            result.html.includes("1 Stunde") ||
            result.html.includes("1 hora"),
        ).toBe(true);
      });
    });
  });

  describe("should be valid HTML", () => {
    SUPPORTED_LOCALES.forEach((locale) => {
      it(`should have html and body tags for locale: ${locale}`, () => {
        const result = getPasswordResetEmail(TEST_RESET_URL, locale);
        expect(result.html).toContain("<html");
        expect(result.html).toContain("</html>");
        expect(result.html).toContain("<body");
        expect(result.html).toContain("</body>");
      });
    });
  });

  describe("should have a clickable button/link", () => {
    SUPPORTED_LOCALES.forEach((locale) => {
      it(`should have href with reset URL for locale: ${locale}`, () => {
        const result = getPasswordResetEmail(TEST_RESET_URL, locale);
        expect(result.html).toContain(`href="${TEST_RESET_URL}"`);
      });
    });
  });
});
