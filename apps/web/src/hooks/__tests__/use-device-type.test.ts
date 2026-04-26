/**
 * MIRRORBUDDY - useDeviceType Hook Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDeviceType } from "../use-device-type";

describe("useDeviceType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Device Type Detection", () => {
    it("should return 'phone' for width < 640px", () => {
      // Mock window matchMedia for phone size
      const mockMatchMedia = vi.fn((query: string) => {
        if (query === "(max-width: 639px)") {
          return {
            matches: true,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          };
        }
        return {
          matches: false,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        };
      });

      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: mockMatchMedia,
      });

      const { result } = renderHook(() => useDeviceType());
      expect(result.current.deviceType).toBe("phone");
      expect(result.current.isPhone).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
    });

    it("should return 'tablet' for 640px <= width < 1024px", () => {
      const mockMatchMedia = vi.fn((query: string) => {
        if (query === "(min-width: 640px) and (max-width: 1023px)") {
          return {
            matches: true,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          };
        }
        return {
          matches: false,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        };
      });

      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: mockMatchMedia,
      });

      const { result } = renderHook(() => useDeviceType());
      expect(result.current.deviceType).toBe("tablet");
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isPhone).toBe(false);
      expect(result.current.isDesktop).toBe(false);
    });

    it("should return 'desktop' for width >= 1024px", () => {
      const mockMatchMedia = vi.fn((query: string) => {
        if (query === "(min-width: 1024px)") {
          return {
            matches: true,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          };
        }
        return {
          matches: false,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        };
      });

      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: mockMatchMedia,
      });

      const { result } = renderHook(() => useDeviceType());
      expect(result.current.deviceType).toBe("desktop");
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isPhone).toBe(false);
      expect(result.current.isTablet).toBe(false);
    });
  });

  describe("Orientation Detection", () => {
    it("should return 'portrait' when height > width", () => {
      const mockMatchMedia = vi.fn((query: string) => {
        if (query === "(orientation: portrait)") {
          return {
            matches: true,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          };
        }
        return {
          matches: false,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        };
      });

      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: mockMatchMedia,
      });

      const { result } = renderHook(() => useDeviceType());
      expect(result.current.orientation).toBe("portrait");
      expect(result.current.isPortrait).toBe(true);
      expect(result.current.isLandscape).toBe(false);
    });

    it("should return 'landscape' when width > height", () => {
      const mockMatchMedia = vi.fn((query: string) => {
        if (query === "(orientation: landscape)") {
          return {
            matches: true,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          };
        }
        return {
          matches: false,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        };
      });

      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: mockMatchMedia,
      });

      const { result } = renderHook(() => useDeviceType());
      expect(result.current.orientation).toBe("landscape");
      expect(result.current.isPortrait).toBe(false);
      expect(result.current.isLandscape).toBe(true);
    });
  });

  describe("Return Values", () => {
    it("should return all required properties", () => {
      const mockMatchMedia = vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: mockMatchMedia,
      });

      const { result } = renderHook(() => useDeviceType());

      expect(result.current).toHaveProperty("deviceType");
      expect(result.current).toHaveProperty("isPhone");
      expect(result.current).toHaveProperty("isTablet");
      expect(result.current).toHaveProperty("isDesktop");
      expect(result.current).toHaveProperty("orientation");
      expect(result.current).toHaveProperty("isPortrait");
      expect(result.current).toHaveProperty("isLandscape");
    });

    it("should have correct property types", () => {
      const mockMatchMedia = vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: mockMatchMedia,
      });

      const { result } = renderHook(() => useDeviceType());

      expect(typeof result.current.deviceType).toBe("string");
      expect(typeof result.current.isPhone).toBe("boolean");
      expect(typeof result.current.isTablet).toBe("boolean");
      expect(typeof result.current.isDesktop).toBe("boolean");
      expect(typeof result.current.orientation).toBe("string");
      expect(typeof result.current.isPortrait).toBe("boolean");
      expect(typeof result.current.isLandscape).toBe("boolean");
    });
  });

  describe("SSR Safety", () => {
    it("should return defaults on server (when matchMedia is unavailable)", () => {
      // Save original matchMedia
      const originalMatchMedia = window.matchMedia;

      // Simulate server environment (no matchMedia)
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: undefined,
      });

      const { result } = renderHook(() => useDeviceType());

      // Should return safe defaults
      expect(result.current.deviceType).toBe("desktop");
      expect(result.current.orientation).toBe("portrait");
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isPortrait).toBe(true);

      // Restore original matchMedia
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: originalMatchMedia,
      });
    });

    it("should not throw on missing matchMedia", () => {
      const originalMatchMedia = window.matchMedia;

      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: undefined,
      });

      expect(() => {
        renderHook(() => useDeviceType());
      }).not.toThrow();

      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: originalMatchMedia,
      });
    });
  });
});
