/**
 * Voice Cost Guards Tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  startVoiceSession,
  updateVoiceDuration,
  endVoiceSession,
  isVoiceAllowed,
  getVoiceSessionState,
  getActiveVoiceSessions,
  getVoiceLimits,
  VOICE_DURATION_LIMITS,
  _resetState,
} from "../voice-cost-guards";

// Mock feature-flags module
vi.mock("@/lib/feature-flags", () => ({
  activateKillSwitch: vi.fn(),
  deactivateKillSwitch: vi.fn(),
}));

// Mock cost-tracking-service
vi.mock("../cost-tracking-service", () => ({
  detectCostSpike: vi.fn().mockResolvedValue(false),
  THRESHOLDS: { SPIKE_MULTIPLIER: 1.5 },
}));

describe("voice-cost-guards", () => {
  beforeEach(() => {
    _resetState();
  });

  describe("startVoiceSession", () => {
    it("should track new voice session", () => {
      startVoiceSession("session-1", "user-1");

      const state = getVoiceSessionState("session-1");
      expect(state).not.toBeNull();
      expect(state?.sessionId).toBe("session-1");
      expect(state?.userId).toBe("user-1");
      expect(state?.durationMinutes).toBe(0);
      expect(state?.status).toBe("ok");
    });

    it("should list active sessions", () => {
      startVoiceSession("session-1", "user-1");
      startVoiceSession("session-2", "user-2");

      const sessions = getActiveVoiceSessions();
      expect(sessions).toHaveLength(2);
    });
  });

  describe("updateVoiceDuration", () => {
    it("should return ok for duration under soft cap", () => {
      startVoiceSession("session-1", "user-1");

      const check = updateVoiceDuration("session-1", 15);

      expect(check.allowed).toBe(true);
      expect(check.status).toBe("ok");
      expect(check.remainingMinutes).toBe(45);
    });

    it("should return soft_cap warning at 30 minutes", () => {
      startVoiceSession("session-1", "user-1");

      const check = updateVoiceDuration("session-1", 30);

      expect(check.allowed).toBe(true);
      expect(check.status).toBe("soft_cap");
      expect(check.message).toContain("30 minuti");
      expect(check.remainingMinutes).toBe(30);
    });

    it("should only show warning once", () => {
      startVoiceSession("session-1", "user-1");

      const check1 = updateVoiceDuration("session-1", 30);
      const check2 = updateVoiceDuration("session-1", 35);

      expect(check1.message).toBeDefined();
      expect(check2.message).toBeUndefined();
    });

    it("should return hard_cap and disallow at 60 minutes", () => {
      startVoiceSession("session-1", "user-1");

      const check = updateVoiceDuration("session-1", 60);

      expect(check.allowed).toBe(false);
      expect(check.status).toBe("hard_cap");
      expect(check.message).toContain("Limite voce raggiunto");
      expect(check.remainingMinutes).toBe(0);
    });

    it("should handle unknown session gracefully", () => {
      const check = updateVoiceDuration("unknown", 30);

      expect(check.allowed).toBe(true);
      expect(check.status).toBe("ok");
    });
  });

  describe("endVoiceSession", () => {
    it("should remove session from tracking", () => {
      startVoiceSession("session-1", "user-1");
      endVoiceSession("session-1");

      const state = getVoiceSessionState("session-1");
      expect(state).toBeNull();
    });
  });

  describe("isVoiceAllowed", () => {
    it("should return allowed when no spike protection", () => {
      const result = isVoiceAllowed();
      expect(result.allowed).toBe(true);
    });
  });

  describe("getVoiceLimits", () => {
    it("should return configured limits", () => {
      const limits = getVoiceLimits();

      expect(limits.softCapMinutes).toBe(
        VOICE_DURATION_LIMITS.SOFT_CAP_MINUTES,
      );
      expect(limits.hardCapMinutes).toBe(
        VOICE_DURATION_LIMITS.HARD_CAP_MINUTES,
      );
      expect(limits.spikeCooldownMinutes).toBe(15);
    });
  });
});
