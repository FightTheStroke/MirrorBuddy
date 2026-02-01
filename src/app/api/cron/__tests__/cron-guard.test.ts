/**
 * Cron Guard Tests
 *
 * Tests that all cron endpoints skip execution when VERCEL_ENV is not 'production'
 * Requirement F-03: All cron jobs must skip execution in non-production environments
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

// Mock logger for all cron tests
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

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    userPrivacyPreferences: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    userActivity: {
      deleteMany: vi.fn().mockResolvedValue({}),
    },
    funnelEvent: {
      groupBy: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    trialSession: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

// Mock email service
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock funnel
vi.mock("@/lib/funnel", () => ({
  recordStageTransition: vi.fn().mockResolvedValue({}),
}));

describe("Cron Guard - Production Environment Check", () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    // Store original environment
    originalEnv = {
      VERCEL_ENV: process.env.VERCEL_ENV,
      CRON_SECRET: process.env.CRON_SECRET,
      GRAFANA_CLOUD_PROMETHEUS_URL: process.env.GRAFANA_CLOUD_PROMETHEUS_URL,
      GRAFANA_CLOUD_PROMETHEUS_USER: process.env.GRAFANA_CLOUD_PROMETHEUS_USER,
      GRAFANA_CLOUD_API_KEY: process.env.GRAFANA_CLOUD_API_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    };

    // Set default values for testing
    process.env.CRON_SECRET = "test-secret";
    process.env.GRAFANA_CLOUD_PROMETHEUS_URL =
      "https://test.grafana.net/api/prom/push";
    process.env.GRAFANA_CLOUD_PROMETHEUS_USER = "test-user";
    process.env.GRAFANA_CLOUD_API_KEY = "test-key";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  });

  afterEach(() => {
    // Restore original environment
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  });

  describe("data-retention cron", () => {
    it("should skip when VERCEL_ENV is 'staging'", async () => {
      process.env.VERCEL_ENV = "staging";

      const { GET } = await import("../data-retention/route");

      const request = new NextRequest(
        new URL("http://localhost:3000/api/cron/data-retention"),
        {
          method: "GET",
          headers: {
            authorization: "Bearer test-secret",
          },
        },
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.skipped).toBe(true);
      expect(data.reason).toBe("Not production environment");
      expect(data.environment).toBe("staging");
    });

    it("should skip when VERCEL_ENV is 'preview'", async () => {
      process.env.VERCEL_ENV = "preview";

      const { GET } = await import("../data-retention/route");

      const request = new NextRequest(
        new URL("http://localhost:3000/api/cron/data-retention"),
        {
          method: "GET",
          headers: {
            authorization: "Bearer test-secret",
          },
        },
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.skipped).toBe(true);
      expect(data.reason).toBe("Not production environment");
    });

    it("should allow execution when VERCEL_ENV is 'production'", async () => {
      process.env.VERCEL_ENV = "production";

      const { GET } = await import("../data-retention/route");

      const request = new NextRequest(
        new URL("http://localhost:3000/api/cron/data-retention"),
        {
          method: "GET",
          headers: {
            authorization: "Bearer test-secret",
          },
        },
      );

      const response = await GET(request);
      const data = await response.json();

      // Should not be skipped when in production
      expect(data.skipped).toBeUndefined();
      expect(data.status).toBeDefined();
    });
  });

  describe("metrics-push cron", () => {
    it("should skip when VERCEL_ENV is 'staging'", async () => {
      process.env.VERCEL_ENV = "staging";

      const { GET } = await import("../metrics-push/route");

      const request = new NextRequest(
        new URL("http://localhost:3000/api/cron/metrics-push"),
        {
          method: "GET",
          headers: {
            authorization: "Bearer test-secret",
          },
        },
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.skipped).toBe(true);
      expect(data.reason).toBe("Not production environment");
      expect(data.environment).toBe("staging");
    });

    it("should skip when VERCEL_ENV is 'preview'", async () => {
      process.env.VERCEL_ENV = "preview";

      const { GET } = await import("../metrics-push/route");

      const request = new NextRequest(
        new URL("http://localhost:3000/api/cron/metrics-push"),
        {
          method: "GET",
          headers: {
            authorization: "Bearer test-secret",
          },
        },
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.skipped).toBe(true);
      expect(data.reason).toBe("Not production environment");
    });
  });

  describe("business-metrics-daily cron", () => {
    it("should skip when VERCEL_ENV is 'staging'", async () => {
      process.env.VERCEL_ENV = "staging";

      const { GET } = await import("../business-metrics-daily/route");

      const request = new NextRequest(
        new URL("http://localhost:3000/api/cron/business-metrics-daily"),
        {
          method: "GET",
          headers: {
            authorization: "Bearer test-secret",
          },
        },
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.skipped).toBe(true);
      expect(data.reason).toBe("Not production environment");
      expect(data.environment).toBe("staging");
    });

    it("should skip when VERCEL_ENV is 'preview'", async () => {
      process.env.VERCEL_ENV = "preview";

      const { GET } = await import("../business-metrics-daily/route");

      const request = new NextRequest(
        new URL("http://localhost:3000/api/cron/business-metrics-daily"),
        {
          method: "GET",
          headers: {
            authorization: "Bearer test-secret",
          },
        },
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.skipped).toBe(true);
      expect(data.reason).toBe("Not production environment");
    });
  });

  describe("trial-nurturing cron", () => {
    it("should skip when VERCEL_ENV is 'staging'", async () => {
      process.env.VERCEL_ENV = "staging";

      const { GET } = await import("../trial-nurturing/route");

      const request = new NextRequest(
        new URL("http://localhost:3000/api/cron/trial-nurturing"),
        {
          method: "GET",
          headers: {
            authorization: "Bearer test-secret",
          },
        },
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.skipped).toBe(true);
      expect(data.reason).toBe("Not production environment");
      expect(data.environment).toBe("staging");
    });

    it("should skip when VERCEL_ENV is 'preview'", async () => {
      process.env.VERCEL_ENV = "preview";

      const { GET } = await import("../trial-nurturing/route");

      const request = new NextRequest(
        new URL("http://localhost:3000/api/cron/trial-nurturing"),
        {
          method: "GET",
          headers: {
            authorization: "Bearer test-secret",
          },
        },
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.skipped).toBe(true);
      expect(data.reason).toBe("Not production environment");
    });
  });
});
