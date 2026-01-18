/**
 * E2E tests for Admin Dashboard features (Plan 49)
 *
 * Tests feature flags, cost monitoring, and SLO monitoring APIs
 */

import { test, expect } from "@playwright/test";

test.describe("Admin Feature Flags API", () => {
  test("GET /api/admin/feature-flags returns all flags", async ({ request }) => {
    const response = await request.get("/api/admin/feature-flags");

    expect(response.ok()).toBe(true);
    const data = await response.json();

    expect(data.flags).toBeDefined();
    expect(data.globalKillSwitch).toBeDefined();
    expect(data.timestamp).toBeDefined();
  });

  test("GET with health=true includes degradation state", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/admin/feature-flags?health=true",
    );

    expect(response.ok()).toBe(true);
    const data = await response.json();

    expect(data.degradation).toBeDefined();
    expect(data.activeAlerts).toBeDefined();
    expect(data.sloStatuses).toBeDefined();
  });

  test("GET with gonogo=true includes GO/NO-GO result", async ({ request }) => {
    const response = await request.get(
      "/api/admin/feature-flags?gonogo=true",
    );

    expect(response.ok()).toBe(true);
    const data = await response.json();

    expect(data.goNoGoResult).toBeDefined();
    expect(data.goNoGoResult.decision).toMatch(/^(go|nogo|degraded)$/);
    expect(data.goNoGoResult.score).toBeGreaterThanOrEqual(0);
    expect(data.goNoGoResult.score).toBeLessThanOrEqual(100);
  });

  test("GET with costs=true includes cost metrics", async ({ request }) => {
    const response = await request.get(
      "/api/admin/feature-flags?costs=true",
    );

    expect(response.ok()).toBe(true);
    const data = await response.json();

    expect(data.costStats).toBeDefined();
    expect(data.voiceLimits).toBeDefined();
    expect(data.activeVoiceSessions).toBeDefined();

    // Verify cost stats structure
    expect(typeof data.costStats.avgCostText24h).toBe("number");
    expect(typeof data.costStats.avgCostVoice24h).toBe("number");
    expect(typeof data.costStats.spikesThisWeek).toBe("number");
  });

  test("POST updates feature flag", async ({ request }) => {
    const response = await request.post("/api/admin/feature-flags", {
      data: {
        featureId: "voice_realtime",
        update: {
          enabledPercentage: 100,
        },
      },
    });

    expect(response.ok()).toBe(true);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.flag).toBeDefined();
  });

  test("POST activates kill-switch for feature", async ({ request }) => {
    // First activate
    const activateResponse = await request.post("/api/admin/feature-flags", {
      data: {
        featureId: "pdf_export",
        enabled: true,
        reason: "E2E test activation",
      },
    });

    expect(activateResponse.ok()).toBe(true);
    const activateData = await activateResponse.json();
    expect(activateData.success).toBe(true);
    expect(activateData.killSwitch).toBe(true);

    // Then deactivate
    const deactivateResponse = await request.post("/api/admin/feature-flags", {
      data: {
        featureId: "pdf_export",
        enabled: false,
      },
    });

    expect(deactivateResponse.ok()).toBe(true);
    const deactivateData = await deactivateResponse.json();
    expect(deactivateData.success).toBe(true);
    expect(deactivateData.killSwitch).toBe(false);
  });

  test("POST global kill-switch affects all features", async ({ request }) => {
    // Activate global
    const activateResponse = await request.post("/api/admin/feature-flags", {
      data: {
        global: true,
        enabled: true,
        reason: "E2E test global activation",
      },
    });

    expect(activateResponse.ok()).toBe(true);

    // Verify global is active
    const checkResponse = await request.get("/api/admin/feature-flags");
    const checkData = await checkResponse.json();
    expect(checkData.globalKillSwitch).toBe(true);

    // Deactivate global
    const deactivateResponse = await request.post("/api/admin/feature-flags", {
      data: {
        global: true,
        enabled: false,
      },
    });

    expect(deactivateResponse.ok()).toBe(true);

    // Verify global is deactivated
    const finalResponse = await request.get("/api/admin/feature-flags");
    const finalData = await finalResponse.json();
    expect(finalData.globalKillSwitch).toBe(false);
  });

  test("DELETE activates emergency kill-switch", async ({ request }) => {
    const response = await request.delete(
      "/api/admin/feature-flags?id=rag_enabled&reason=E2E%20emergency%20test",
    );

    expect(response.ok()).toBe(true);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.featureId).toBe("rag_enabled");
    expect(data.killSwitch).toBe(true);

    // Clean up - reactivate
    await request.post("/api/admin/feature-flags", {
      data: {
        featureId: "rag_enabled",
        enabled: false,
      },
    });
  });

  test("DELETE without id returns 400", async ({ request }) => {
    const response = await request.delete("/api/admin/feature-flags");

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Feature ID is required");
  });
});

