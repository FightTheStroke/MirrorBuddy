/**
 * Password Reset i18n Tests
 *
 * Tests that all password reset flow keys exist in all 5 locales.
 *
 * Run: npm run test:unit -- password-reset-i18n
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const SUPPORTED_LOCALES = ["it", "en", "fr", "de", "es"] as const;
const MESSAGES_DIR = path.join(process.cwd(), "messages");

function loadAuthFile(locale: string): Record<string, unknown> {
  const authPath = path.join(MESSAGES_DIR, locale, "auth.json");
  const content = fs.readFileSync(authPath, "utf-8");
  const data = JSON.parse(content);
  return data.auth as Record<string, unknown>;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

describe("Password Reset i18n", () => {
  describe("forgotPassword section", () => {
    const forgotPasswordKeys = [
      "forgotPassword.title",
      "forgotPassword.description",
      "forgotPassword.emailLabel",
      "forgotPassword.emailPlaceholder",
      "forgotPassword.submitButton",
      "forgotPassword.successMessage",
      "forgotPassword.errorMessage",
      "forgotPassword.backToLogin",
    ];

    it("should have all forgotPassword keys in all locales", () => {
      SUPPORTED_LOCALES.forEach((locale) => {
        const auth = loadAuthFile(locale);

        forgotPasswordKeys.forEach((key) => {
          const value = getNestedValue(auth, key);
          expect(
            value,
            `${locale}/auth.json missing key: ${key}`,
          ).toBeDefined();
          expect(
            typeof value === "string",
            `${locale}/auth.json key ${key} must be a string`,
          ).toBe(true);
          expect(
            (value as string).length > 0,
            `${locale}/auth.json has empty value for: ${key}`,
          ).toBe(true);
        });
      });
    });
  });

  describe("resetPassword section", () => {
    const resetPasswordKeys = [
      "resetPassword.title",
      "resetPassword.description",
      "resetPassword.passwordLabel",
      "resetPassword.confirmLabel",
      "resetPassword.submitButton",
      "resetPassword.successMessage",
      "resetPassword.errorMessage",
      "resetPassword.invalidToken",
      "resetPassword.expiredToken",
    ];

    it("should have all resetPassword keys in all locales", () => {
      SUPPORTED_LOCALES.forEach((locale) => {
        const auth = loadAuthFile(locale);

        resetPasswordKeys.forEach((key) => {
          const value = getNestedValue(auth, key);
          expect(
            value,
            `${locale}/auth.json missing key: ${key}`,
          ).toBeDefined();
          expect(
            typeof value === "string",
            `${locale}/auth.json key ${key} must be a string`,
          ).toBe(true);
          expect(
            (value as string).length > 0,
            `${locale}/auth.json has empty value for: ${key}`,
          ).toBe(true);
        });
      });
    });
  });
});
