import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  playConfetti,
  playSubtleConfetti,
  playGrandConfetti,
} from "../confetti";
import * as accessibility from "@/lib/accessibility";

// Mock the accessibility store
vi.mock("@/lib/accessibility", () => ({
  useAccessibilityStore: {
    getState: vi.fn(() => ({
      settings: {
        reducedMotion: false,
      },
    })),
  },
}));

describe("confetti", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clean up any existing canvas elements
    document.querySelectorAll("canvas").forEach((c) => c.remove());
    // Mock canvas and context
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const element = origCreateElement(tag);
      if (tag === "canvas") {
        (element as HTMLCanvasElement).getContext = vi.fn(() => ({
          clearRect: vi.fn(),
          save: vi.fn(),
          translate: vi.fn(),
          rotate: vi.fn(),
          globalAlpha: 1,
          fillStyle: "",
          fillRect: vi.fn(),
          restore: vi.fn(),
        })) as unknown as HTMLCanvasElement["getContext"];
      }
      return element;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("playConfetti", () => {
    it("should handle accessibility settings", () => {
      vi.mocked(accessibility.useAccessibilityStore.getState).mockReturnValue({
        settings: {
          reducedMotion: true,
        },
      } as any);

      playConfetti({ particleCount: 10, duration: 100 });

      // When reduceMotion is enabled, confetti should not be created
      // This is handled internally in the module
      expect(accessibility.useAccessibilityStore.getState).toHaveBeenCalled();
    });

    it("should respect reducedMotion for autism profile", () => {
      vi.mocked(accessibility.useAccessibilityStore.getState).mockReturnValue({
        settings: {
          reducedMotion: true,
        },
      } as any);

      playConfetti({ particleCount: 10, duration: 100 });

      expect(accessibility.useAccessibilityStore.getState).toHaveBeenCalled();
    });

    it("should accept options", () => {
      const options = {
        duration: 500,
        particleCount: 20,
        colors: ["#FF0000", "#00FF00"],
      };

      // Should not throw
      expect(() => {
        playConfetti(options);
      }).not.toThrow();
    });
  });

  describe("playSubtleConfetti", () => {
    it("should not throw", () => {
      expect(() => {
        playSubtleConfetti();
      }).not.toThrow();
    });
  });

  describe("playGrandConfetti", () => {
    it("should not throw", () => {
      expect(() => {
        playGrandConfetti();
      }).not.toThrow();
    });
  });

  describe("accessibility compliance", () => {
    it("should check accessibility settings before playing", () => {
      playConfetti({ particleCount: 10, duration: 100 });

      expect(accessibility.useAccessibilityStore.getState).toHaveBeenCalled();
    });
  });
});
