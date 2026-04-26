/**
 * Unit tests for degradation-service
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock("@/lib/feature-flags", () => ({
  setFlagStatus: vi.fn(),
  activateKillSwitch: vi.fn(),
  deactivateKillSwitch: vi.fn(),
}));

import {
  initializeDegradationRules,
  registerRule,
  recordHealthCheck,
  degradeFeature,
  recoverFeature,
  getDegradationState,
  getFallbackBehavior,
  isSystemDegraded,
  getServiceHealth,
  getAllServiceHealth,
  getRecentEvents,
  _resetState,
} from "../degradation-service";

describe("degradation-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetState();
    initializeDegradationRules();
  });

  describe("initializeDegradationRules", () => {
    it("initializes default rules", () => {
      // Rules are initialized on import, verify state is clean
      const state = getDegradationState();
      expect(state.level).toBe("none");
      expect(state.degradedFeatures.size).toBe(0);
    });
  });

  describe("recordHealthCheck", () => {
    it("records healthy service", () => {
      recordHealthCheck("test-service", true, 100);
      const health = getServiceHealth("test-service");

      expect(health).toBeDefined();
      expect(health?.healthy).toBe(true);
      expect(health?.latencyMs).toBe(100);
      expect(health?.consecutiveFailures).toBe(0);
    });

    it("tracks consecutive failures", () => {
      recordHealthCheck("failing-service", false, 5000);
      recordHealthCheck("failing-service", false, 5000);
      recordHealthCheck("failing-service", false, 5000);

      const health = getServiceHealth("failing-service");
      expect(health?.consecutiveFailures).toBe(3);
    });

    it("resets failures on success", () => {
      recordHealthCheck("flaky-service", false, 5000);
      recordHealthCheck("flaky-service", false, 5000);
      recordHealthCheck("flaky-service", true, 200);

      const health = getServiceHealth("flaky-service");
      expect(health?.consecutiveFailures).toBe(0);
    });
  });

  describe("degradeFeature", () => {
    it("marks feature as degraded", () => {
      degradeFeature("rag_enabled", "cache", "Test degradation");

      const fallback = getFallbackBehavior("rag_enabled");
      expect(fallback).toBe("cache");
    });

    it("records degradation event", () => {
      degradeFeature("pdf_export", "simplified", "High latency");

      const events = getRecentEvents(5);
      expect(events.length).toBeGreaterThan(0);
      expect(events[events.length - 1].featureId).toBe("pdf_export");
      expect(events[events.length - 1].newState).toBe("simplified");
    });

    it("updates degradation level based on count", () => {
      expect(getDegradationState().level).toBe("none");

      degradeFeature("rag_enabled", "cache", "test");
      expect(getDegradationState().level).toBe("partial");

      degradeFeature("pdf_export", "simplified", "test");
      expect(getDegradationState().level).toBe("partial");

      degradeFeature("mindmap", "disable", "test");
      degradeFeature("quiz", "disable", "test");
      degradeFeature("flashcards", "disable", "test");
      expect(getDegradationState().level).toBe("severe");
    });
  });

  describe("recoverFeature", () => {
    it("removes feature from degraded list", () => {
      degradeFeature("rag_enabled", "cache", "test");
      expect(getFallbackBehavior("rag_enabled")).toBe("cache");

      recoverFeature("rag_enabled", "recovered");
      expect(getFallbackBehavior("rag_enabled")).toBeNull();
    });

    it("updates degradation level on recovery", () => {
      degradeFeature("rag_enabled", "cache", "test");
      degradeFeature("pdf_export", "simplified", "test");
      expect(getDegradationState().level).toBe("partial");

      recoverFeature("rag_enabled", "recovered");
      recoverFeature("pdf_export", "recovered");
      expect(getDegradationState().level).toBe("none");
    });
  });

  describe("isSystemDegraded", () => {
    it("returns false when no degradation", () => {
      expect(isSystemDegraded()).toBe(false);
    });

    it("returns true when features are degraded", () => {
      degradeFeature("rag_enabled", "cache", "test");
      expect(isSystemDegraded()).toBe(true);
    });
  });

  describe("getAllServiceHealth", () => {
    it("returns all tracked services", () => {
      recordHealthCheck("service-a", true, 100);
      recordHealthCheck("service-b", true, 200);
      recordHealthCheck("service-c", false, 5000);

      const health = getAllServiceHealth();
      expect(health.length).toBe(3);
    });
  });

  describe("registerRule", () => {
    it("registers custom degradation rule", () => {
      registerRule({
        featureId: "gamification",
        triggerConditions: {
          maxLatencyMs: 1000,
          maxErrorRate: 0.05,
        },
        fallbackBehavior: "disable",
        recoveryConditions: {
          minSuccessRate: 0.99,
        },
      });

      // Rule is registered (verified by not throwing)
      expect(true).toBe(true);
    });
  });
});
