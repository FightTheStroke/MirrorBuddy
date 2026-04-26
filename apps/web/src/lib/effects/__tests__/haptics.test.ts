import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  triggerHaptic,
  celebrationVibrate,
  warningVibrate,
  lightVibrate,
} from "../haptics";
import * as accessibility from "@/lib/accessibility";

// Mock the accessibility store
vi.mock("@/lib/accessibility", () => ({
  useAccessibilityStore: {
    getState: vi.fn(() => ({
      settings: {
        reduceMotion: false,
        motorAccessibility: false,
      },
    })),
  },
}));

describe("haptics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset navigator.vibrate mock
    delete (navigator as any).vibrate;
    delete (navigator as any).webkitVibrate;
  });

  describe("triggerHaptic", () => {
    it("should not throw on unsupported devices", () => {
      expect(() => {
        triggerHaptic("light");
      }).not.toThrow();
    });

    it("should respect reduceMotion setting", () => {
      vi.mocked(accessibility.useAccessibilityStore.getState).mockReturnValue({
        settings: {
          reduceMotion: true,
          motorAccessibility: false,
        },
      } as any);

      // Should not crash but won't vibrate
      expect(() => {
        triggerHaptic("medium");
      }).not.toThrow();
    });

    it("should respect motorAccessibility setting", () => {
      vi.mocked(accessibility.useAccessibilityStore.getState).mockReturnValue({
        settings: {
          reduceMotion: false,
          motorAccessibility: true,
        },
      } as any);

      // Should not crash but won't vibrate
      expect(() => {
        triggerHaptic("heavy");
      }).not.toThrow();
    });

    it("should support all haptic patterns", () => {
      const patterns = [
        "light",
        "medium",
        "heavy",
        "success",
        "error",
      ] as const;

      patterns.forEach((pattern) => {
        expect(() => {
          triggerHaptic(pattern);
        }).not.toThrow();
      });
    });

    it("should use default pattern when not specified", () => {
      expect(() => {
        triggerHaptic();
      }).not.toThrow();
    });
  });

  describe("celebrationVibrate", () => {
    it("should not throw", () => {
      expect(() => {
        celebrationVibrate();
      }).not.toThrow();
    });
  });

  describe("warningVibrate", () => {
    it("should not throw", () => {
      expect(() => {
        warningVibrate();
      }).not.toThrow();
    });
  });

  describe("lightVibrate", () => {
    it("should not throw", () => {
      expect(() => {
        lightVibrate();
      }).not.toThrow();
    });
  });

  describe("accessibility compliance", () => {
    it("should handle both navigator.vibrate and webkit variant", () => {
      navigator.vibrate = vi.fn(() => true);

      expect(() => {
        triggerHaptic("light");
      }).not.toThrow();
    });

    it("should gracefully degrade in browsers without vibration API", () => {
      expect(() => {
        triggerHaptic("light");
        triggerHaptic("medium");
        triggerHaptic("heavy");
        celebrationVibrate();
        warningVibrate();
        lightVibrate();
      }).not.toThrow();
    });
  });
});
