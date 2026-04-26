/**
 * Unit tests for language cookie utilities
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getLanguageCookie,
  setLanguageCookie,
  removeLanguageCookie,
  getBrowserLanguage,
} from "../language-cookie";

describe("Language Cookie Utilities", () => {
  beforeEach(() => {
    // Clear cookies before each test
    document.cookie = "NEXT_LOCALE=; path=/; max-age=0";
  });

  describe("getLanguageCookie", () => {
    it("should return null when no cookie is set", () => {
      expect(getLanguageCookie()).toBeNull();
    });

    it("should return locale from NEXT_LOCALE cookie", () => {
      document.cookie = "NEXT_LOCALE=en; path=/";
      expect(getLanguageCookie()).toBe("en");
    });

    it("should return null for invalid locale in cookie", () => {
      document.cookie = "NEXT_LOCALE=invalid; path=/";
      expect(getLanguageCookie()).toBeNull();
    });

    it("should find NEXT_LOCALE among multiple cookies", () => {
      document.cookie = "session=abc123; path=/";
      document.cookie = "NEXT_LOCALE=fr; path=/";
      document.cookie = "theme=dark; path=/";
      expect(getLanguageCookie()).toBe("fr");
    });
  });

  describe("setLanguageCookie", () => {
    it("should set NEXT_LOCALE cookie with valid locale", () => {
      setLanguageCookie("en");
      expect(document.cookie).toContain("NEXT_LOCALE=en");
    });

    it("should set cookie with 1-year max-age", () => {
      setLanguageCookie("en");
      const cookies = document.cookie.split(";");
      const localeCookie = cookies.find((c) =>
        c.trim().startsWith("NEXT_LOCALE"),
      );
      expect(localeCookie).toBeDefined();
    });

    it("should use default locale for invalid input", () => {
      // Mock console.warn to suppress warning in test
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      setLanguageCookie("invalid" as any);
      expect(document.cookie).toContain("NEXT_LOCALE=it");
      warnSpy.mockRestore();
    });
  });

  describe("removeLanguageCookie", () => {
    it("should remove NEXT_LOCALE cookie", () => {
      document.cookie = "NEXT_LOCALE=en; path=/";
      removeLanguageCookie();
      expect(getLanguageCookie()).toBeNull();
    });
  });

  describe("getBrowserLanguage", () => {
    it("should return supported locale from navigator.language", () => {
      // Mock navigator.language
      Object.defineProperty(navigator, "language", {
        value: "en-US",
        configurable: true,
      });
      expect(getBrowserLanguage()).toBe("en");
    });

    it("should return null for unsupported browser language", () => {
      Object.defineProperty(navigator, "language", {
        value: "ja-JP",
        configurable: true,
      });
      expect(getBrowserLanguage()).toBeNull();
    });

    it("should extract base language code", () => {
      Object.defineProperty(navigator, "language", {
        value: "it-IT",
        configurable: true,
      });
      expect(getBrowserLanguage()).toBe("it");
    });
  });
});
