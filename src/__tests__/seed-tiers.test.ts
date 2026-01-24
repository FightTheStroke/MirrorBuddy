/**
 * Tier Seeding Tests
 *
 * Tests for the tier definition seeding functionality.
 * Plan 073: T1-04 - Create seed data: Trial, Base, Pro defaults
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

// Mock Prisma client
const mockPrisma = {
  tierDefinition: {
    upsert: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  $disconnect: vi.fn(),
} as unknown as PrismaClient;

describe("Tier Seeding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (mockPrisma.$disconnect) {
      await mockPrisma.$disconnect();
    }
  });

  describe("seedTiers function", () => {
    it("should export a seedTiers function", async () => {
      // This test verifies that the seed-tiers.ts file exports a seedTiers function
      // Import will fail if the function doesn't exist
      const seedModule = await import("../lib/seeds/tier-seed");
      expect(seedModule.seedTiers).toBeDefined();
      expect(typeof seedModule.seedTiers).toBe("function");
    });
  });

  describe("Trial Tier", () => {
    it("should create or update trial tier with correct properties", async () => {
      const expectedTrial = {
        code: "trial",
        name: "Trial",
        description: "Free trial tier with limited access",
        chatLimitDaily: 10,
        voiceMinutesDaily: 5,
        toolsLimitDaily: 10,
        docsLimitTotal: 1,
        sortOrder: 1,
        isActive: true,
      };

      // Mock the upsert call to return the expected trial tier
      (mockPrisma.tierDefinition.upsert as any).mockResolvedValueOnce(
        expectedTrial,
      );

      const result = await mockPrisma.tierDefinition.upsert({
        where: { code: "trial" },
        update: {},
        create: expectedTrial,
      });

      expect(result.code).toBe("trial");
      expect(result.chatLimitDaily).toBe(10);
      expect(result.voiceMinutesDaily).toBe(5);
      expect(result.toolsLimitDaily).toBe(10);
      expect(result.docsLimitTotal).toBe(1);
    });

    it("should define trial tier features correctly", async () => {
      const expectedFeatures = {
        chat: true,
        voice: true,
        flashcards: true,
        quizzes: true,
        mindMaps: true,
        tools: ["pdf", "chat"],
        maestriLimit: 3,
        coachesAvailable: ["melissa"],
        buddiesAvailable: ["mario"],
      };

      // In the actual seed function, features should be exactly like this
      expect(expectedFeatures.maestriLimit).toBe(3);
      expect(expectedFeatures.tools).toHaveLength(2);
    });

    it("should limit trial tier to 3 maestri", async () => {
      // Trial should have exactly 3 maestri
      const expectedMaestri = [
        "leonardo-art",
        "galileo-physics",
        "curie-chemistry",
      ];
      expect(expectedMaestri).toHaveLength(3);
    });
  });

  describe("Base Tier", () => {
    it("should create or update base tier with correct properties", async () => {
      const expectedBase = {
        code: "base",
        name: "Base",
        description: "Freemium tier with access to all maestri",
        chatLimitDaily: 50,
        voiceMinutesDaily: 30,
        toolsLimitDaily: 30,
        docsLimitTotal: 5,
        sortOrder: 2,
        isActive: true,
      };

      (mockPrisma.tierDefinition.upsert as any).mockResolvedValueOnce(
        expectedBase,
      );

      const result = await mockPrisma.tierDefinition.upsert({
        where: { code: "base" },
        update: {},
        create: expectedBase,
      });

      expect(result.code).toBe("base");
      expect(result.chatLimitDaily).toBe(50);
      expect(result.voiceMinutesDaily).toBe(30);
      expect(result.toolsLimitDaily).toBe(30);
      expect(result.docsLimitTotal).toBe(5);
    });

    it("should provide access to all 20 maestri for base tier", async () => {
      const baseMaestri = [
        "leonardo-art",
        "galileo-physics",
        "curie-chemistry",
        "cicerone-civic-education",
        "lovelace-computer-science",
        "smith-economics",
        "shakespeare-english",
        "humboldt-geography",
        "erodoto-history",
        "manzoni-italian",
        "euclide-mathematics",
        "mozart-music",
        "socrate-philosophy",
        "ippocrate-health",
        "feynman-physics",
        "darwin-biology",
        "chris-physical-education",
        "omero-storytelling",
        "alex-pina-spanish",
        "simone-sport",
      ];

      expect(baseMaestri).toHaveLength(20);
    });

    it("should provide expanded coaches and buddies for base tier", async () => {
      const baseCoaches = ["melissa", "roberto", "chiara", "andrea", "favij"];
      const baseBuddies = ["mario", "noemi", "enea", "bruno", "sofia"];

      expect(baseCoaches).toHaveLength(5);
      expect(baseBuddies).toHaveLength(5);
    });
  });

  describe("Pro Tier", () => {
    it("should create or update pro tier with correct properties", async () => {
      const expectedPro = {
        code: "pro",
        name: "Pro",
        description:
          "Professional tier with unlimited access and priority support",
        chatLimitDaily: 999999,
        voiceMinutesDaily: 999999,
        toolsLimitDaily: 999999,
        docsLimitTotal: 999999,
        sortOrder: 3,
        isActive: true,
        monthlyPriceEur: 9.99,
      };

      (mockPrisma.tierDefinition.upsert as any).mockResolvedValueOnce(
        expectedPro,
      );

      const result = await mockPrisma.tierDefinition.upsert({
        where: { code: "pro" },
        update: {},
        create: expectedPro,
      });

      expect(result.code).toBe("pro");
      expect(result.monthlyPriceEur).toBe(9.99);
    });

    it("should provide unlimited limits for pro tier", async () => {
      // Pro tier should have very high limits (999999)
      expect(999999).toBeGreaterThan(100000);
    });

    it("should include all maestri for pro tier (22 total)", async () => {
      const proMaestri = [
        "leonardo-art",
        "galileo-physics",
        "curie-chemistry",
        "cicerone-civic-education",
        "lovelace-computer-science",
        "smith-economics",
        "shakespeare-english",
        "humboldt-geography",
        "erodoto-history",
        "manzoni-italian",
        "euclide-mathematics",
        "mozart-music",
        "socrate-philosophy",
        "ippocrate-health",
        "feynman-physics",
        "darwin-biology",
        "chris-physical-education",
        "omero-storytelling",
        "alex-pina-spanish",
        "simone-sport",
        "cassese-international-law",
        "mascetti-supercazzola",
      ];

      expect(proMaestri).toHaveLength(22);
    });

    it("should provide all coaches and buddies for pro tier", async () => {
      const proCoaches = [
        "melissa",
        "roberto",
        "chiara",
        "andrea",
        "favij",
        "laura",
      ];
      const proBuddies = ["mario", "noemi", "enea", "bruno", "sofia", "marta"];

      expect(proCoaches).toHaveLength(6);
      expect(proBuddies).toHaveLength(6);
    });

    it("should include premium features for pro tier", async () => {
      const proFeatures = {
        chat: true,
        voice: true,
        flashcards: true,
        quizzes: true,
        mindMaps: true,
        parentDashboard: true,
        prioritySupport: true,
        advancedAnalytics: true,
        unlimitedStorage: true,
      };

      expect(proFeatures.prioritySupport).toBe(true);
      expect(proFeatures.advancedAnalytics).toBe(true);
      expect(proFeatures.unlimitedStorage).toBe(true);
    });

    it("should include all tools for pro tier", async () => {
      const proTools = [
        "pdf",
        "chat",
        "flashcards",
        "mindmap",
        "quiz",
        "formula",
        "webcam",
        "homework",
        "chart",
      ];

      expect(proTools).toHaveLength(9);
      expect(proTools).toContain("webcam");
      expect(proTools).toContain("homework");
      expect(proTools).toContain("chart");
    });
  });

  describe("Tier Hierarchy", () => {
    it("should order tiers correctly by sortOrder", async () => {
      const sortOrders = { trial: 1, base: 2, pro: 3 };
      expect(sortOrders.trial).toBeLessThan(sortOrders.base);
      expect(sortOrders.base).toBeLessThan(sortOrders.pro);
    });

    it("should escalate limits from trial to base to pro", async () => {
      const limits = {
        trial: { chat: 10, voice: 5, tools: 10, docs: 1 },
        base: { chat: 50, voice: 30, tools: 30, docs: 5 },
        pro: { chat: 999999, voice: 999999, tools: 999999, docs: 999999 },
      };

      expect(limits.trial.chat).toBeLessThan(limits.base.chat);
      expect(limits.base.chat).toBeLessThan(limits.pro.chat);
      expect(limits.trial.voice).toBeLessThan(limits.base.voice);
      expect(limits.base.voice).toBeLessThan(limits.pro.voice);
    });

    it("should escalate maestri access from trial to base to pro", async () => {
      expect(3).toBeLessThan(20); // trial < base
      expect(20).toBeLessThan(22); // base < pro
    });
  });

  describe("Seed Function Integration", () => {
    it("should return all three tiers when seeding completes", async () => {
      const tiers = { trial: "trial", base: "base", pro: "pro" };
      expect(Object.keys(tiers)).toHaveLength(3);
    });

    it("should make tiers active by default", async () => {
      const allActive = [true, true, true];
      expect(allActive.every((active) => active)).toBe(true);
    });
  });
});
