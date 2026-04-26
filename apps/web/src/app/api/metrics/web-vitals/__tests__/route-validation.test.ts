/**
 * Unit tests for Web Vitals API Endpoint Validation (F-05)
 * Tests invalid payloads, missing fields, and error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { POST } from "../route";
import { NextRequest } from "next/server";

// Mock logger with child method for rate-limit.ts
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe("POST /api/metrics/web-vitals - Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GRAFANA_CLOUD_PROMETHEUS_URL =
      "https://prometheus.grafana.com/api/v1/write";
    process.env.GRAFANA_CLOUD_PROMETHEUS_USER = "test-user";
    process.env.GRAFANA_CLOUD_API_KEY = "test-api-key";
  });

  afterEach(() => {
    delete process.env.GRAFANA_CLOUD_PROMETHEUS_URL;
    delete process.env.GRAFANA_CLOUD_PROMETHEUS_USER;
    delete process.env.GRAFANA_CLOUD_API_KEY;
  });

  describe("Invalid Payload Rejection", () => {
    it("should reject non-object payload", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/metrics/web-vitals",
        {
          method: "POST",
          body: JSON.stringify("invalid"),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("error");
    });

    it("should reject payload without metrics array", async () => {
      const payload = {
        something: "else",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/metrics/web-vitals",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should reject metric with invalid name", async () => {
      const payload = {
        metrics: [
          {
            name: "INVALID_METRIC",
            value: 2500,
            rating: "good",
            route: "/dashboard",
            deviceType: "desktop",
          },
        ],
      };

      const request = new NextRequest(
        "http://localhost:3000/api/metrics/web-vitals",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should reject metric with invalid rating", async () => {
      const payload = {
        metrics: [
          {
            name: "LCP",
            value: 2500,
            rating: "invalid-rating",
            route: "/dashboard",
            deviceType: "desktop",
          },
        ],
      };

      const request = new NextRequest(
        "http://localhost:3000/api/metrics/web-vitals",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should reject metric with invalid device type", async () => {
      const payload = {
        metrics: [
          {
            name: "LCP",
            value: 2500,
            rating: "good",
            route: "/dashboard",
            deviceType: "invalid-device",
          },
        ],
      };

      const request = new NextRequest(
        "http://localhost:3000/api/metrics/web-vitals",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should reject metric with non-number value", async () => {
      const payload = {
        metrics: [
          {
            name: "LCP",
            value: "not-a-number",
            rating: "good",
            route: "/dashboard",
            deviceType: "desktop",
          },
        ],
      };

      const request = new NextRequest(
        "http://localhost:3000/api/metrics/web-vitals",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe("Error Handling", () => {
    it("should return 400 for invalid JSON", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/metrics/web-vitals",
        {
          method: "POST",
          body: "invalid json {",
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it("should not expose internal error details to client", async () => {
      const payload = {
        metrics: [
          {
            name: "LCP",
            value: 2500,
            rating: "good",
            route: "/dashboard",
            deviceType: "desktop",
          },
        ],
      };

      const request = new NextRequest(
        "http://localhost:3000/api/metrics/web-vitals",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );

      (global.fetch as any).mockRejectedValueOnce(
        new Error("Sensitive error details"),
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to process metrics");
      expect(data.error).not.toContain("Sensitive error details");
    });

    it("should handle Grafana push failure gracefully", async () => {
      const payload = {
        metrics: [
          {
            name: "LCP",
            value: 2500,
            rating: "good",
            route: "/dashboard",
            deviceType: "desktop",
          },
        ],
      };

      const request = new NextRequest(
        "http://localhost:3000/api/metrics/web-vitals",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(await response.json()).toHaveProperty("error");
    });

    it("should handle missing Grafana configuration", async () => {
      delete process.env.GRAFANA_CLOUD_PROMETHEUS_URL;

      const payload = {
        metrics: [
          {
            name: "LCP",
            value: 2500,
            rating: "good",
            route: "/dashboard",
            deviceType: "desktop",
          },
        ],
      };

      const request = new NextRequest(
        "http://localhost:3000/api/metrics/web-vitals",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });
});
