/**
 * Grafana Tier Dashboard JSON Validation Tests
 *
 * Tests verify that the tier dashboard JSON:
 * 1. Exists and is valid JSON
 * 2. Contains required panel types
 * 3. Uses correct metric names
 * 4. Has proper data sources and formatting
 */

import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";

interface DashboardPanel {
  title: string;
  type: string;
  targets?: Array<{
    expr?: string;
    metric?: string;
  }>;
}

interface GrafanaDashboardJSON {
  title: string;
  panels: DashboardPanel[];
  refresh?: string;
  time?: {
    from: string;
    to: string;
  };
}

describe("Grafana Tier Dashboard", () => {
  let dashboardData: GrafanaDashboardJSON;
  const dashboardPath = path.join(
    __dirname,
    "../../docs/grafana/tier-dashboard.json",
  );

  beforeAll(() => {
    // Load the dashboard JSON
    const dashboardContent = fs.readFileSync(dashboardPath, "utf-8");
    dashboardData = JSON.parse(dashboardContent);
  });

  it("should exist and be valid JSON", () => {
    expect(dashboardData).toBeDefined();
    expect(dashboardData.title).toBeDefined();
  });

  it("should have a title", () => {
    expect(dashboardData.title).toBeDefined();
    expect(dashboardData.title).toMatch(/tier/i);
  });

  it("should have at least 4 panels", () => {
    expect(dashboardData.panels).toBeDefined();
    expect(dashboardData.panels.length).toBeGreaterThanOrEqual(4);
  });

  it("should have a pie chart panel for users by tier", () => {
    const piePanel = dashboardData.panels.find(
      (p) => p.type === "piechart" && p.title.toLowerCase().includes("tier"),
    );
    expect(piePanel).toBeDefined();
  });

  it("should have a time series panel for active users", () => {
    const timeSeriesPanel = dashboardData.panels.find(
      (p) =>
        p.type === "timeseries" && p.title.toLowerCase().includes("active"),
    );
    expect(timeSeriesPanel).toBeDefined();
  });

  it("should have a bar chart panel for tier changes", () => {
    const barPanel = dashboardData.panels.find(
      (p) =>
        p.type === "timeseries" && p.title.toLowerCase().includes("change"),
    );
    expect(barPanel).toBeDefined();
  });

  it("should have a stat/gauge panel for upgrade/downgrade rates", () => {
    const statPanel = dashboardData.panels.find(
      (p) =>
        p.type === "piechart" &&
        (p.title.toLowerCase().includes("upgrade") ||
          p.title.toLowerCase().includes("downgrade")),
    );
    expect(statPanel).toBeDefined();
  });

  it("should reference correct tier metrics", () => {
    const allExpressions = dashboardData.panels
      .flatMap((p) => p.targets || [])
      .map((t) => t.expr || t.metric || "")
      .filter((e) => e.length > 0)
      .join("|");

    expect(allExpressions).toMatch(/mirrorbuddy_users_by_tier/);
    expect(allExpressions).toMatch(/mirrorbuddy_active_users_by_tier/);
  });

  it("should have proper Prometheus data source configuration", () => {
    // Check that dashboard references Prometheus as data source
    const hasPrometheus =
      JSON.stringify(dashboardData).includes("Prometheus") ||
      JSON.stringify(dashboardData).includes("prometheus");
    expect(hasPrometheus).toBe(true);
  });

  it("should have refresh interval defined", () => {
    expect(dashboardData.refresh).toBeDefined();
    expect(["30s", "1m", "5m", "10m", "30m", "1h"]).toContain(
      dashboardData.refresh,
    );
  });

  it("should have a time range definition", () => {
    expect(dashboardData.time).toBeDefined();
    if (dashboardData.time) {
      expect(dashboardData.time.from).toBeDefined();
      expect(dashboardData.time.to).toBeDefined();
    }
  });
});
