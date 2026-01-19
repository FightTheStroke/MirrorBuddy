/**
 * Tests for browser-detection.ts
 *
 * @vitest-environment jsdom
 * @module accessibility/__tests__/browser-detection.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  detectBrowserPreferences,
  browserPrefsToSettings,
  type BrowserA11yPreferences,
} from "../browser-detection";

describe("browser-detection", () => {
  beforeEach(() => {
    // Mock matchMedia with proper type
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("detectBrowserPreferences", () => {
    it("should detect prefers-reduced-motion: reduce", () => {
      (window.matchMedia as ReturnType<typeof vi.fn>).mockImplementation(
        (query: string) => ({
          matches:
            query === "(prefers-reduced-motion: reduce)" ||
            query === "(prefers-reduced-motion)",
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }),
      );

      const prefs = detectBrowserPreferences();
      expect(prefs.prefersReducedMotion).toBe(true);
    });

    it("should detect prefers-color-scheme: dark", () => {
      (window.matchMedia as ReturnType<typeof vi.fn>).mockImplementation(
        (query: string) => ({
          matches: query === "(prefers-color-scheme: dark)",
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }),
      );

      const prefs = detectBrowserPreferences();
      expect(prefs.prefersDarkMode).toBe(true);
    });

    it("should detect prefers-contrast: more", () => {
      (window.matchMedia as ReturnType<typeof vi.fn>).mockImplementation(
        (query: string) => ({
          matches:
            query === "(prefers-contrast: more)" ||
            query === "(prefers-contrast: high)",
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }),
      );

      const prefs = detectBrowserPreferences();
      expect(prefs.prefersHighContrast).toBe(true);
    });

    it("should return all false when no preferences set", () => {
      (window.matchMedia as ReturnType<typeof vi.fn>).mockImplementation(
        (query: string) => ({
          matches: false,
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }),
      );

      const prefs = detectBrowserPreferences();
      expect(prefs.prefersReducedMotion).toBe(false);
      expect(prefs.prefersDarkMode).toBe(false);
      expect(prefs.prefersHighContrast).toBe(false);
    });

    it("should detect multiple preferences", () => {
      (window.matchMedia as ReturnType<typeof vi.fn>).mockImplementation(
        (query: string) => ({
          matches:
            query === "(prefers-reduced-motion: reduce)" ||
            query === "(prefers-reduced-motion)" ||
            query === "(prefers-contrast: more)",
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }),
      );

      const prefs = detectBrowserPreferences();
      expect(prefs.prefersReducedMotion).toBe(true);
      expect(prefs.prefersHighContrast).toBe(true);
      expect(prefs.prefersDarkMode).toBe(false);
    });
  });

  describe("browserPrefsToSettings", () => {
    it("should return empty object when no preferences", () => {
      const prefs: BrowserA11yPreferences = {
        prefersReducedMotion: false,
        prefersDarkMode: false,
        prefersHighContrast: false,
      };

      const settings = browserPrefsToSettings(prefs);
      expect(Object.keys(settings)).toHaveLength(0);
    });

    it("should map reducedMotion preference", () => {
      const prefs: BrowserA11yPreferences = {
        prefersReducedMotion: true,
        prefersDarkMode: false,
        prefersHighContrast: false,
      };

      const settings = browserPrefsToSettings(prefs);
      expect(settings.reducedMotion).toBe(true);
    });

    it("should map highContrast preference", () => {
      const prefs: BrowserA11yPreferences = {
        prefersReducedMotion: false,
        prefersDarkMode: false,
        prefersHighContrast: true,
      };

      const settings = browserPrefsToSettings(prefs);
      expect(settings.highContrast).toBe(true);
    });

    it("should map multiple preferences", () => {
      const prefs: BrowserA11yPreferences = {
        prefersReducedMotion: true,
        prefersDarkMode: false,
        prefersHighContrast: true,
      };

      const settings = browserPrefsToSettings(prefs);
      expect(settings.reducedMotion).toBe(true);
      expect(settings.highContrast).toBe(true);
    });

    it("should not include darkMode in settings (handled elsewhere)", () => {
      const prefs: BrowserA11yPreferences = {
        prefersReducedMotion: false,
        prefersDarkMode: true,
        prefersHighContrast: false,
      };

      const settings = browserPrefsToSettings(prefs);
      // Dark mode is handled by theme system, not a11y settings
      expect(settings).not.toHaveProperty("darkMode");
    });
  });

  describe("integration scenarios", () => {
    it("should handle autism-friendly settings (reduced motion)", () => {
      (window.matchMedia as ReturnType<typeof vi.fn>).mockImplementation(
        (query: string) => ({
          matches: query === "(prefers-reduced-motion: reduce)",
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }),
      );

      const prefs = detectBrowserPreferences();
      const settings = browserPrefsToSettings(prefs);

      expect(settings.reducedMotion).toBe(true);
    });

    it("should handle visual impairment settings (high contrast)", () => {
      (window.matchMedia as ReturnType<typeof vi.fn>).mockImplementation(
        (query: string) => ({
          matches: query === "(prefers-contrast: more)",
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }),
      );

      const prefs = detectBrowserPreferences();
      const settings = browserPrefsToSettings(prefs);

      expect(settings.highContrast).toBe(true);
    });

    it("should handle combined accessibility needs", () => {
      (window.matchMedia as ReturnType<typeof vi.fn>).mockImplementation(
        (query: string) => ({
          matches:
            query === "(prefers-reduced-motion: reduce)" ||
            query === "(prefers-contrast: more)",
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }),
      );

      const prefs = detectBrowserPreferences();
      const settings = browserPrefsToSettings(prefs);

      expect(settings.reducedMotion).toBe(true);
      expect(settings.highContrast).toBe(true);
    });
  });
});
