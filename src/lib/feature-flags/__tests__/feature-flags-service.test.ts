/**
 * Unit tests for feature-flags-service
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  initializeFlags,
  isFeatureEnabled,
  updateFlag,
  activateKillSwitch,
  deactivateKillSwitch,
  setGlobalKillSwitch,
  isGlobalKillSwitchActive,
  getAllFlags,
  getFlag,
  setFlagStatus,
} from "../feature-flags-service";
import type { KnownFeatureFlag } from "../types";

describe("feature-flags-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to defaults
    initializeFlags();
    setGlobalKillSwitch(false);
  });

  describe("initializeFlags", () => {
    it("initializes all default flags", () => {
      const flags = getAllFlags();
      expect(flags.length).toBeGreaterThan(0);
      expect(flags.some((f) => f.id === "voice_realtime")).toBe(true);
      expect(flags.some((f) => f.id === "rag_enabled")).toBe(true);
    });
  });

  describe("isFeatureEnabled", () => {
    it("returns enabled for active feature", () => {
      const result = isFeatureEnabled("voice_realtime");
      expect(result.enabled).toBe(true);
      expect(result.reason).toBe("enabled");
    });

    it("returns disabled for unknown feature", () => {
      const result = isFeatureEnabled("unknown_feature" as KnownFeatureFlag);
      expect(result.enabled).toBe(false);
      expect(result.reason).toBe("disabled");
    });

    it("respects kill-switch", () => {
      activateKillSwitch("voice_realtime", "test");
      const result = isFeatureEnabled("voice_realtime");
      expect(result.enabled).toBe(false);
      expect(result.reason).toBe("kill_switch");
    });

    it("respects global kill-switch", () => {
      setGlobalKillSwitch(true, "test");
      const result = isFeatureEnabled("voice_realtime");
      expect(result.enabled).toBe(false);
      expect(result.reason).toBe("kill_switch");
    });

    it("handles percentage rollout deterministically", () => {
      updateFlag("flashcards", { enabledPercentage: 50 });

      // Same user should get consistent result
      const result1 = isFeatureEnabled("flashcards", "user-123");
      const result2 = isFeatureEnabled("flashcards", "user-123");
      expect(result1.enabled).toBe(result2.enabled);
    });
  });

  describe("updateFlag", () => {
    it("updates flag status", () => {
      const updated = updateFlag("quiz", { status: "disabled" });
      expect(updated?.status).toBe("disabled");

      const result = isFeatureEnabled("quiz");
      expect(result.enabled).toBe(false);
    });

    it("updates percentage rollout", () => {
      const updated = updateFlag("mindmap", { enabledPercentage: 25 });
      expect(updated?.enabledPercentage).toBe(25);
    });

    it("clamps percentage to 0-100", () => {
      let updated = updateFlag("mindmap", { enabledPercentage: 150 });
      expect(updated?.enabledPercentage).toBe(100);

      updated = updateFlag("mindmap", { enabledPercentage: -10 });
      expect(updated?.enabledPercentage).toBe(0);
    });

    it("returns null for unknown flag", () => {
      const result = updateFlag("unknown" as KnownFeatureFlag, {
        status: "disabled",
      });
      expect(result).toBeNull();
    });
  });

  describe("kill-switch", () => {
    it("activates kill-switch for feature", () => {
      activateKillSwitch("pdf_export", "maintenance");
      const flag = getFlag("pdf_export");
      expect(flag?.killSwitch).toBe(true);
    });

    it("deactivates kill-switch for feature", () => {
      activateKillSwitch("pdf_export", "maintenance");
      deactivateKillSwitch("pdf_export");
      const flag = getFlag("pdf_export");
      expect(flag?.killSwitch).toBe(false);
    });

    it("global kill-switch overrides all", () => {
      setGlobalKillSwitch(true, "emergency");
      expect(isGlobalKillSwitchActive()).toBe(true);

      // All features should be disabled
      const flags = getAllFlags();
      for (const flag of flags) {
        const result = isFeatureEnabled(flag.id as KnownFeatureFlag);
        expect(result.enabled).toBe(false);
      }
    });
  });

  describe("setFlagStatus", () => {
    it("sets flag to degraded state", () => {
      setFlagStatus("rag_enabled", "degraded");
      const result = isFeatureEnabled("rag_enabled");
      expect(result.enabled).toBe(true);
      expect(result.reason).toBe("degraded");
    });
  });
});
