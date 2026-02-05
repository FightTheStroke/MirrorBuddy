/**
 * Tests for Supabase Metrics Provider
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSupabaseMetrics } from "./infra-panel-supabase";
import { prisma } from "@/lib/db";

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

vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

describe("getSupabaseMetrics", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should return null when database query fails", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(
      new Error("Database connection error"),
    );

    const result = await getSupabaseMetrics();

    expect(result).toBeNull();
  });

  it("should return real data when database queries succeed", async () => {
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([{ size: BigInt(52428800) }]) // Database size
      .mockResolvedValueOnce([{ count: BigInt(5) }]) // Connections
      .mockResolvedValueOnce([{ total: BigInt(1000) }]); // Row count

    const result = await getSupabaseMetrics();

    expect(result).not.toBeNull();
    expect(result?.databaseSize).toBe(52428800);
    expect(result?.connections).toBe(5);
    expect(result?.rowCount).toBe(1000);
    expect(result?.status).toBe("healthy");
  });

  it("should mark status as degraded when connections are high", async () => {
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([{ size: BigInt(52428800) }])
      .mockResolvedValueOnce([{ count: BigInt(55) }]) // High connections
      .mockResolvedValueOnce([{ total: BigInt(1000) }]);

    const result = await getSupabaseMetrics();

    expect(result).not.toBeNull();
    expect(result?.status).toBe("degraded");
  });
});
