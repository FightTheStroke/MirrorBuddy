/**
 * Grafana Locale Metrics Dashboard - Test Suite
 * Verifies dashboard JSON structure, panels, and variables
 */

import * as fs from "fs";
import * as path from "path";
import { describe, it, beforeAll, expect } from "vitest";

describe("Grafana Locale Metrics Dashboard", () => {
  const dashboardPath = path.join(
    process.cwd(),
    "monitoring/dashboards/locale-metrics.json",
  );

  let dashboard: any;

  beforeAll(() => {
    // Load the dashboard JSON
    expect(fs.existsSync(dashboardPath)).toBe(true);
    const content = fs.readFileSync(dashboardPath, "utf-8");
    dashboard = JSON.parse(content);
  });

  describe("Dashboard Structure", () => {
    it("should have valid Grafana dashboard schema", () => {
      expect(dashboard).toHaveProperty("title");
      expect(dashboard).toHaveProperty("description");
      expect(dashboard).toHaveProperty("tags");
      expect(dashboard).toHaveProperty("panels");
      expect(dashboard).toHaveProperty("templating");
      expect(dashboard).toHaveProperty("time");
      expect(dashboard).toHaveProperty("refresh");
    });

    it("should have appropriate title and description", () => {
      expect(dashboard.title).toBe("Locale Metrics Dashboard");
      expect(dashboard.description).toContain("locale");
      expect(dashboard.tags).toContain("locale");
      expect(dashboard.tags).toContain("i18n");
    });

    it("should have schemaVersion 38 (Grafana 9+)", () => {
      expect(dashboard.schemaVersion).toBe(38);
    });

    it("should have time range configuration", () => {
      expect(dashboard.time).toHaveProperty("from");
      expect(dashboard.time).toHaveProperty("to");
      expect(["now-24h", "now-7d", "now-30d"]).toContain(dashboard.time.from);
    });

    it("should have refresh interval configured", () => {
      expect(["10s", "30s", "1m", "5m"]).toContain(dashboard.refresh);
    });
  });

  describe("Required Panels", () => {
    it("should have panel for locale distribution", () => {
      const localeDistPanel = dashboard.panels.find(
        (p: any) => p.title && p.title.toLowerCase().includes("distribution"),
      );
      expect(localeDistPanel).toBeDefined();
      expect(localeDistPanel.type).toMatch(/stat|gauge|piechart|bargauge/);
      expect(localeDistPanel.targets).toBeDefined();
      expect(localeDistPanel.targets.length).toBeGreaterThan(0);
    });

    it("should have panel for language switching events", () => {
      const switchPanel = dashboard.panels.find(
        (p: any) =>
          p.title &&
          (p.title.toLowerCase().includes("switch") ||
            p.title.toLowerCase().includes("changes")),
      );
      expect(switchPanel).toBeDefined();
      expect(switchPanel.type).toMatch(/timeseries|graph|table|stat/);
      expect(switchPanel.targets).toBeDefined();
      expect(switchPanel.targets.length).toBeGreaterThan(0);
    });

    it("should have panel for error rates per locale", () => {
      const errorPanel = dashboard.panels.find(
        (p: any) =>
          p.title &&
          (p.title.toLowerCase().includes("error") ||
            p.title.toLowerCase().includes("failures")),
      );
      expect(errorPanel).toBeDefined();
      expect(errorPanel.type).toMatch(/timeseries|table|stat|gauge/);
      expect(errorPanel.targets).toBeDefined();
      expect(errorPanel.targets.length).toBeGreaterThan(0);
    });

    it("should have at least 3 panels total", () => {
      expect(dashboard.panels.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Variables and Filtering", () => {
    it("should have templating with variables list", () => {
      expect(dashboard.templating).toBeDefined();
      expect(dashboard.templating.list).toBeDefined();
      expect(Array.isArray(dashboard.templating.list)).toBe(true);
    });

    it("should have locale filter variable", () => {
      const localeVar = dashboard.templating.list.find(
        (v: any) => v.name === "locale",
      );
      expect(localeVar).toBeDefined();
      expect(["query", "custom"]).toContain(localeVar.type);
    });

    it("should include locale variable in panel targets", () => {
      const panelsWithLocale = dashboard.panels.filter((p: any) =>
        p.targets?.some((t: any) =>
          (t.expr || t.query || "").includes("$locale"),
        ),
      );
      expect(panelsWithLocale.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Panel Configuration", () => {
    it("should have gridPos for all panels", () => {
      dashboard.panels.forEach((panel: any) => {
        expect(panel.gridPos).toBeDefined();
        expect(panel.gridPos.h).toBeGreaterThan(0);
        expect(panel.gridPos.w).toBeGreaterThan(0);
        expect(panel.gridPos.x).toBeGreaterThanOrEqual(0);
        expect(panel.gridPos.y).toBeGreaterThanOrEqual(0);
      });
    });

    it("should have unique panel IDs", () => {
      const ids = dashboard.panels.map((p: any) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have targets with expr or query property", () => {
      dashboard.panels.forEach((panel: any) => {
        if (panel.targets && panel.targets.length > 0) {
          panel.targets.forEach((target: any) => {
            expect(target.expr || target.query || target.format).toBeDefined();
          });
        }
      });
    });
  });

  describe("Grafana Cloud Pattern Compliance", () => {
    it("should follow existing dashboard conventions", () => {
      // Should have editable flag
      expect(dashboard.editable).toBeDefined();

      // Should have uid for importability
      expect(dashboard.uid).toBeDefined();
      expect(typeof dashboard.uid).toBe("string");
      expect(dashboard.uid).toContain("locale");
    });

    it("should have id null for proper import", () => {
      // For fresh imports, id should be null
      expect(dashboard.id).toBeNull();
    });

    it("should have version field", () => {
      expect(dashboard.version).toBeDefined();
      expect(typeof dashboard.version).toBe("number");
      expect(dashboard.version).toBeGreaterThanOrEqual(1);
    });
  });

  describe("File Validation", () => {
    it("should be located in monitoring/dashboards directory", () => {
      expect(dashboardPath).toContain("monitoring/dashboards");
      expect(fs.existsSync(dashboardPath)).toBe(true);
    });

    it("should be valid JSON", () => {
      const content = fs.readFileSync(dashboardPath, "utf-8");
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it("should not have syntax errors when parsed", () => {
      expect(dashboard).toBeTruthy();
      expect(typeof dashboard).toBe("object");
    });
  });
});
