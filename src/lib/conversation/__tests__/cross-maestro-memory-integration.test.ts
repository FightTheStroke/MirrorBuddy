/**
 * Cross-Maestro Memory Integration Tests
 *
 * Tests for the interaction between cross-maestro memory, settings, and prompt enhancement.
 * Covers end-to-end flows and error recovery scenarios.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  loadCrossMaestroLearnings,
  type CrossMaestroLearning,
} from "../cross-maestro-memory";
import { enhanceSystemPrompt } from "../prompt-enhancer";
import type { ConversationMemory } from "../memory-loader";
import type { TierMemoryLimits } from "../tier-memory-config";

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
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
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

vi.mock("@/lib/safety/safety-prompts", () => ({
  injectSafetyGuardrails: vi.fn((prompt, _options) => `[SAFE] ${prompt}`),
}));

import { prisma } from "@/lib/db";
import { tierService } from "@/lib/tier/tier-service";
import { getTierMemoryLimits } from "../tier-memory-config";
import { getMaestroById } from "@/data/maestri";

describe("Cross-Maestro Memory Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("End-to-end flow: settings -> memory loading -> prompt enhancement", () => {
    it("should complete full flow for Pro tier user with crossMaestroEnabled=true", async () => {
      const userId = "pro-user";
      const currentMaestroId = "euclide-matematica";
      const basePrompt = "Sei Euclide, insegnante di matematica.";

      // 1. Setup: Pro tier user
      vi.mocked(tierService.getEffectiveTier).mockResolvedValue({
        code: "pro",
      } as any);

      vi.mocked(getTierMemoryLimits).mockReturnValue({
        recentConversations: 5,
        timeWindowDays: null,
        maxKeyFacts: 50,
        maxTopics: 30,
        semanticEnabled: true,
        crossMaestroEnabled: true,
      } as any);

      // 2. Mock cross-maestro learnings
      vi.mocked(prisma.conversation.findMany).mockResolvedValue([
        {
          maestroId: "galileo-fisica",
          keyFacts: JSON.stringify({
            decisions: [],
            preferences: [],
            learned: ["Leggi del moto", "Gravitazione"],
          }),
          updatedAt: new Date("2026-01-20"),
        },
      ] as any);

      vi.mocked(getMaestroById).mockImplementation((id: string) => {
        if (id === "galileo-fisica") {
          return { displayName: "Galileo", subject: "physics" } as any;
        }
        return undefined;
      });

      // 3. Load cross-maestro learnings
      const learnings = await loadCrossMaestroLearnings(
        userId,
        currentMaestroId,
      );
      expect(learnings).toHaveLength(1);
      expect(learnings[0].maestroName).toBe("Galileo");

      // 4. Enhance prompt with cross-maestro context
      const proLimits = getTierMemoryLimits("pro");
      const memory: ConversationMemory = {
        recentSummary: null,
        keyFacts: [],
        topics: [],
        lastSessionDate: null,
      };

      const enhancedPrompt = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions: { role: "maestro" },
        tierLimits: proLimits,
        crossMaestroLearnings: learnings,
      });

      // 5. Verify prompt includes cross-maestro context
      expect(enhancedPrompt).toContain("## Conoscenze Interdisciplinari");
      expect(enhancedPrompt).toContain("Galileo (physics)");
      expect(enhancedPrompt).toContain("Leggi del moto");
    });

    it("should skip cross-maestro when setting is disabled", async () => {
      const userId = "pro-user";
      const currentMaestroId = "euclide-matematica";

      // Even though user is Pro tier, if getTierMemoryLimits returns crossMaestroEnabled=false,
      // the feature should be disabled
      vi.mocked(tierService.getEffectiveTier).mockResolvedValue({
        code: "pro",
      } as any);

      // User has disabled cross-maestro in settings
      vi.mocked(getTierMemoryLimits).mockReturnValue({
        recentConversations: 5,
        timeWindowDays: null,
        maxKeyFacts: 50,
        maxTopics: 30,
        semanticEnabled: true,
        crossMaestroEnabled: false, // Feature disabled
      } as any);

      vi.mocked(prisma.conversation.findMany).mockResolvedValue([]);

      const result = await loadCrossMaestroLearnings(userId, currentMaestroId);
      expect(result).toEqual([]);

      // Verify DB wasn't queried because feature was disabled at tier level
      expect(prisma.conversation.findMany).not.toHaveBeenCalled();
    });
  });

  describe("Error recovery and graceful degradation", () => {
    it("should gracefully handle database errors when loading learnings", async () => {
      const userId = "pro-user";
      const currentMaestroId = "euclide-matematica";

      vi.mocked(tierService.getEffectiveTier).mockResolvedValue({
        code: "pro",
      } as any);

      vi.mocked(getTierMemoryLimits).mockReturnValue({
        recentConversations: 5,
        timeWindowDays: null,
        maxKeyFacts: 50,
        maxTopics: 30,
        semanticEnabled: true,
        crossMaestroEnabled: true,
      } as any);

      // Simulate database error
      vi.mocked(prisma.conversation.findMany).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const result = await loadCrossMaestroLearnings(userId, currentMaestroId);
      expect(result).toEqual([]); // Returns empty array on error
    });

    it("should continue with partial learnings when some maestros fail lookup", async () => {
      const userId = "pro-user";
      const currentMaestroId = "euclide-matematica";

      vi.mocked(tierService.getEffectiveTier).mockResolvedValue({
        code: "pro",
      } as any);

      vi.mocked(getTierMemoryLimits).mockReturnValue({
        recentConversations: 5,
        timeWindowDays: null,
        maxKeyFacts: 50,
        maxTopics: 30,
        semanticEnabled: true,
        crossMaestroEnabled: true,
      } as any);

      // Two conversations, but one maestro lookup fails
      vi.mocked(prisma.conversation.findMany).mockResolvedValue([
        {
          maestroId: "galileo-fisica",
          keyFacts: JSON.stringify({ learned: ["Physics concept"] }),
          updatedAt: new Date(),
        },
        {
          maestroId: "unknown-maestro",
          keyFacts: JSON.stringify({ learned: ["Unknown concept"] }),
          updatedAt: new Date(),
        },
      ] as any);

      vi.mocked(getMaestroById).mockImplementation((id: string) => {
        if (id === "galileo-fisica") {
          return { displayName: "Galileo", subject: "physics" } as any;
        }
        return undefined; // Unknown maestro
      });

      const result = await loadCrossMaestroLearnings(userId, currentMaestroId);

      // Should return only the successfully looked up maestro
      expect(result).toHaveLength(1);
      expect(result[0].maestroName).toBe("Galileo");
    });

    it("should handle prompt enhancement even when cross-maestro loading fails", async () => {
      const basePrompt = "Base prompt";
      const memory: ConversationMemory = {
        recentSummary: "Session summary",
        keyFacts: [],
        topics: [],
        lastSessionDate: null,
      };

      const proLimits: TierMemoryLimits = {
        recentConversations: 5,
        timeWindowDays: null,
        maxKeyFacts: 50,
        maxTopics: 30,
        semanticEnabled: true,
        crossMaestroEnabled: true,
      };

      // Simulate cross-maestro loading that returned empty due to error
      const crossMaestroLearnings: CrossMaestroLearning[] = [];

      // Should still enhance with regular memory
      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions: { role: "maestro" },
        tierLimits: proLimits,
        crossMaestroLearnings,
      });

      expect(result).toContain("Memoria delle Sessioni Precedenti");
      expect(result).not.toContain("Conoscenze Interdisciplinari");
    });
  });

  describe("Malformed data handling", () => {
    it("should skip conversations with unparseable keyFacts", async () => {
      const userId = "pro-user";
      const currentMaestroId = "euclide-matematica";

      vi.mocked(tierService.getEffectiveTier).mockResolvedValue({
        code: "pro",
      } as any);

      vi.mocked(getTierMemoryLimits).mockReturnValue({
        recentConversations: 5,
        timeWindowDays: null,
        maxKeyFacts: 50,
        maxTopics: 30,
        semanticEnabled: true,
        crossMaestroEnabled: true,
      } as any);

      // Mix of valid and invalid keyFacts
      vi.mocked(prisma.conversation.findMany).mockResolvedValue([
        {
          maestroId: "galileo-fisica",
          keyFacts: JSON.stringify({ learned: ["Valid learning"] }),
          updatedAt: new Date(),
        },
        {
          maestroId: "curie-chimica",
          keyFacts: "invalid json {{{", // Malformed JSON
          updatedAt: new Date(),
        },
        {
          maestroId: "euclide-matematica",
          keyFacts: null, // Null keyFacts
          updatedAt: new Date(),
        },
      ] as any);

      vi.mocked(getMaestroById).mockImplementation((id: string) => {
        const names: Record<string, string> = {
          "galileo-fisica": "Galileo",
          "curie-chimica": "Curie",
          "euclide-matematica": "Euclide",
        };
        if (names[id]) {
          return { displayName: names[id], subject: "subject" } as any;
        }
        return undefined;
      });

      const result = await loadCrossMaestroLearnings(userId, currentMaestroId);

      // Only valid conversation should be returned
      expect(result).toHaveLength(1);
      expect(result[0].maestroName).toBe("Galileo");
    });

    it("should filter out empty and whitespace-only learnings", async () => {
      const userId = "pro-user";
      const currentMaestroId = "euclide-matematica";

      vi.mocked(tierService.getEffectiveTier).mockResolvedValue({
        code: "pro",
      } as any);

      vi.mocked(getTierMemoryLimits).mockReturnValue({
        recentConversations: 5,
        timeWindowDays: null,
        maxKeyFacts: 50,
        maxTopics: 30,
        semanticEnabled: true,
        crossMaestroEnabled: true,
      } as any);

      vi.mocked(prisma.conversation.findMany).mockResolvedValue([
        {
          maestroId: "galileo-fisica",
          keyFacts: JSON.stringify({
            learned: ["Valid learning", "", "  ", null, "Another valid"],
          }),
          updatedAt: new Date(),
        },
      ] as any);

      vi.mocked(getMaestroById).mockImplementation((id: string) => {
        if (id === "galileo-fisica") {
          return { displayName: "Galileo", subject: "physics" } as any;
        }
        return undefined;
      });

      const result = await loadCrossMaestroLearnings(userId, currentMaestroId);

      // Should only include non-empty, non-whitespace learnings
      expect(result).toHaveLength(1);
      expect(result[0].learnings).toEqual(["Valid learning", "Another valid"]);
    });
  });

  describe("Memory aggregation from multiple conversations", () => {
    it("should aggregate learnings from multiple conversations with same maestro", async () => {
      const userId = "pro-user";
      const currentMaestroId = "euclide-matematica";

      vi.mocked(tierService.getEffectiveTier).mockResolvedValue({
        code: "pro",
      } as any);

      vi.mocked(getTierMemoryLimits).mockReturnValue({
        recentConversations: 5,
        timeWindowDays: null,
        maxKeyFacts: 50,
        maxTopics: 30,
        semanticEnabled: true,
        crossMaestroEnabled: true,
      } as any);

      // Multiple conversations with Galileo
      const galileoDate1 = new Date("2026-01-15");
      const galileoDate2 = new Date("2026-01-20");

      vi.mocked(prisma.conversation.findMany).mockResolvedValue([
        {
          maestroId: "galileo-fisica",
          keyFacts: JSON.stringify({
            learned: ["Gravity", "Motion laws"],
          }),
          updatedAt: galileoDate1,
        },
        {
          maestroId: "galileo-fisica",
          keyFacts: JSON.stringify({
            learned: ["Inertia", "Acceleration"],
          }),
          updatedAt: galileoDate2,
        },
      ] as any);

      vi.mocked(getMaestroById).mockImplementation((id: string) => {
        if (id === "galileo-fisica") {
          return { displayName: "Galileo", subject: "physics" } as any;
        }
        return undefined;
      });

      const result = await loadCrossMaestroLearnings(userId, currentMaestroId);

      // Should merge into single entry
      expect(result).toHaveLength(1);
      expect(result[0].maestroName).toBe("Galileo");
      expect(result[0].learnings).toHaveLength(4);
      expect(result[0].learnings).toContain("Gravity");
      expect(result[0].learnings).toContain("Inertia");
      expect(result[0].date).toEqual(galileoDate2); // Most recent date
    });
  });

  describe("Subject filtering with cross-maestro", () => {
    it("should correctly filter cross-maestro learnings by subject before prompt enhancement", async () => {
      const userId = "pro-user";
      const currentMaestroId = "euclide-matematica";

      vi.mocked(tierService.getEffectiveTier).mockResolvedValue({
        code: "pro",
      } as any);

      vi.mocked(getTierMemoryLimits).mockReturnValue({
        recentConversations: 5,
        timeWindowDays: null,
        maxKeyFacts: 50,
        maxTopics: 30,
        semanticEnabled: true,
        crossMaestroEnabled: true,
      } as any);

      // Multiple subjects
      vi.mocked(prisma.conversation.findMany).mockResolvedValue([
        {
          maestroId: "galileo-fisica",
          keyFacts: JSON.stringify({ learned: ["Physics"] }),
          updatedAt: new Date(),
        },
        {
          maestroId: "curie-chimica",
          keyFacts: JSON.stringify({ learned: ["Chemistry"] }),
          updatedAt: new Date(),
        },
        {
          maestroId: "manzoni-italiano",
          keyFacts: JSON.stringify({ learned: ["Italian"] }),
          updatedAt: new Date(),
        },
      ] as any);

      vi.mocked(getMaestroById).mockImplementation((id: string) => {
        const subjects: Record<string, string> = {
          "galileo-fisica": "physics",
          "curie-chimica": "chemistry",
          "manzoni-italiano": "italian",
        };
        const names: Record<string, string> = {
          "galileo-fisica": "Galileo",
          "curie-chimica": "Curie",
          "manzoni-italiano": "Manzoni",
        };
        return {
          displayName: names[id],
          subject: subjects[id],
        } as any;
      });

      // Load only physics and chemistry
      const learnings = await loadCrossMaestroLearnings(
        userId,
        currentMaestroId,
        { subjects: ["physics", "chemistry"] },
      );

      expect(learnings).toHaveLength(2);
      const subjects = learnings.map((l) => l.subject);
      expect(subjects).toContain("physics");
      expect(subjects).toContain("chemistry");
      expect(subjects).not.toContain("italian");
    });
  });
});
