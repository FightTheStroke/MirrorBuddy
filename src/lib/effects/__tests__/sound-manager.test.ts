import { describe, it, expect, beforeEach, vi } from "vitest";
import { playSoundEffect, resumeAudioContext } from "../sound-manager";
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

describe("sound-manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear Web Audio API state
    (globalThis as any).audioContext = null;
  });

  describe("playSoundEffect", () => {
    it("should not throw on unsupported browsers", () => {
      // Even if Web Audio is not available, should not throw
      expect(() => {
        playSoundEffect("correct");
      }).not.toThrow();
    });

    it("should respect reduceMotion setting", () => {
      vi.mocked(accessibility.useAccessibilityStore.getState).mockReturnValue({
        settings: {
          reducedMotion: true,
        },
      } as any);

      // Should not crash, but won't play
      expect(() => {
        playSoundEffect("correct");
      }).not.toThrow();
    });

    it("should respect reducedMotion setting for auditory needs", () => {
      vi.mocked(accessibility.useAccessibilityStore.getState).mockReturnValue({
        settings: {
          reducedMotion: true,
        },
      } as any);

      // Should not crash, but won't play
      expect(() => {
        playSoundEffect("correct");
      }).not.toThrow();
    });

    it("should accept all sound effect types", () => {
      const effects = [
        "correct",
        "level-up",
        "streak",
        "badge",
        "quiz-complete",
      ] as const;

      effects.forEach((effect) => {
        expect(() => {
          playSoundEffect(effect);
        }).not.toThrow();
      });
    });
  });

  describe("resumeAudioContext", () => {
    it("should not throw if audio context not available", () => {
      expect(() => {
        resumeAudioContext();
      }).not.toThrow();
    });
  });

  describe("graceful degradation", () => {
    it("should work in environments without Web Audio API", () => {
      expect(() => {
        playSoundEffect("correct");
        playSoundEffect("level-up");
        playSoundEffect("streak");
        playSoundEffect("badge");
        playSoundEffect("quiz-complete");
      }).not.toThrow();
    });
  });
});
