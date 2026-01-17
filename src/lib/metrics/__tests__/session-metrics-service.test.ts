/**
 * Unit tests for session-metrics-service
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock prisma before importing the service
vi.mock("@/lib/db", () => ({
  prisma: {
    sessionMetrics: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  startSession,
  recordTurn,
  recordVoiceUsage,
  recordRefusal,
  recordIncident,
  getSessionState,
  endSession,
} from "../session-metrics-service";

describe("session-metrics-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("startSession", () => {
    it("creates a new session state", () => {
      const sessionId = "test-session-1";
      const userId = "user-123";

      startSession(sessionId, userId);

      const state = getSessionState(sessionId);
      expect(state).toBeDefined();
      expect(state?.sessionId).toBe(sessionId);
      expect(state?.userId).toBe(userId);
      expect(state?.turns).toHaveLength(0);
    });
  });

  describe("recordTurn", () => {
    it("adds turn data to session", () => {
      const sessionId = "test-session-2";
      startSession(sessionId, "user-123");

      recordTurn(sessionId, {
        latencyMs: 150,
        intent: "ask_question",
        tokensIn: 100,
        tokensOut: 200,
      });

      const state = getSessionState(sessionId);
      expect(state?.turns).toHaveLength(1);
      expect(state?.turns[0].latencyMs).toBe(150);
      expect(state?.turns[0].tokensIn).toBe(100);
      expect(state?.turns[0].tokensOut).toBe(200);
    });

    it("tracks recent intents for stuck loop detection", () => {
      const sessionId = "test-session-3";
      startSession(sessionId, "user-123");

      // Record same intent multiple times
      for (let i = 0; i < 5; i++) {
        recordTurn(sessionId, {
          latencyMs: 100,
          intent: "same_intent",
          tokensIn: 50,
          tokensOut: 50,
        });
      }

      const state = getSessionState(sessionId);
      expect(state?.recentIntents).toHaveLength(5);
      expect(state?.recentIntents.every((i) => i === "same_intent")).toBe(true);
    });
  });

  describe("recordVoiceUsage", () => {
    it("accumulates voice minutes", () => {
      const sessionId = "test-session-4";
      startSession(sessionId, "user-123");

      recordVoiceUsage(sessionId, 2.5);
      recordVoiceUsage(sessionId, 1.5);

      const state = getSessionState(sessionId);
      expect(state?.voiceMinutes).toBe(4);
    });
  });

  describe("recordRefusal", () => {
    it("tracks refusal counts", () => {
      const sessionId = "test-session-5";
      startSession(sessionId, "user-123");

      recordRefusal(sessionId, true);
      recordRefusal(sessionId, false);
      recordRefusal(sessionId, true);

      const state = getSessionState(sessionId);
      expect(state?.refusalCount).toBe(3);
      expect(state?.refusalCorrect).toBe(2);
    });
  });

  describe("recordIncident", () => {
    it("keeps highest severity incident", () => {
      const sessionId = "test-session-6";
      startSession(sessionId, "user-123");

      recordIncident(sessionId, "S1");
      recordIncident(sessionId, "S3");
      recordIncident(sessionId, "S2");

      const state = getSessionState(sessionId);
      expect(state?.incidentSeverity).toBe("S3");
    });
  });

  describe("endSession", () => {
    it("clears session from memory after saving", async () => {
      const sessionId = "test-session-7";
      startSession(sessionId, "user-123");

      recordTurn(sessionId, {
        latencyMs: 100,
        tokensIn: 50,
        tokensOut: 100,
      });

      await endSession(sessionId);

      const state = getSessionState(sessionId);
      expect(state).toBeUndefined();
    });
  });
});
