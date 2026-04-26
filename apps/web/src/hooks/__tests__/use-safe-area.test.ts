/**
 * MIRRORBUDDY - useSafeArea Hook Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSafeArea } from "../use-safe-area";

describe("useSafeArea", () => {
  beforeEach(() => {
    // Reset CSS custom properties before each test
    document.documentElement.style.setProperty("--safe-area-inset-top", "0px");
    document.documentElement.style.setProperty(
      "--safe-area-inset-bottom",
      "0px",
    );
    document.documentElement.style.setProperty("--safe-area-inset-left", "0px");
    document.documentElement.style.setProperty(
      "--safe-area-inset-right",
      "0px",
    );
  });

  afterEach(() => {
    document.documentElement.style.removeProperty("--safe-area-inset-top");
    document.documentElement.style.removeProperty("--safe-area-inset-bottom");
    document.documentElement.style.removeProperty("--safe-area-inset-left");
    document.documentElement.style.removeProperty("--safe-area-inset-right");
  });

  describe("Initialization", () => {
    it("should return safe area object with all four inset values", () => {
      const { result } = renderHook(() => useSafeArea());

      expect(result.current).toHaveProperty("top");
      expect(result.current).toHaveProperty("bottom");
      expect(result.current).toHaveProperty("left");
      expect(result.current).toHaveProperty("right");
    });

    it("should return numeric values for all insets", () => {
      const { result } = renderHook(() => useSafeArea());

      expect(typeof result.current.top).toBe("number");
      expect(typeof result.current.bottom).toBe("number");
      expect(typeof result.current.left).toBe("number");
      expect(typeof result.current.right).toBe("number");
    });

    it("should return default 0 values when no safe area insets are set", () => {
      const { result } = renderHook(() => useSafeArea());

      expect(result.current.top).toBe(0);
      expect(result.current.bottom).toBe(0);
      expect(result.current.left).toBe(0);
      expect(result.current.right).toBe(0);
    });
  });

  describe("Reading CSS Custom Properties", () => {
    it("should read top inset from CSS custom property", () => {
      document.documentElement.style.setProperty(
        "--safe-area-inset-top",
        "48px",
      );

      const { result } = renderHook(() => useSafeArea());

      expect(result.current.top).toBe(48);
    });

    it("should read bottom inset from CSS custom property", () => {
      document.documentElement.style.setProperty(
        "--safe-area-inset-bottom",
        "24px",
      );

      const { result } = renderHook(() => useSafeArea());

      expect(result.current.bottom).toBe(24);
    });

    it("should read left inset from CSS custom property", () => {
      document.documentElement.style.setProperty(
        "--safe-area-inset-left",
        "16px",
      );

      const { result } = renderHook(() => useSafeArea());

      expect(result.current.left).toBe(16);
    });

    it("should read right inset from CSS custom property", () => {
      document.documentElement.style.setProperty(
        "--safe-area-inset-right",
        "16px",
      );

      const { result } = renderHook(() => useSafeArea());

      expect(result.current.right).toBe(16);
    });

    it("should read all insets simultaneously", () => {
      document.documentElement.style.setProperty(
        "--safe-area-inset-top",
        "40px",
      );
      document.documentElement.style.setProperty(
        "--safe-area-inset-bottom",
        "34px",
      );
      document.documentElement.style.setProperty(
        "--safe-area-inset-left",
        "0px",
      );
      document.documentElement.style.setProperty(
        "--safe-area-inset-right",
        "0px",
      );

      const { result } = renderHook(() => useSafeArea());

      expect(result.current.top).toBe(40);
      expect(result.current.bottom).toBe(34);
      expect(result.current.left).toBe(0);
      expect(result.current.right).toBe(0);
    });
  });

  describe("Parsing Pixel Values", () => {
    it("should parse pixel values correctly", () => {
      document.documentElement.style.setProperty(
        "--safe-area-inset-top",
        "50px",
      );

      const { result } = renderHook(() => useSafeArea());

      expect(result.current.top).toBe(50);
    });

    it("should handle pixel values without decimals", () => {
      document.documentElement.style.setProperty(
        "--safe-area-inset-left",
        "20px",
      );

      const { result } = renderHook(() => useSafeArea());

      expect(result.current.left).toBe(20);
    });

    it("should return 0 if CSS property contains invalid value", () => {
      document.documentElement.style.setProperty(
        "--safe-area-inset-top",
        "invalid",
      );

      const { result } = renderHook(() => useSafeArea());

      expect(result.current.top).toBe(0);
    });

    it("should return 0 if CSS property is empty", () => {
      document.documentElement.style.setProperty("--safe-area-inset-top", "");

      const { result } = renderHook(() => useSafeArea());

      expect(result.current.top).toBe(0);
    });
  });

  describe("Reactive Updates", () => {
    it("should update when CSS custom properties change", () => {
      const { result, rerender } = renderHook(() => useSafeArea());

      expect(result.current.top).toBe(0);

      document.documentElement.style.setProperty(
        "--safe-area-inset-top",
        "44px",
      );
      rerender();

      expect(result.current.top).toBe(44);
    });

    it("should reflect changes to all insets", () => {
      const { result, rerender } = renderHook(() => useSafeArea());

      document.documentElement.style.setProperty(
        "--safe-area-inset-top",
        "40px",
      );
      document.documentElement.style.setProperty(
        "--safe-area-inset-bottom",
        "30px",
      );
      rerender();

      expect(result.current.top).toBe(40);
      expect(result.current.bottom).toBe(30);
    });
  });

  describe("Type Safety", () => {
    it("should return object with correct shape", () => {
      const { result } = renderHook(() => useSafeArea());

      const safeArea = result.current;

      // Verify object keys
      const keys = Object.keys(safeArea).sort();
      expect(keys).toEqual(["bottom", "left", "right", "top"]);
    });

    it("should not return undefined values", () => {
      const { result } = renderHook(() => useSafeArea());

      expect(result.current.top).not.toBeUndefined();
      expect(result.current.bottom).not.toBeUndefined();
      expect(result.current.left).not.toBeUndefined();
      expect(result.current.right).not.toBeUndefined();
    });
  });

  describe("iOS Notch Scenario", () => {
    it("should handle iPhone X style notch (top inset only)", () => {
      document.documentElement.style.setProperty(
        "--safe-area-inset-top",
        "44px",
      );
      document.documentElement.style.setProperty(
        "--safe-area-inset-bottom",
        "0px",
      );
      document.documentElement.style.setProperty(
        "--safe-area-inset-left",
        "0px",
      );
      document.documentElement.style.setProperty(
        "--safe-area-inset-right",
        "0px",
      );

      const { result } = renderHook(() => useSafeArea());

      expect(result.current.top).toBe(44);
      expect(result.current.bottom).toBe(0);
      expect(result.current.left).toBe(0);
      expect(result.current.right).toBe(0);
    });

    it("should handle home indicator (bottom inset only)", () => {
      document.documentElement.style.setProperty(
        "--safe-area-inset-top",
        "0px",
      );
      document.documentElement.style.setProperty(
        "--safe-area-inset-bottom",
        "34px",
      );
      document.documentElement.style.setProperty(
        "--safe-area-inset-left",
        "0px",
      );
      document.documentElement.style.setProperty(
        "--safe-area-inset-right",
        "0px",
      );

      const { result } = renderHook(() => useSafeArea());

      expect(result.current.top).toBe(0);
      expect(result.current.bottom).toBe(34);
      expect(result.current.left).toBe(0);
      expect(result.current.right).toBe(0);
    });

    it("should handle landscape orientation with side notches", () => {
      document.documentElement.style.setProperty(
        "--safe-area-inset-top",
        "0px",
      );
      document.documentElement.style.setProperty(
        "--safe-area-inset-bottom",
        "21px",
      );
      document.documentElement.style.setProperty(
        "--safe-area-inset-left",
        "44px",
      );
      document.documentElement.style.setProperty(
        "--safe-area-inset-right",
        "44px",
      );

      const { result } = renderHook(() => useSafeArea());

      expect(result.current.top).toBe(0);
      expect(result.current.bottom).toBe(21);
      expect(result.current.left).toBe(44);
      expect(result.current.right).toBe(44);
    });
  });
});
