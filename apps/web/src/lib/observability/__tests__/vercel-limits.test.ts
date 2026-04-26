/**
 * Unit tests for Vercel Limits API
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getVercelLimits,
  clearVercelLimitsCache,
  type VercelLimits,
} from "../vercel-limits";
import * as apiClient from "../vercel-api-client";

describe("Vercel Limits API", () => {
  beforeEach(() => {
    clearVercelLimitsCache();
    vi.resetAllMocks();
  });

  it("returns error when VERCEL_TOKEN is missing", async () => {
    const originalToken = process.env.VERCEL_TOKEN;
    delete process.env.VERCEL_TOKEN;

    const limits = await getVercelLimits();

    expect(limits.error).toBe("VERCEL_TOKEN not configured");
    expect(limits.bandwidth.used).toBe(0);
    expect(limits.bandwidth.limit).toBe(0);

    process.env.VERCEL_TOKEN = originalToken;
  });

  it("returns typed VercelLimits interface", async () => {
    const limits: VercelLimits = await getVercelLimits();

    expect(limits).toHaveProperty("bandwidth");
    expect(limits).toHaveProperty("builds");
    expect(limits).toHaveProperty("functions");
    expect(limits).toHaveProperty("timestamp");

    expect(limits.bandwidth).toHaveProperty("used");
    expect(limits.bandwidth).toHaveProperty("limit");
    expect(limits.bandwidth).toHaveProperty("percent");

    expect(typeof limits.bandwidth.used).toBe("number");
    expect(typeof limits.bandwidth.limit).toBe("number");
    expect(typeof limits.bandwidth.percent).toBe("number");
  });

  it("caches results for 5 minutes", async () => {
    const originalToken = process.env.VERCEL_TOKEN;
    const originalProjectId = process.env.VERCEL_PROJECT_ID;

    process.env.VERCEL_TOKEN = "test-token";
    process.env.VERCEL_PROJECT_ID = "prj_test";

    const mockQueryProjectUsage = vi.spyOn(apiClient, "queryProjectUsage");
    const mockGetDefaultLimits = vi.spyOn(apiClient, "getDefaultLimits");

    mockQueryProjectUsage.mockResolvedValue({
      bandwidth: { used: 1000 },
      builds: { used: 50 },
      functions: { used: 10000 },
    });

    mockGetDefaultLimits.mockReturnValue({
      bandwidth: 100 * 1024 * 1024 * 1024,
      builds: 6000,
      functions: 1000000,
    });

    // First call - should fetch
    const limits1 = await getVercelLimits();
    expect(mockQueryProjectUsage).toHaveBeenCalledTimes(1);

    // Second call - should use cache
    const limits2 = await getVercelLimits();
    expect(mockQueryProjectUsage).toHaveBeenCalledTimes(1); // Still 1, no new call

    // Results should be identical
    expect(limits1.timestamp).toBe(limits2.timestamp);

    process.env.VERCEL_TOKEN = originalToken;
    process.env.VERCEL_PROJECT_ID = originalProjectId;
  });

  it("calculates percentages correctly", async () => {
    const originalToken = process.env.VERCEL_TOKEN;
    const originalProjectId = process.env.VERCEL_PROJECT_ID;

    process.env.VERCEL_TOKEN = "test-token";
    process.env.VERCEL_PROJECT_ID = "prj_test";

    const mockQueryProjectUsage = vi.spyOn(apiClient, "queryProjectUsage");
    const mockGetDefaultLimits = vi.spyOn(apiClient, "getDefaultLimits");

    mockQueryProjectUsage.mockResolvedValue({
      bandwidth: { used: 50 * 1024 * 1024 * 1024 }, // 50 GB
      builds: { used: 3000 }, // 3000 minutes
      functions: { used: 500000 }, // 500K
    });

    mockGetDefaultLimits.mockReturnValue({
      bandwidth: 100 * 1024 * 1024 * 1024, // 100 GB
      builds: 6000, // 6000 minutes
      functions: 1000000, // 1M
    });

    const limits = await getVercelLimits();

    // 50 GB / 100 GB = 50%
    expect(limits.bandwidth.percent).toBeCloseTo(50, 1);

    // 3000 / 6000 = 50%
    expect(limits.builds.percent).toBeCloseTo(50, 1);

    // 500K / 1M = 50%
    expect(limits.functions.percent).toBeCloseTo(50, 1);

    process.env.VERCEL_TOKEN = originalToken;
    process.env.VERCEL_PROJECT_ID = originalProjectId;
  });

  it("handles API errors gracefully", async () => {
    const originalToken = process.env.VERCEL_TOKEN;
    const originalProjectId = process.env.VERCEL_PROJECT_ID;

    process.env.VERCEL_TOKEN = "test-token";
    process.env.VERCEL_PROJECT_ID = "prj_test";

    const mockQueryProjectUsage = vi.spyOn(apiClient, "queryProjectUsage");

    mockQueryProjectUsage.mockRejectedValue(
      new Error("Vercel API error: 401 Unauthorized"),
    );

    const limits = await getVercelLimits();

    expect(limits.error).toBeDefined();
    expect(limits.bandwidth.used).toBe(0);

    process.env.VERCEL_TOKEN = originalToken;
    process.env.VERCEL_PROJECT_ID = originalProjectId;
  });

  it("clears cache when clearVercelLimitsCache is called", async () => {
    const originalToken = process.env.VERCEL_TOKEN;
    const originalProjectId = process.env.VERCEL_PROJECT_ID;

    process.env.VERCEL_TOKEN = "test-token";
    process.env.VERCEL_PROJECT_ID = "prj_test";

    const mockQueryProjectUsage = vi.spyOn(apiClient, "queryProjectUsage");
    const mockGetDefaultLimits = vi.spyOn(apiClient, "getDefaultLimits");

    mockQueryProjectUsage.mockResolvedValue({
      bandwidth: { used: 1000 },
      builds: { used: 50 },
      functions: { used: 10000 },
    });

    mockGetDefaultLimits.mockReturnValue({
      bandwidth: 100 * 1024 * 1024 * 1024,
      builds: 6000,
      functions: 1000000,
    });

    // First call
    await getVercelLimits();
    expect(mockQueryProjectUsage).toHaveBeenCalledTimes(1);

    // Clear cache
    clearVercelLimitsCache();

    // Second call - should fetch again
    await getVercelLimits();
    expect(mockQueryProjectUsage).toHaveBeenCalledTimes(2);

    process.env.VERCEL_TOKEN = originalToken;
    process.env.VERCEL_PROJECT_ID = originalProjectId;
  });
});
