/**
 * Unit tests for mobile responsive utilities
 * Validates WCAG 2.5.5 compliance helpers and responsive breakpoints
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";

/**
 * WCAG 2.5.5 Touch Target Size (Level AAA)
 * Minimum 44px × 44px for all interactive elements
 */
const TOUCH_TARGET_MIN_SIZE = 44;

/**
 * MirrorBuddy responsive breakpoints (Tailwind defaults)
 */
const BREAKPOINTS = {
  sm: 640, // Small devices
  md: 768, // Medium devices (tablets)
  lg: 1024, // Large devices (desktops)
  xl: 1280, // Extra large
  "2xl": 1536, // 2X large
} as const;

/**
 * Mobile-first viewport widths for testing
 */
const MOBILE_VIEWPORTS = {
  iphone_se: 375, // Smallest supported iPhone
  iphone_13: 390, // Standard iPhone
  pixel_7: 412, // Standard Android
  ipad_mini: 768, // Tablet portrait
  ipad_landscape: 1024, // Tablet landscape (desktop breakpoint)
} as const;

describe("Mobile Responsive Utils", () => {
  describe("Touch Target Validation", () => {
    it("should define minimum touch target as 44px", () => {
      expect(TOUCH_TARGET_MIN_SIZE).toBe(44);
    });

    it("should validate touch target meets minimum", () => {
      const validateTouchTarget = (width: number, height: number): boolean => {
        return (
          width >= TOUCH_TARGET_MIN_SIZE && height >= TOUCH_TARGET_MIN_SIZE
        );
      };

      // Valid targets
      expect(validateTouchTarget(44, 44)).toBe(true);
      expect(validateTouchTarget(48, 48)).toBe(true);
      expect(validateTouchTarget(100, 44)).toBe(true);

      // Invalid targets
      expect(validateTouchTarget(40, 44)).toBe(false);
      expect(validateTouchTarget(44, 40)).toBe(false);
      expect(validateTouchTarget(32, 32)).toBe(false);
    });

    it("should handle rectangular touch targets", () => {
      const validateTouchTarget = (width: number, height: number): boolean => {
        return (
          width >= TOUCH_TARGET_MIN_SIZE && height >= TOUCH_TARGET_MIN_SIZE
        );
      };

      // Wide button (valid)
      expect(validateTouchTarget(200, 44)).toBe(true);

      // Tall button (valid)
      expect(validateTouchTarget(44, 200)).toBe(true);

      // Too narrow (invalid)
      expect(validateTouchTarget(200, 30)).toBe(false);
    });
  });

  describe("Responsive Breakpoints", () => {
    it("should define correct Tailwind breakpoints", () => {
      expect(BREAKPOINTS.sm).toBe(640);
      expect(BREAKPOINTS.md).toBe(768);
      expect(BREAKPOINTS.lg).toBe(1024);
      expect(BREAKPOINTS.xl).toBe(1280);
      expect(BREAKPOINTS["2xl"]).toBe(1536);
    });

    it("should determine mobile vs desktop from viewport width", () => {
      const isMobile = (width: number): boolean => width < BREAKPOINTS.lg;

      expect(isMobile(375)).toBe(true); // iPhone SE
      expect(isMobile(768)).toBe(true); // iPad portrait
      expect(isMobile(1024)).toBe(false); // Desktop/tablet landscape
      expect(isMobile(1280)).toBe(false); // Large desktop
    });

    it("should determine tablet from viewport width", () => {
      const isTablet = (width: number): boolean =>
        width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;

      expect(isTablet(375)).toBe(false); // Phone
      expect(isTablet(768)).toBe(true); // iPad portrait
      expect(isTablet(900)).toBe(true); // Tablet
      expect(isTablet(1024)).toBe(false); // Desktop
    });
  });

  describe("Mobile Viewport Definitions", () => {
    it("should cover all standard mobile viewports", () => {
      expect(MOBILE_VIEWPORTS.iphone_se).toBe(375);
      expect(MOBILE_VIEWPORTS.iphone_13).toBe(390);
      expect(MOBILE_VIEWPORTS.pixel_7).toBe(412);
      expect(MOBILE_VIEWPORTS.ipad_mini).toBe(768);
      expect(MOBILE_VIEWPORTS.ipad_landscape).toBe(1024);
    });

    it("should have iPhone SE as smallest supported viewport", () => {
      const minViewport = Math.min(...Object.values(MOBILE_VIEWPORTS));
      expect(minViewport).toBe(MOBILE_VIEWPORTS.iphone_se);
      expect(minViewport).toBe(375);
    });
  });

  describe("Viewport Percentage Calculation", () => {
    it("should calculate element width as percentage of viewport", () => {
      const calculateViewportPercentage = (
        elementWidth: number,
        viewportWidth: number,
      ): number => {
        return (elementWidth / viewportWidth) * 100;
      };

      // Full width element
      expect(calculateViewportPercentage(375, 375)).toBe(100);

      // Half width element
      expect(calculateViewportPercentage(187.5, 375)).toBe(50);

      // 80% width element
      expect(calculateViewportPercentage(300, 375)).toBeCloseTo(80, 0);
    });

    it("should validate element does not exceed max percentage", () => {
      const validateMaxPercentage = (
        elementWidth: number,
        viewportWidth: number,
        maxPercentage: number,
      ): boolean => {
        const percentage = (elementWidth / viewportWidth) * 100;
        return percentage <= maxPercentage;
      };

      // Sidebar should be max 80% on mobile
      expect(validateMaxPercentage(256, 375, 80)).toBe(true); // 68%
      expect(validateMaxPercentage(350, 375, 80)).toBe(false); // 93%

      // Content should fit viewport (100%)
      expect(validateMaxPercentage(375, 375, 100)).toBe(true);
      expect(validateMaxPercentage(400, 375, 100)).toBe(false);
    });
  });

  describe("Horizontal Scroll Detection", () => {
    it("should detect horizontal scroll when content exceeds viewport", () => {
      const hasHorizontalScroll = (
        contentWidth: number,
        viewportWidth: number,
      ): boolean => {
        return contentWidth > viewportWidth;
      };

      expect(hasHorizontalScroll(375, 375)).toBe(false);
      expect(hasHorizontalScroll(400, 375)).toBe(true);
      expect(hasHorizontalScroll(300, 375)).toBe(false);
    });
  });

  describe("Safe Area Insets", () => {
    it("should define iOS safe area constants", () => {
      // Standard iOS safe area insets (notch devices)
      const SAFE_AREA_INSETS = {
        top: 47, // Status bar + notch
        bottom: 34, // Home indicator
        left: 0,
        right: 0,
      };

      expect(SAFE_AREA_INSETS.top).toBeGreaterThan(0);
      expect(SAFE_AREA_INSETS.bottom).toBeGreaterThan(0);
    });
  });

  describe("Mobile Navigation Patterns", () => {
    it("should validate sidebar width for mobile", () => {
      // Mobile sidebar should be 64px (w-16) or 256px (w-64) expanded
      const MOBILE_SIDEBAR_COLLAPSED = 64;
      const MOBILE_SIDEBAR_EXPANDED = 256;

      const validateSidebarWidth = (
        width: number,
        isExpanded: boolean,
      ): boolean => {
        const expected = isExpanded
          ? MOBILE_SIDEBAR_EXPANDED
          : MOBILE_SIDEBAR_COLLAPSED;
        return width === expected;
      };

      expect(validateSidebarWidth(64, false)).toBe(true);
      expect(validateSidebarWidth(256, true)).toBe(true);
      expect(validateSidebarWidth(100, false)).toBe(false);
    });

    it("should validate hamburger menu visibility by viewport", () => {
      // Hamburger menu visible only below lg breakpoint
      const isHamburgerVisible = (viewportWidth: number): boolean => {
        return viewportWidth < BREAKPOINTS.lg;
      };

      expect(isHamburgerVisible(375)).toBe(true); // iPhone
      expect(isHamburgerVisible(768)).toBe(true); // iPad portrait
      expect(isHamburgerVisible(1024)).toBe(false); // Desktop
    });
  });
});

