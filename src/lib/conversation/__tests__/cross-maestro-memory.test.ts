/**
 * Cross-Maestro Memory Tests
 *
 * Tests for sharing learned concepts across different maestros (Pro tier feature)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadCrossMaestroLearnings } from "../cross-maestro-memory";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    conversation: {
      findMany: vi.fn(),
    },
  },
}));

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

vi.mock("@/lib/tier/tier-service", () => ({
  tierService: {
    getEffectiveTier: vi.fn(),
  },
}));

vi.mock("../tier-memory-config", () => ({
  getTierMemoryLimits: vi.fn(),
}));

vi.mock("@/data/maestri", () => ({
  getMaestroById: vi.fn(),
}));

import { prisma } from "@/lib/db";
import { tierService } from "@/lib/tier";
import { getTierMemoryLimits } from "../tier-memory-config";
import { getMaestroById } from "@/data/maestri";

describe("loadCrossMaestroLearnings", () => {
  const testUserId = "test-user-cross-maestro";
  const currentMaestroId = "euclide";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty array for non-existent user", async () => {
    // Mock trial tier for non-existent user
    vi.mocked(tierService.getEffectiveTier).mockResolvedValue({
      code: "trial",
    } as any);

    vi.mocked(getTierMemoryLimits).mockReturnValue({
      crossMaestroEnabled: false,
    } as any);

    const result = await loadCrossMaestroLearnings(
      "non-existent-user",
      currentMaestroId,
    );

    expect(result).toEqual([]);
  });

  it("should return empty array for trial tier users", async () => {
    // Mock trial tier
    vi.mocked(tierService.getEffectiveTier).mockResolvedValue({
      code: "trial",
    } as any);

    vi.mocked(getTierMemoryLimits).mockReturnValue({
      crossMaestroEnabled: false,
    } as any);

    const result = await loadCrossMaestroLearnings(
      testUserId,
      currentMaestroId,
    );

    expect(result).toEqual([]);
  });

  it("should return empty array for base tier users", async () => {
    // Mock base tier
    vi.mocked(tierService.getEffectiveTier).mockResolvedValue({
      code: "base",
    } as any);

    vi.mocked(getTierMemoryLimits).mockReturnValue({
      crossMaestroEnabled: false,
    } as any);

    const result = await loadCrossMaestroLearnings(
      testUserId,
      currentMaestroId,
    );

    expect(result).toEqual([]);
  });

  it("should return learnings from other maestros for Pro tier users", async () => {
    // Mock Pro tier
    vi.mocked(tierService.getEffectiveTier).mockResolvedValue({
      code: "pro",
    } as any);

    vi.mocked(getTierMemoryLimits).mockReturnValue({
      crossMaestroEnabled: true,
    } as any);

    // Mock conversations data
    const galileoDate = new Date("2024-01-15");
    const curieDate = new Date("2024-01-20");

    vi.mocked(prisma.conversation.findMany).mockResolvedValue([
      {
        maestroId: "curie",
        keyFacts: JSON.stringify({
          decisions: [],
          preferences: [],
          learned: [
            "Chemical bonds form between atoms",
            "Periodic table organization",
          ],
        }),
        updatedAt: curieDate,
      },
      {
        maestroId: "galileo",
        keyFacts: JSON.stringify({
          decisions: [],
          preferences: [],
          learned: [
            "Newton's laws of motion",
            "Gravity acceleration is 9.8 m/s²",
          ],
        }),
        updatedAt: galileoDate,
      },
    ] as any);

    // Mock maestro lookups
    vi.mocked(getMaestroById).mockImplementation((id: string) => {
      if (id === "curie") {
        return { displayName: "Marie Curie", subject: "chemistry" } as any;
      }
      if (id === "galileo") {
        return { displayName: "Galileo Galilei", subject: "physics" } as any;
      }
      return undefined;
    });

    const result = await loadCrossMaestroLearnings(
      testUserId,
      currentMaestroId,
    );

    expect(result).toHaveLength(2);

    // Should be sorted by date (most recent first)
    expect(result[0].maestroId).toBe("curie");
    expect(result[0].subject).toBe("chemistry");
    expect(result[0].learnings).toHaveLength(2);
    expect(result[0].learnings).toContain("Chemical bonds form between atoms");
    expect(result[0].date).toEqual(curieDate);

    expect(result[1].maestroId).toBe("galileo");
    expect(result[1].subject).toBe("physics");
    expect(result[1].learnings).toHaveLength(2);
    expect(result[1].learnings).toContain("Newton's laws of motion");
  });

  it("should exclude current maestro from results", async () => {
    // Mock Pro tier
    vi.mocked(tierService.getEffectiveTier).mockResolvedValue({
      code: "pro",
    } as any);

    vi.mocked(getTierMemoryLimits).mockReturnValue({
      crossMaestroEnabled: true,
    } as any);

    // Mock only non-current maestro conversations
    // The query already filters out currentMaestroId via WHERE maestroId != currentMaestroId
    vi.mocked(prisma.conversation.findMany).mockResolvedValue([
      {
        maestroId: "galileo",
        keyFacts: JSON.stringify({
          decisions: [],
          preferences: [],
          learned: ["Newton's laws"],
        }),
        updatedAt: new Date(),
      },
    ] as any);

    vi.mocked(getMaestroById).mockImplementation((id: string) => {
      if (id === "galileo") {
        return { displayName: "Galileo", subject: "physics" } as any;
      }
      return undefined;
    });

    const result = await loadCrossMaestroLearnings(
      testUserId,
      currentMaestroId,
    );

    expect(result).toHaveLength(1);
    expect(result[0].maestroId).toBe("galileo");
    expect(result[0].maestroId).not.toBe(currentMaestroId);

    // Verify prisma was called with correct filter
    expect(prisma.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          maestroId: { not: currentMaestroId },
        }),
      }),
    );
  });

  it("should filter by subject when option provided", async () => {
    // Mock Pro tier
    vi.mocked(tierService.getEffectiveTier).mockResolvedValue({
      code: "pro",
    } as any);

    vi.mocked(getTierMemoryLimits).mockReturnValue({
      crossMaestroEnabled: true,
    } as any);

    // Mock conversations with different subjects
    vi.mocked(prisma.conversation.findMany).mockResolvedValue([
      {
        maestroId: "galileo",
        keyFacts: JSON.stringify({ learned: ["Physics concept"] }),
        updatedAt: new Date(),
      },
      {
        maestroId: "curie",
        keyFacts: JSON.stringify({ learned: ["Chemistry concept"] }),
        updatedAt: new Date(),
      },
      {
        maestroId: "manzoni",
        keyFacts: JSON.stringify({ learned: ["Italian concept"] }),
        updatedAt: new Date(),
      },
    ] as any);

    vi.mocked(getMaestroById).mockImplementation((id: string) => {
      if (id === "galileo")
        return { displayName: "Galileo", subject: "physics" } as any;
      if (id === "curie")
        return { displayName: "Curie", subject: "chemistry" } as any;
      if (id === "manzoni")
        return { displayName: "Manzoni", subject: "italian" } as any;
      return undefined;
    });

    const result = await loadCrossMaestroLearnings(
      testUserId,
      currentMaestroId,
      { subjects: ["physics", "chemistry"] },
    );

    expect(result).toHaveLength(2);
    const subjects = result.map((r) => r.subject);
    expect(subjects).toContain("physics");
    expect(subjects).toContain("chemistry");
    expect(subjects).not.toContain("italian");
  });

  it("should respect limit option", async () => {
    // Mock Pro tier
    vi.mocked(tierService.getEffectiveTier).mockResolvedValue({
      code: "pro",
    } as any);

    vi.mocked(getTierMemoryLimits).mockReturnValue({
      crossMaestroEnabled: true,
    } as any);

    // Mock 5 conversations, but limit should return only 3
    const maestros = ["galileo", "curie", "manzoni"];

    vi.mocked(prisma.conversation.findMany).mockResolvedValue(
      maestros.map((id, i) => ({
        maestroId: id,
        keyFacts: JSON.stringify({ learned: [`Concept from ${id}`] }),
        updatedAt: new Date(Date.now() - i * 1000),
      })) as any,
    );

    vi.mocked(getMaestroById).mockImplementation((id: string) => {
      return { displayName: id, subject: "subject" } as any;
    });

    const result = await loadCrossMaestroLearnings(
      testUserId,
      currentMaestroId,
      { limit: 3 },
    );

    expect(result).toHaveLength(3);

    // Verify prisma was called with limit
    expect(prisma.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 3,
      }),
    );
  });

  it("should handle conversations without learnings gracefully", async () => {
    // Mock Pro tier
    vi.mocked(tierService.getEffectiveTier).mockResolvedValue({
      code: "pro",
    } as any);

    vi.mocked(getTierMemoryLimits).mockReturnValue({
      crossMaestroEnabled: true,
    } as any);

    // Mock conversations: one with empty learnings, one with null keyFacts
    vi.mocked(prisma.conversation.findMany).mockResolvedValue([
      {
        maestroId: "galileo",
        keyFacts: JSON.stringify({
          decisions: ["Some decision"],
          preferences: ["Some preference"],
          learned: [], // Empty learnings
        }),
        updatedAt: new Date(),
      },
      {
        maestroId: "curie",
        keyFacts: null, // Null keyFacts
        updatedAt: new Date(),
      },
    ] as any);

    vi.mocked(getMaestroById).mockImplementation((id: string) => {
      if (id === "galileo")
        return { displayName: "Galileo", subject: "physics" } as any;
      if (id === "curie")
        return { displayName: "Curie", subject: "chemistry" } as any;
      return undefined;
    });

    const result = await loadCrossMaestroLearnings(
      testUserId,
      currentMaestroId,
    );

    // Should return empty array as no actual learnings found
    expect(result).toEqual([]);
  });
});
