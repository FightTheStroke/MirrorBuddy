/**
 * Tests for Threshold Logic (F-07, F-25)
 *
 * Verifies:
 * - Threshold boundaries (70%, 85%, 95%)
 * - Alert status calculation
 * - Proactive alert triggering (F-07)
 * - Alert messages
 */

import { describe, it, expect } from "vitest";
import {
  calculateStatus,
  shouldTriggerProactiveAlert,
  getAlertMessage,
  shouldSendAlert,
  annotateMetric,
  THRESHOLDS,
} from "../threshold-logic";

describe("Threshold Logic (F-25, F-07)", () => {
  describe("calculateStatus", () => {
    it("returns 'ok' for usage < 70%", () => {
      expect(calculateStatus(0)).toBe("ok");
      expect(calculateStatus(50)).toBe("ok");
      expect(calculateStatus(69)).toBe("ok");
    });

    it("returns 'warning' for 70% <= usage < 85%", () => {
      expect(calculateStatus(70)).toBe("warning");
      expect(calculateStatus(75)).toBe("warning");
      expect(calculateStatus(84)).toBe("warning");
    });

    it("returns 'critical' for 85% <= usage < 95%", () => {
      expect(calculateStatus(85)).toBe("critical");
      expect(calculateStatus(90)).toBe("critical");
      expect(calculateStatus(94)).toBe("critical");
    });

    it("returns 'emergency' for usage >= 95%", () => {
      expect(calculateStatus(95)).toBe("emergency");
      expect(calculateStatus(99)).toBe("emergency");
      expect(calculateStatus(100)).toBe("emergency");
    });
  });

  describe("threshold constants", () => {
    it("has correct F-25 thresholds", () => {
      expect(THRESHOLDS.warning).toBe(70);
      expect(THRESHOLDS.critical).toBe(85);
      expect(THRESHOLDS.emergency).toBe(95);
    });

    it("has F-07 proactive threshold of 80%", () => {
      expect(THRESHOLDS.proactive).toBe(80);
    });
  });

  describe("shouldTriggerProactiveAlert", () => {
    it("returns false for usage < 80% (F-07)", () => {
      expect(shouldTriggerProactiveAlert(0)).toBe(false);
      expect(shouldTriggerProactiveAlert(70)).toBe(false);
      expect(shouldTriggerProactiveAlert(79)).toBe(false);
    });

    it("returns true for usage >= 80% (F-07)", () => {
      expect(shouldTriggerProactiveAlert(80)).toBe(true);
      expect(shouldTriggerProactiveAlert(90)).toBe(true);
      expect(shouldTriggerProactiveAlert(100)).toBe(true);
    });
  });

  describe("getAlertMessage", () => {
    it("returns appropriate message for 'ok' status", () => {
      const msg = getAlertMessage("Bandwidth", "ok", 50);
      expect(msg).toContain("OK");
      expect(msg).toContain("Bandwidth");
      expect(msg).toContain("50%");
    });

    it("returns appropriate message for 'warning' status", () => {
      const msg = getAlertMessage("Database", "warning", 75);
      expect(msg).toContain("WARNING");
      expect(msg).toContain("Database");
      expect(msg).toContain("75%");
    });

    it("returns appropriate message for 'critical' status", () => {
      const msg = getAlertMessage("Memory", "critical", 90);
      expect(msg).toContain("CRITICAL");
      expect(msg).toContain("Memory");
      expect(msg).toContain("90%");
    });

    it("returns appropriate message for 'emergency' status", () => {
      const msg = getAlertMessage("Connections", "emergency", 98);
      expect(msg).toContain("EMERGENCY");
      expect(msg).toContain("Connections");
      expect(msg).toContain("98%");
    });
  });

  describe("shouldSendAlert", () => {
    it("returns false for 'ok' status", () => {
      expect(shouldSendAlert("ok")).toBe(false);
    });

    it("returns true for 'warning', 'critical', 'emergency' (F-18)", () => {
      expect(shouldSendAlert("warning")).toBe(true);
      expect(shouldSendAlert("critical")).toBe(true);
      expect(shouldSendAlert("emergency")).toBe(true);
    });
  });

  describe("annotateMetric", () => {
    it("annotates metric with status and message", () => {
      const metric = annotateMetric("Bandwidth", 75);
      expect(metric.name).toBe("Bandwidth");
      expect(metric.usagePercent).toBe(75);
      expect(metric.status).toBe("warning");
      expect(metric.shouldAlert).toBe(true);
      expect(metric.message).toContain("WARNING");
    });

    it("annotates metric at critical threshold", () => {
      const metric = annotateMetric("Database", 85);
      expect(metric.status).toBe("critical");
      expect(metric.shouldAlert).toBe(true);
    });

    it("annotates metric at emergency threshold", () => {
      const metric = annotateMetric("Memory", 95);
      expect(metric.status).toBe("emergency");
      expect(metric.shouldAlert).toBe(true);
    });

    it("annotates metric with ok status", () => {
      const metric = annotateMetric("Connections", 50);
      expect(metric.status).toBe("ok");
      expect(metric.shouldAlert).toBe(false);
    });
  });

  describe("realistic scenarios", () => {
    it("handles typical database growth pattern", () => {
      // Week 1: 30% usage
      expect(calculateStatus(30)).toBe("ok");

      // Week 2: 65% usage
      expect(calculateStatus(65)).toBe("ok");

      // Week 3: 75% usage - warning but not proactive alert yet
      const status3 = calculateStatus(75);
      expect(status3).toBe("warning");
      expect(shouldTriggerProactiveAlert(75)).toBe(false);

      // Week 3b: 80% usage - proactive alert triggers (F-07)
      expect(shouldTriggerProactiveAlert(80)).toBe(true);

      // Week 4: 88% usage - critical
      expect(calculateStatus(88)).toBe("critical");

      // Emergency: 96% usage
      expect(calculateStatus(96)).toBe("emergency");
    });

    it("distinguishes between warning and critical for capacity planning", () => {
      // At 75%, team should plan for scale-up (F-07 proactive)
      expect(shouldTriggerProactiveAlert(75)).toBe(false);
      expect(shouldTriggerProactiveAlert(80)).toBe(true);

      // At 90%, immediate action needed
      expect(calculateStatus(90)).toBe("critical");
    });

    it("handles edge case of exactly 70%", () => {
      expect(calculateStatus(70)).toBe("warning");
      expect(shouldSendAlert("warning")).toBe(true);
    });

    it("handles edge case of exactly 85%", () => {
      expect(calculateStatus(85)).toBe("critical");
      expect(shouldSendAlert("critical")).toBe(true);
    });

    it("handles edge case of exactly 95%", () => {
      expect(calculateStatus(95)).toBe("emergency");
      expect(shouldSendAlert("emergency")).toBe(true);
    });
  });

  describe("F-18: Every limit monitored", () => {
    it("provides consistent alert logic for all metrics", () => {
      const metrics = [
        "Bandwidth",
        "Database",
        "Memory",
        "Connections",
        "Email",
      ];
      const usagePercents = [30, 75, 85, 95];

      // Each metric should follow same threshold logic
      for (const percent of usagePercents) {
        for (const metric of metrics) {
          const annotated = annotateMetric(metric, percent);
          const status = calculateStatus(percent);
          expect(annotated.status).toBe(status);
        }
      }
    });
  });
});
