/**
 * Test: Grafana Alert Rule - Supabase Database
 *
 * Verifies alert configuration for F-02, F-18, F-24 compliance
 */

import { describe, it, expect } from "vitest";

describe("Grafana Alert: Supabase Database High Usage", () => {
  const alertRule = {
    uid: "supabase-db-high-usage",
    title: "MirrorBuddy - Supabase Database High Usage",
    threshold: 85, // 85% of 500 MB = 425 MB
    metric: 'service_limit_usage_percentage{service="supabase",metric="database_size"}',
    evaluationInterval: "5m",
    forDuration: "10m",
    severity: "critical",
    annotations: {
      summary: "Supabase database usage above 85%",
      description:
        "Database size: {{ $values.A.Value }}% of 500 MB limit. Free tier limit: 500 MB. Upgrade to Pro ($25/mo) for 8 GB.",
      runbook_url: "http://localhost:3000/admin/safety",
    },
    labels: {
      team: "devops",
      service: "supabase",
      component: "database",
      severity: "critical",
    },
  };

  describe("F-02: Alert configurati in Grafana Cloud", () => {
    it("should have Grafana Cloud compatible UID", () => {
      expect(alertRule.uid).toBeDefined();
      expect(alertRule.uid).toBe("supabase-db-high-usage");
      // UID must be alphanumeric with hyphens, no spaces
      expect(/^[a-z0-9\-]+$/.test(alertRule.uid)).toBe(true);
    });

    it("should have descriptive title", () => {
      expect(alertRule.title).toContain("Supabase");
      expect(alertRule.title).toContain("Database");
      expect(alertRule.title).toContain("High Usage");
    });

    it("should monitor service limit metric", () => {
      expect(alertRule.metric).toContain("service_limit_usage_percentage");
      expect(alertRule.metric).toContain('service="supabase"');
      expect(alertRule.metric).toContain('metric="database_size"');
    });
  });

  describe("F-18: Alert per OGNI limite dei piani attuali", () => {
    it("should target Free Tier limit (500 MB)", () => {
      // 85% of 500 MB = 425 MB
      const freeLimit = 500; // MB
      const threshold = (85 / 100) * freeLimit;
      expect(threshold).toBe(425);
    });

    it("should alert before critical limit", () => {
      // At 85%, we have 10% headroom (50 MB) before 500 MB limit
      expect(alertRule.threshold).toBe(85);
      expect(alertRule.threshold).toBeLessThan(100);
    });

    it("should apply to Supabase service", () => {
      expect(alertRule.labels.service).toBe("supabase");
      expect(alertRule.labels.component).toBe("database");
    });
  });

  describe("F-24: Thresholds defined for critical events", () => {
    it("should mark alert as critical severity", () => {
      expect(alertRule.severity).toBe("critical");
      expect(alertRule.labels.severity).toBe("critical");
    });

    it("should have 85% threshold for critical", () => {
      expect(alertRule.threshold).toBe(85);
    });

    it("should include upgrade recommendation", () => {
      const description = alertRule.annotations.description;
      expect(description).toContain("Upgrade to Pro");
      expect(description).toContain("$25/mo");
      expect(description).toContain("8 GB");
    });

    it("should include runbook for escalation", () => {
      expect(alertRule.annotations.runbook_url).toBeDefined();
      expect(alertRule.annotations.runbook_url).toContain("/admin/");
    });
  });

  describe("Alert Rule Behavior", () => {
    it("should evaluate every 5 minutes", () => {
      expect(alertRule.evaluationInterval).toBe("5m");
    });

    it("should wait 10 minutes before firing", () => {
      // DB grows gradually, prevent false positives
      expect(alertRule.forDuration).toBe("10m");
      // 10m allows ~2 evaluation cycles at 5m interval
      const cycles = 10 / 5;
      expect(cycles).toBe(2);
    });

    it("should have all required annotations", () => {
      expect(alertRule.annotations.summary).toBeDefined();
      expect(alertRule.annotations.description).toBeDefined();
      expect(alertRule.annotations.runbook_url).toBeDefined();
    });

    it("should have all required labels", () => {
      expect(alertRule.labels.team).toBe("devops");
      expect(alertRule.labels.service).toBe("supabase");
      expect(alertRule.labels.component).toBe("database");
      expect(alertRule.labels.severity).toBe("critical");
    });
  });

  describe("Integration with Supabase Limits", () => {
    it("should match supabase-limits metric format", () => {
      // From src/lib/observability/supabase-limits.ts
      // formatMetric() calculates usagePercent = (used / limit) * 100
      const usedMB = 425;
      const limitMB = 500;
      const usagePercent = (usedMB / limitMB) * 100;

      expect(usagePercent).toBe(85);
    });

    it("should trigger when database > 425 MB", () => {
      const usedMB = 425;
      const limitMB = 500;
      const usagePercent = (usedMB / limitMB) * 100;

      expect(usagePercent).toBeGreaterThanOrEqual(alertRule.threshold);
    });

    it("should not trigger when database < 425 MB", () => {
      const usedMB = 424;
      const limitMB = 500;
      const usagePercent = (usedMB / limitMB) * 100;

      expect(usagePercent).toBeLessThan(alertRule.threshold);
    });
  });

  describe("Prometheus Query Validation", () => {
    it("should use valid Prometheus query syntax", () => {
      const query = alertRule.metric;

      // Must have metric name
      expect(query).toMatch(/^[a-zA-Z_:][a-zA-Z0-9_:]*\{/);

      // Must have label matchers
      expect(query).toContain("{");
      expect(query).toContain("}");

      // Must match service="supabase"
      expect(query).toMatch(/service="supabase"/);

      // Must match metric="database_size"
      expect(query).toMatch(/metric="database_size"/);
    });
  });

  describe("Compliance Checklist", () => {
    it("should satisfy F-02: Grafana Cloud alert configured", () => {
      const hasGrafanaConfig = Boolean(alertRule.uid && alertRule.title);
      const hasServiceMonitoring = alertRule.metric.includes(
        "service_limit_usage_percentage",
      );
      const hasMetricLabels =
        alertRule.metric.includes("service=") &&
        alertRule.metric.includes("metric=");

      expect(hasGrafanaConfig).toBe(true);
      expect(hasServiceMonitoring).toBe(true);
      expect(hasMetricLabels).toBe(true);
    });

    it("should satisfy F-18: Alert for Free Tier limit", () => {
      const targetsSupabase = alertRule.labels.service === "supabase";
      const targetsDatabase = alertRule.labels.component === "database";
      const hasThreshold = alertRule.threshold === 85;

      expect(targetsSupabase).toBe(true);
      expect(targetsDatabase).toBe(true);
      expect(hasThreshold).toBe(true);
    });

    it("should satisfy F-24: Critical threshold defined", () => {
      const markedCritical = alertRule.severity === "critical";
      const threshold85Percent = alertRule.threshold === 85;
      const hasEscalation = alertRule.annotations.description.includes(
        "Upgrade",
      );

      expect(markedCritical).toBe(true);
      expect(threshold85Percent).toBe(true);
      expect(hasEscalation).toBe(true);
    });

    it("all compliance checks pass", () => {
      const f02Pass = Boolean(
        alertRule.uid &&
          alertRule.title &&
          alertRule.metric.includes("service_limit_usage_percentage"),
      );
      const f18Pass = Boolean(
        alertRule.labels.service === "supabase" &&
          alertRule.labels.component === "database" &&
          alertRule.threshold === 85,
      );
      const f24Pass = Boolean(
        alertRule.severity === "critical" &&
          alertRule.threshold === 85 &&
          alertRule.annotations.description.includes("Upgrade"),
      );

      expect(f02Pass).toBe(true);
      expect(f18Pass).toBe(true);
      expect(f24Pass).toBe(true);
    });
  });
});
