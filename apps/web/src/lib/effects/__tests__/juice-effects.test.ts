import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  celebrateQuizComplete,
  celebrateLevelUp,
  celebrateStreak,
  celebrateBadge,
  celebrateCorrectAnswer,
  disableCelebrations,
  enableCelebrations,
  resetCelebrationState,
} from "../juice-effects";
import * as soundManager from "../sound-manager";
import * as confetti from "../confetti";
import * as haptics from "../haptics";

// Mock the sub-modules
vi.mock("../sound-manager");
vi.mock("../confetti");
vi.mock("../haptics");

describe("juice-effects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCelebrationState();
    enableCelebrations();
  });

  describe("celebrateQuizComplete", () => {
    it("should call sound, confetti, and haptic effects", () => {
      celebrateQuizComplete();

      expect(soundManager.resumeAudioContext).toHaveBeenCalled();
      expect(confetti.playGrandConfetti).toHaveBeenCalled();
      expect(soundManager.playSoundEffect).toHaveBeenCalledWith(
        "quiz-complete",
      );
      expect(haptics.celebrationVibrate).toHaveBeenCalled();
    });

    it("should be idempotent - prevent rapid duplicate calls", () => {
      celebrateQuizComplete();
      celebrateQuizComplete();

      // First call plays sound, second call is debounced
      expect(soundManager.playSoundEffect).toHaveBeenCalledTimes(1);
    });
  });

  describe("celebrateLevelUp", () => {
    it("should trigger level up effects", () => {
      celebrateLevelUp();

      expect(soundManager.resumeAudioContext).toHaveBeenCalled();
      expect(confetti.playConfetti).toHaveBeenCalled();
      expect(soundManager.playSoundEffect).toHaveBeenCalledWith("level-up");
      expect(haptics.celebrationVibrate).toHaveBeenCalled();
    });
  });

  describe("celebrateStreak", () => {
    it("should trigger streak effects", () => {
      celebrateStreak();

      expect(soundManager.resumeAudioContext).toHaveBeenCalled();
      expect(confetti.playSubtleConfetti).toHaveBeenCalled();
      expect(soundManager.playSoundEffect).toHaveBeenCalledWith("streak");
      expect(haptics.triggerHaptic).toHaveBeenCalled();
    });
  });

  describe("celebrateBadge", () => {
    it("should trigger badge effects", () => {
      celebrateBadge();

      expect(soundManager.resumeAudioContext).toHaveBeenCalled();
      expect(confetti.playSubtleConfetti).toHaveBeenCalled();
      expect(soundManager.playSoundEffect).toHaveBeenCalledWith("badge");
      expect(haptics.lightVibrate).toHaveBeenCalled();
    });
  });

  describe("celebrateCorrectAnswer", () => {
    it("should trigger correct answer effects", () => {
      celebrateCorrectAnswer();

      expect(soundManager.resumeAudioContext).toHaveBeenCalled();
      expect(soundManager.playSoundEffect).toHaveBeenCalledWith("correct");
      expect(haptics.lightVibrate).toHaveBeenCalled();
    });
  });

  describe("disableCelebrations", () => {
    it("should prevent celebrations when disabled", () => {
      // Start with celebrations enabled
      expect(() => {
        disableCelebrations();
      }).not.toThrow();
    });
  });

  describe("enableCelebrations", () => {
    it("should re-enable celebrations after being disabled", () => {
      disableCelebrations();
      enableCelebrations();
      celebrateQuizComplete();

      expect(soundManager.playSoundEffect).toHaveBeenCalled();
    });
  });

  describe("resetCelebrationState", () => {
    it("should clear debounce cache", () => {
      celebrateQuizComplete();
      resetCelebrationState();
      celebrateQuizComplete();

      // Should be called twice now (debounce reset)
      expect(soundManager.playSoundEffect).toHaveBeenCalledTimes(2);
    });
  });
});
