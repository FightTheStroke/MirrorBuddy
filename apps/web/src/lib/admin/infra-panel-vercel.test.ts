/**
 * Tests for Vercel Metrics Provider
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getVercelMetrics } from "./infra-panel-vercel";

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

describe("getVercelMetrics", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return null when Vercel is not configured", async () => {
    delete process.env.VERCEL_TOKEN;

    const result = await getVercelMetrics();

    expect(result).toBeNull();
  });

  it("should return null when API call fails", async () => {
    process.env.VERCEL_TOKEN = "test-token";

    global.fetch = vi.fn().mockRejectedValue(new Error("API error"));

    const result = await getVercelMetrics();

    expect(result).toBeNull();
  });

  it("should return null when API returns non-ok response", async () => {
    process.env.VERCEL_TOKEN = "test-token";

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
    });

    const result = await getVercelMetrics();

    expect(result).toBeNull();
  });

  it("should return real data when Vercel is configured and API succeeds", async () => {
    process.env.VERCEL_TOKEN = "test-token";

    const mockDeployments = [
      {
        uid: "dpl_123",
        state: "READY",
        createdAt: Date.now(),
        url: "test.vercel.app",
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ deployments: mockDeployments }),
    });

    const result = await getVercelMetrics();

    expect(result).not.toBeNull();
    expect(result?.deployments).toHaveLength(1);
    expect(result?.deployments[0].id).toBe("dpl_123");
  });
});
