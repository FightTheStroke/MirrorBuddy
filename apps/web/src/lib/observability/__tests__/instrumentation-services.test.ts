/**
 * @fileoverview Tests to verify all required services are started in instrumentation.ts
 *
 * CRITICAL: These tests prevent regressions where services are implemented
 * but never actually started. If a test fails, someone forgot to wire up
 * a service in instrumentation.ts.
 *
 * Related incident: prometheusPushService was implemented but never started,
 * causing metrics to not be pushed to Grafana Cloud.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Instrumentation Services", () => {
  const instrumentationPath = path.join(process.cwd(), "instrumentation.ts");
  const instrumentationContent = fs.readFileSync(instrumentationPath, "utf-8");

  describe("Required service starts", () => {
    it("should start prometheusPushService for Grafana Cloud metrics", () => {
      // Verify import (dynamic import in instrumentation.ts)
      expect(instrumentationContent).toMatch(
        /prometheusPushService.*=.*await\s+import.*@\/lib\/observability/,
      );
      // Verify start call
      expect(instrumentationContent).toMatch(
        /prometheusPushService\.start\(\)/,
      );
    });

    it("should initialize OpenTelemetry SDK", () => {
      expect(instrumentationContent).toMatch(/initializeOpenTelemetry/);
      expect(instrumentationContent).toMatch(/startOpenTelemetry/);
    });

    it("should validate environment variables", () => {
      expect(instrumentationContent).toMatch(/validateEnv\(\)/);
    });
  });

  describe("Service initialization order", () => {
    it("should validate env before starting services", () => {
      const validateEnvPos = instrumentationContent.indexOf("validateEnv()");
      const pushServicePos = instrumentationContent.indexOf(
        "prometheusPushService.start()",
      );

      expect(validateEnvPos).toBeLessThan(pushServicePos);
    });

    it("should start OpenTelemetry before other services", () => {
      const otelPos = instrumentationContent.indexOf("startOpenTelemetry");
      const pushServicePos = instrumentationContent.indexOf(
        "prometheusPushService.start()",
      );

      expect(otelPos).toBeLessThan(pushServicePos);
    });
  });
});

describe("PrometheusPushService", () => {
  it("should export prometheusPushService from observability module", async () => {
    const { prometheusPushService } = await import("../index");
    expect(prometheusPushService).toBeDefined();
    expect(typeof prometheusPushService.start).toBe("function");
    expect(typeof prometheusPushService.stop).toBe("function");
    expect(typeof prometheusPushService.isConfigured).toBe("function");
    expect(typeof prometheusPushService.isActive).toBe("function");
  });

  it("should have initialize method that checks env vars", async () => {
    const { prometheusPushService } = await import("../index");
    expect(typeof prometheusPushService.initialize).toBe("function");
  });

  it("should NOT start in development (cost savings)", async () => {
    // In test environment (which is not production), the service should not activate
    const { prometheusPushService } = await import("../index");
    prometheusPushService.start();
    expect(prometheusPushService.isActive()).toBe(false);
  });
});