test.describe("Admin Voice Cost Guards", () => {
  test("Voice limits are correctly configured", async ({ request }) => {
    const response = await request.get(
      "/api/admin/feature-flags?costs=true",
    );

    expect(response.ok()).toBe(true);
    const data = await response.json();

    // V1Plan FASE 6.2.3 limits
    expect(data.voiceLimits.softCapMinutes).toBe(30);
    expect(data.voiceLimits.hardCapMinutes).toBe(60);
    expect(data.voiceLimits.spikeCooldownMinutes).toBe(15);
  });

  test("Active voice sessions are tracked", async ({ request }) => {
    const response = await request.get(
      "/api/admin/feature-flags?costs=true",
    );

    expect(response.ok()).toBe(true);
    const data = await response.json();

    expect(Array.isArray(data.activeVoiceSessions)).toBe(true);

    // Each session should have required fields
    for (const session of data.activeVoiceSessions) {
      expect(session.sessionId).toBeDefined();
      expect(session.userId).toBeDefined();
      expect(typeof session.durationMinutes).toBe("number");
      expect(["ok", "soft_cap", "hard_cap"]).toContain(session.status);
    }
  });
});

test.describe("Admin SLO Monitoring", () => {
  test("SLO statuses include all required metrics", async ({ request }) => {
    const response = await request.get(
      "/api/admin/feature-flags?health=true",
    );

    expect(response.ok()).toBe(true);
    const data = await response.json();

    expect(Array.isArray(data.sloStatuses)).toBe(true);

    // Each SLO should have required fields
    for (const slo of data.sloStatuses) {
      expect(slo.metric).toBeDefined();
      expect(typeof slo.current).toBe("number");
      expect(typeof slo.target).toBe("number");
      expect(["ok", "warning", "breached"]).toContain(slo.status);
    }
  });

  test("GO/NO-GO checks evaluate correctly", async ({ request }) => {
    const response = await request.get(
      "/api/admin/feature-flags?gonogo=true",
    );

    expect(response.ok()).toBe(true);
    const data = await response.json();

    const result = data.goNoGoResult;
    expect(result.decision).toMatch(/^(go|nogo|degraded)$/);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(Array.isArray(result.checks)).toBe(true);
    expect(result.timestamp).toBeDefined();

    // Each check should have status
    for (const check of result.checks) {
      expect(check.name).toBeDefined();
      expect(["pass", "fail", "warn"]).toContain(check.status);
    }
  });

  test("Active alerts have required fields", async ({ request }) => {
    const response = await request.get(
      "/api/admin/feature-flags?health=true",
    );

    expect(response.ok()).toBe(true);
    const data = await response.json();

    expect(Array.isArray(data.activeAlerts)).toBe(true);

    for (const alert of data.activeAlerts) {
      expect(alert.id).toBeDefined();
      expect(alert.metric).toBeDefined();
      expect(["info", "warning", "critical"]).toContain(alert.severity);
      expect(alert.message).toBeDefined();
      expect(["active", "acknowledged", "resolved"]).toContain(alert.status);
    }
  });
});

test.describe("Admin Degradation State", () => {
  test("Degradation state is properly structured", async ({ request }) => {
    const response = await request.get(
      "/api/admin/feature-flags?health=true",
    );

    expect(response.ok()).toBe(true);
    const data = await response.json();

    expect(data.degradation).toBeDefined();
    expect(["none", "partial", "severe", "critical"]).toContain(
      data.degradation.level,
    );
    expect(Array.isArray(data.degradation.activeRules)).toBe(true);
  });

  test("Recent events are returned", async ({ request }) => {
    const response = await request.get(
      "/api/admin/feature-flags?health=true",
    );

    expect(response.ok()).toBe(true);
    const data = await response.json();

    expect(Array.isArray(data.recentEvents)).toBe(true);

    for (const event of data.recentEvents) {
      expect(event.type).toBeDefined();
      expect(event.timestamp).toBeDefined();
    }
  });
});

test.describe("Admin External Services Dashboard", () => {
  test("GET /api/dashboard/external-services returns usage data", async ({
    request,
  }) => {
    const response = await request.get("/api/dashboard/external-services");

    expect(response.ok()).toBe(true);
    const data = await response.json();

    expect(data.services).toBeDefined();
    expect(Array.isArray(data.services)).toBe(true);
  });

  test("External services include quota information", async ({ request }) => {
    const response = await request.get("/api/dashboard/external-services");

    expect(response.ok()).toBe(true);
    const data = await response.json();

    for (const service of data.services) {
      expect(service.name).toBeDefined();
      expect(service.usage).toBeDefined();
      expect(service.quota).toBeDefined();
      expect(typeof service.percentUsed).toBe("number");
    }
  });
});

test.describe("Admin Session Metrics Dashboard", () => {
  test("GET /api/dashboard/session-metrics returns metrics", async ({
    request,
  }) => {
    const response = await request.get("/api/dashboard/session-metrics");

    expect(response.ok()).toBe(true);
    const data = await response.json();

    expect(data.metrics).toBeDefined();
    expect(typeof data.metrics.totalSessions).toBe("number");
    expect(typeof data.metrics.activeSessions).toBe("number");
  });

  test("Session metrics include time-based aggregations", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/dashboard/session-metrics?period=24h",
    );

    expect(response.ok()).toBe(true);
    const data = await response.json();

    expect(data.metrics.period).toBe("24h");
    expect(data.metrics.aggregations).toBeDefined();
  });
});
