/**
 * Unit tests for go-nogo-alerting service
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

vi.mock("@/lib/feature-flags", () => ({
  isGlobalKillSwitchActive: vi.fn(() => false),
  getAllFlags: vi.fn(() => [
    { id: "voice_realtime", killSwitch: false },
    { id: "rag_enabled", killSwitch: false },
  ]),
}));

vi.mock("@/lib/degradation", () => ({
  isSystemDegraded: vi.fn(() => false),
  getDegradationState: vi.fn(() => ({
    level: "none",
    degradedFeatures: new Map(),
  })),
}));

import {
  initializeSLOs,
  registerSLO,
  updateSLOStatus,
  createAlert,
  acknowledgeAlert,
  resolveAlert,
  runGoNoGoChecks,
  getActiveAlerts,
  getAllSLOStatuses,
  getSLODefinitions,
  getAlertHistory,
} from "../go-nogo-alerting";

describe("go-nogo-alerting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initializeSLOs();
  });

  describe("initializeSLOs", () => {
    it("initializes default SLO definitions", () => {
      const slos = getSLODefinitions();
      expect(slos.length).toBeGreaterThan(0);
      expect(slos.some((s) => s.id === "voice-availability")).toBe(true);
      expect(slos.some((s) => s.id === "chat-latency-p95")).toBe(true);
    });
  });

  describe("registerSLO", () => {
    it("registers custom SLO", () => {
      registerSLO({
        id: "custom-slo",
        name: "Custom SLO",
        description: "Test SLO",
        target: 99,
        errorBudget: 1,
        window: "daily",
        metric: "custom_metric",
        threshold: { warning: 99.5, critical: 99 },
      });

      const slos = getSLODefinitions();
      expect(slos.some((s) => s.id === "custom-slo")).toBe(true);
    });
  });

  describe("updateSLOStatus", () => {
    it("updates SLO with healthy status", () => {
      const status = updateSLOStatus("voice-availability", 99.9);

      expect(status).not.toBeNull();
      expect(status?.status).toBe("healthy");
      expect(status?.currentValue).toBe(99.9);
    });

    it("updates SLO with warning status", () => {
      const status = updateSLOStatus("voice-availability", 99.6);

      expect(status?.status).toBe("warning");
    });

    it("updates SLO with breached status", () => {
      const status = updateSLOStatus("voice-availability", 99.0);

      expect(status?.status).toBe("breached");
    });

    it("returns null for unknown SLO", () => {
      const status = updateSLOStatus("unknown-slo", 99.9);
      expect(status).toBeNull();
    });

    it("tracks trend", () => {
      updateSLOStatus("voice-availability", 99.5);
      const status = updateSLOStatus("voice-availability", 99.9);

      expect(status?.trend).toBe("improving");
    });
  });

  describe("createAlert", () => {
    it("creates alert with correct properties", () => {
      const alert = createAlert({
        severity: "warning",
        title: "Test Alert",
        message: "This is a test",
      });

      expect(alert.id).toBeDefined();
      expect(alert.severity).toBe("warning");
      expect(alert.status).toBe("active");
      expect(alert.title).toBe("Test Alert");
    });

    it("adds alert to active alerts", () => {
      const beforeCount = getActiveAlerts().length;
      createAlert({
        severity: "info",
        title: "New Alert",
        message: "Test",
      });
      const afterCount = getActiveAlerts().length;

      expect(afterCount).toBe(beforeCount + 1);
    });
  });

  describe("acknowledgeAlert", () => {
    it("acknowledges active alert", () => {
      const alert = createAlert({
        severity: "warning",
        title: "Test",
        message: "Test",
      });

      const acknowledged = acknowledgeAlert(alert.id, "test-user");

      expect(acknowledged?.status).toBe("acknowledged");
      expect(acknowledged?.acknowledgedBy).toBe("test-user");
    });

    it("returns null for unknown alert", () => {
      const result = acknowledgeAlert("unknown-id", "test-user");
      expect(result).toBeNull();
    });
  });

  describe("resolveAlert", () => {
    it("resolves alert and removes from active", () => {
      const alert = createAlert({
        severity: "warning",
        title: "Test",
        message: "Test",
      });

      const resolved = resolveAlert(alert.id, "test-user");

      expect(resolved?.status).toBe("resolved");
      expect(resolved?.resolvedBy).toBe("test-user");

      const active = getActiveAlerts();
      expect(active.find((a) => a.id === alert.id)).toBeUndefined();
    });
  });

  describe("runGoNoGoChecks", () => {
    it("returns go decision when all checks pass", () => {
      const result = runGoNoGoChecks();

      expect(result.decision).toBe("go");
      expect(result.requiredFailures).toBe(0);
    });

    it("includes expected checks", () => {
      const result = runGoNoGoChecks();

      expect(result.checks.some((c) => c.checkId === "slo-breaches")).toBe(
        true,
      );
      expect(
        result.checks.some((c) => c.checkId === "global-kill-switch"),
      ).toBe(true);
      expect(result.checks.some((c) => c.checkId === "degradation-level")).toBe(
        true,
      );
    });

    it("returns nogo when global kill-switch active", async () => {
      const { isGlobalKillSwitchActive } = await import("@/lib/feature-flags");
      (
        isGlobalKillSwitchActive as ReturnType<typeof vi.fn>
      ).mockReturnValueOnce(true);

      const result = runGoNoGoChecks();

      expect(result.decision).toBe("nogo");
      expect(result.requiredFailures).toBeGreaterThan(0);
    });
  });

  describe("getAlertHistory", () => {
    it("returns limited history", () => {
      // Create several alerts
      for (let i = 0; i < 10; i++) {
        createAlert({
          severity: "info",
          title: `Alert ${i}`,
          message: "Test",
        });
      }

      const history = getAlertHistory(5);
      expect(history.length).toBe(5);
    });
  });

  describe("getAllSLOStatuses", () => {
    it("returns updated SLO statuses", () => {
      updateSLOStatus("voice-availability", 99.8);
      updateSLOStatus("chat-latency-p95", 90);

      const statuses = getAllSLOStatuses();
      expect(statuses.length).toBe(2);
    });
  });
});
