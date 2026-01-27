import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  cleanupExpiredTrialSessions,
  cleanupNurturingTrialSessions,
} from "../trial-cleanup";

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    trialSession: {
      count: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
  },
}));

import { prisma } from "@/lib/db";

describe("cleanupExpiredTrialSessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes sessions older than 30 days without email", async () => {
    (prisma.trialSession.count as any).mockResolvedValue(5);
    (prisma.trialSession.deleteMany as any).mockResolvedValue({ count: 10 });

    const result = await cleanupExpiredTrialSessions();

    expect(result.deletedCount).toBe(10);
    expect(result.skippedWithEmail).toBe(5);
    expect(result.cutoffDate).toBeInstanceOf(Date);
    expect(prisma.trialSession.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          email: null,
          createdAt: expect.objectContaining({
            lt: expect.any(Date),
          }),
        }),
      }),
    );
  });

  it("preserves sessions with collected emails", async () => {
    (prisma.trialSession.count as any).mockResolvedValue(3);
    (prisma.trialSession.deleteMany as any).mockResolvedValue({ count: 0 });

    const result = await cleanupExpiredTrialSessions();

    expect(result.skippedWithEmail).toBe(3);
    // Verify email: null filter is used
    expect(prisma.trialSession.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          email: null,
        }),
      }),
    );
  });

  it("returns cleanup statistics with correct structure", async () => {
    (prisma.trialSession.count as any).mockResolvedValue(2);
    (prisma.trialSession.deleteMany as any).mockResolvedValue({ count: 8 });

    const result = await cleanupExpiredTrialSessions();

    expect(result).toHaveProperty("deletedCount");
    expect(result).toHaveProperty("skippedWithEmail");
    expect(result).toHaveProperty("cutoffDate");
    expect(typeof result.deletedCount).toBe("number");
    expect(typeof result.skippedWithEmail).toBe("number");
    expect(result.cutoffDate).toBeInstanceOf(Date);
  });

  it("calculates correct 30-day cutoff date", async () => {
    (prisma.trialSession.count as any).mockResolvedValue(0);
    (prisma.trialSession.deleteMany as any).mockResolvedValue({ count: 0 });

    const _beforeCall = new Date();
    const result = await cleanupExpiredTrialSessions();
    const _afterCall = new Date();

    // Cutoff should be approximately 30 days ago
    const expectedCutoff = new Date();
    expectedCutoff.setDate(expectedCutoff.getDate() - 30);

    // Allow 1 second tolerance for test execution time
    const diff = Math.abs(
      result.cutoffDate.getTime() - expectedCutoff.getTime(),
    );
    expect(diff).toBeLessThan(1000);
  });
});

describe("cleanupNurturingTrialSessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("anonymizes sessions with email older than 90 days", async () => {
    (prisma.trialSession.updateMany as any).mockResolvedValue({ count: 5 });

    const result = await cleanupNurturingTrialSessions();

    expect(result.skippedWithEmail).toBe(5);
    expect(result.deletedCount).toBe(0);
    expect(prisma.trialSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          email: { not: null },
          createdAt: expect.objectContaining({
            lt: expect.any(Date),
          }),
        }),
        data: {
          email: null,
          emailCollectedAt: null,
        },
      }),
    );
  });

  it("calculates correct 90-day cutoff date", async () => {
    (prisma.trialSession.updateMany as any).mockResolvedValue({ count: 0 });

    const result = await cleanupNurturingTrialSessions();

    // Cutoff should be approximately 90 days ago
    const expectedCutoff = new Date();
    expectedCutoff.setDate(expectedCutoff.getDate() - 90);

    // Allow 1 second tolerance for test execution time
    const diff = Math.abs(
      result.cutoffDate.getTime() - expectedCutoff.getTime(),
    );
    expect(diff).toBeLessThan(1000);
  });
});
