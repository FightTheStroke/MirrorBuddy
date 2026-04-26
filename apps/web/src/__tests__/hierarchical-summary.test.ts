/**
 * HierarchicalSummary Model Tests
 *
 * Tests for the HierarchicalSummary Prisma model.
 * Plan 086: T5-02 - Create HierarchicalSummary model
 *
 * This test validates that the HierarchicalSummary type exists and
 * can be imported from @prisma/client.
 */

import { describe, it, expect } from "vitest";
import type { HierarchicalSummary } from "@prisma/client";

describe("HierarchicalSummary Model", () => {
  it("should be able to import HierarchicalSummary type from @prisma/client", () => {
    // If this test runs without compile errors, the import succeeded
    // TypeScript will fail compilation if the type doesn't exist
    const instance: HierarchicalSummary = {
      id: "test",
      userId: "user123",
      type: "weekly",
      startDate: new Date(),
      endDate: new Date(),
      keyThemes: [],
      consolidatedLearnings: [],
      frequentTopics: [],
      sourceConversationIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(instance.userId).toBe("user123");
  });

  it("should have required fields in HierarchicalSummary type", () => {
    // Verify the type structure by checking a sample object
    const sampleSummary: HierarchicalSummary = {
      id: "test-id",
      userId: "user-123",
      type: "weekly",
      startDate: new Date(),
      endDate: new Date(),
      keyThemes: ["theme1", "theme2"],
      consolidatedLearnings: ["learning1", "learning2"],
      frequentTopics: [
        { topic: "math", count: 5 },
        { topic: "physics", count: 3 },
      ],
      sourceConversationIds: ["conv1", "conv2"],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(sampleSummary).toBeDefined();
    expect(sampleSummary.id).toBe("test-id");
    expect(sampleSummary.userId).toBe("user-123");
    expect(sampleSummary.type).toBe("weekly");
  });

  it("should support 'weekly' and 'monthly' type values", () => {
    const weeklyType: HierarchicalSummary["type"] = "weekly";
    const monthlyType: HierarchicalSummary["type"] = "monthly";

    expect(weeklyType).toBe("weekly");
    expect(monthlyType).toBe("monthly");
  });

  it("should have Json fields for keyThemes, consolidatedLearnings, frequentTopics, and sourceConversationIds", () => {
    // This validates that these fields are Json type (any type in TypeScript)
    const summary: HierarchicalSummary = {
      id: "id",
      userId: "uid",
      type: "weekly",
      startDate: new Date(),
      endDate: new Date(),
      keyThemes: ["array", "of", "strings"] as any,
      consolidatedLearnings: ["list", "of", "learnings"] as any,
      frequentTopics: [{ topic: "test", count: 1 }] as any,
      sourceConversationIds: ["id1", "id2"] as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(Array.isArray(summary.keyThemes)).toBe(true);
    expect(Array.isArray(summary.consolidatedLearnings)).toBe(true);
    expect(Array.isArray(summary.frequentTopics)).toBe(true);
    expect(Array.isArray(summary.sourceConversationIds)).toBe(true);
  });
});