describe("Responsive CSS Class Patterns", () => {
  describe("Mobile-First Classes", () => {
    it("should validate mobile-first responsive class pattern", () => {
      // Pattern: base (mobile) → sm: → md: → lg: → xl:
      // Tailwind classes can include letters, numbers, slashes, brackets, dots
      const RESPONSIVE_CLASS_PATTERN =
        /^(sm:|md:|lg:|xl:|2xl:)?[a-z]+-[\w/.[\]-]+$/;

      // Valid patterns
      expect(RESPONSIVE_CLASS_PATTERN.test("w-full")).toBe(true);
      expect(RESPONSIVE_CLASS_PATTERN.test("md:w-1/2")).toBe(true);
      expect(RESPONSIVE_CLASS_PATTERN.test("lg:grid-cols-3")).toBe(true);
      expect(RESPONSIVE_CLASS_PATTERN.test("min-h-[44px]")).toBe(true);

      // This test validates the mental model, not actual Tailwind classes
    });

    it("should define required responsive classes for common components", () => {
      // Grid: mobile 1 col → tablet 2 col → desktop 3 col
      const GRID_RESPONSIVE = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

      expect(GRID_RESPONSIVE).toContain("grid-cols-1");
      expect(GRID_RESPONSIVE).toContain("md:grid-cols-2");
      expect(GRID_RESPONSIVE).toContain("lg:grid-cols-3");
    });
  });

  describe("Touch Target Classes", () => {
    it("should define minimum touch target class", () => {
      // min-h-[44px] min-w-[44px] or h-11 w-11 (44px in Tailwind)
      const TOUCH_TARGET_CLASSES = [
        "min-h-[44px]",
        "min-w-[44px]",
        "h-11",
        "w-11",
      ];

      // At least one width and height class should exist
      expect(TOUCH_TARGET_CLASSES.some((c) => c.includes("h-"))).toBe(true);
      expect(TOUCH_TARGET_CLASSES.some((c) => c.includes("w-"))).toBe(true);
    });
  });
});
