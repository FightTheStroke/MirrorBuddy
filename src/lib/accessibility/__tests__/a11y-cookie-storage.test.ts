/**
 * Tests for a11y-cookie-storage.ts
 *
 * @vitest-environment jsdom
 * @module accessibility/__tests__/a11y-cookie-storage.test
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getA11yCookie,
  setA11yCookie,
  clearA11yCookie,
  hasA11yCookie,
  type A11yCookieData,
} from "../a11y-cookie-storage";

describe("a11y-cookie-storage", () => {
  beforeEach(() => {
    // Clear all cookies before each test
    document.cookie.split(";").forEach((cookie) => {
      const name = cookie.split("=")[0].trim();
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });
  });

  afterEach(() => {
    // Clean up
    clearA11yCookie();
  });

  describe("getA11yCookie", () => {
    it("should return null when no cookie exists", () => {
      expect(getA11yCookie()).toBeNull();
    });

    it("should return cookie data when valid cookie exists", () => {
      const data: A11yCookieData = {
        version: "1",
        activeProfile: "dyslexia",
        overrides: { dyslexiaFont: true },
        browserDetectedApplied: true,
      };
      document.cookie = `mirrorbuddy-a11y=${encodeURIComponent(JSON.stringify(data))}; path=/`;

      const result = getA11yCookie();
      expect(result).toEqual(data);
    });

    it("should return null for invalid JSON", () => {
      document.cookie = "mirrorbuddy-a11y=invalid-json; path=/";
      expect(getA11yCookie()).toBeNull();
    });

    it("should return null for outdated version", () => {
      const data = {
        version: "0", // Old version
        activeProfile: null,
        overrides: {},
        browserDetectedApplied: false,
      };
      document.cookie = `mirrorbuddy-a11y=${encodeURIComponent(JSON.stringify(data))}; path=/`;

      expect(getA11yCookie()).toBeNull();
    });
  });

  describe("setA11yCookie", () => {
    it("should create new cookie with provided data", () => {
      setA11yCookie({ activeProfile: "adhd" });

      const result = getA11yCookie();
      expect(result?.activeProfile).toBe("adhd");
      expect(result?.version).toBe("1");
    });

    it("should merge with existing cookie data", () => {
      setA11yCookie({ activeProfile: "visual" });
      setA11yCookie({ browserDetectedApplied: true });

      const result = getA11yCookie();
      expect(result?.activeProfile).toBe("visual");
      expect(result?.browserDetectedApplied).toBe(true);
    });

    it("should preserve overrides when updating other fields", () => {
      setA11yCookie({
        activeProfile: "motor",
        overrides: { keyboardNavigation: true },
      });
      setA11yCookie({ browserDetectedApplied: true });

      const result = getA11yCookie();
      expect(result?.overrides).toEqual({ keyboardNavigation: true });
    });
  });

  describe("clearA11yCookie", () => {
    it("should remove the cookie", () => {
      setA11yCookie({ activeProfile: "autism" });
      expect(hasA11yCookie()).toBe(true);

      clearA11yCookie();
      expect(hasA11yCookie()).toBe(false);
    });
  });

  describe("hasA11yCookie", () => {
    it("should return false when no cookie exists", () => {
      expect(hasA11yCookie()).toBe(false);
    });

    it("should return true when valid cookie exists", () => {
      setA11yCookie({ activeProfile: null });
      expect(hasA11yCookie()).toBe(true);
    });
  });

  describe("cookie persistence", () => {
    it("should store all profile types", () => {
      const profiles = [
        "dyslexia",
        "adhd",
        "visual",
        "motor",
        "autism",
        "auditory",
        "cerebral",
      ];

      for (const profile of profiles) {
        setA11yCookie({ activeProfile: profile });
        const result = getA11yCookie();
        expect(result?.activeProfile).toBe(profile);
      }
    });

    it("should handle null activeProfile", () => {
      setA11yCookie({ activeProfile: "dyslexia" });
      setA11yCookie({ activeProfile: null });

      const result = getA11yCookie();
      expect(result?.activeProfile).toBeNull();
    });

    it("should handle complex overrides", () => {
      const overrides = {
        dyslexiaFont: true,
        highContrast: true,
        reducedMotion: true,
        fontSize: 1.2,
        lineSpacing: 1.5,
      };

      setA11yCookie({ overrides });
      const result = getA11yCookie();
      expect(result?.overrides).toEqual(overrides);
    });
  });
});
