/**
 * Tests for Flashcard Plugin Handler
 * Coverage improvement for tools/plugins/flashcard-plugin.ts
 * Tests handler branches and validation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ToolCategory, Permission } from "../../plugin/types";

import { flashcardPlugin } from "../flashcard-plugin";
import type { ToolContext } from "@/types/tools";

describe("flashcard-plugin handler", () => {
  const mockContext: ToolContext = {
    conversationId: "conv-123",
    userId: "user-456",
    sessionId: "sess-789",
    maestroId: "euclide",
  };

  const validInput = {
    topic: "Mathematics",
    cards: [
      { front: "What is 2+2?", back: "4" },
      { front: "What is the square root of 9?", back: "3" },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("plugin configuration", () => {
    it("has correct id", () => {
      expect(flashcardPlugin.id).toBe("create_flashcard");
    });

    it("has correct name", () => {
      expect(flashcardPlugin.name).toBe("Flashcard");
    });

    it("has correct category", () => {
      expect(flashcardPlugin.category).toBe(ToolCategory.CREATION);
    });

    it("has required permissions", () => {
      expect(flashcardPlugin.permissions).toContain(Permission.WRITE_CONTENT);
    });

    it("has no prerequisites", () => {
      expect(flashcardPlugin.prerequisites).toEqual([]);
    });

    it("has voice triggers", () => {
      expect(flashcardPlugin.triggers).toContain("flashcard");
      expect(flashcardPlugin.triggers).toContain("crea flashcard");
      expect(flashcardPlugin.triggers).toContain("carte");
      expect(flashcardPlugin.triggers).toContain("schede");
    });

    it("has voice prompt with topic placeholder", () => {
      expect(flashcardPlugin.voicePrompt).toBeDefined();
      if (typeof flashcardPlugin.voicePrompt === "object") {
        expect(flashcardPlugin.voicePrompt.template).toContain("{topic}");
      }
    });

    it("has voice feedback with itemCount placeholder", () => {
      expect(flashcardPlugin.voiceFeedback).toBeDefined();
      if (typeof flashcardPlugin.voiceFeedback === "object") {
        expect(flashcardPlugin.voiceFeedback.template).toContain("{itemCount}");
      }
    });
  });

  describe("handler - success cases", () => {
    it("creates flashcards with valid input", async () => {
      const result = await flashcardPlugin.handler(validInput, mockContext);

      expect(result.success).toBe(true);
      expect((result.data as any).topic).toBe("Mathematics");
      expect((result.data as any).cards).toHaveLength(2);
    });

    it("trims topic and card content", async () => {
      const result = await flashcardPlugin.handler(
        {
          topic: "  Spaced Topic  ",
          cards: [{ front: "  Question?  ", back: "  Answer  " }],
        },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).topic).toBe("Spaced Topic");
      expect((result.data as any).cards[0].front).toBe("Question?");
      expect((result.data as any).cards[0].back).toBe("Answer");
    });

    it("handles single card", async () => {
      const result = await flashcardPlugin.handler(
        { topic: "Test", cards: [{ front: "Q", back: "A" }] },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).cards).toHaveLength(1);
    });

    it("handles many cards", async () => {
      const cards = Array.from({ length: 20 }, (_, i) => ({
        front: `Question ${i}`,
        back: `Answer ${i}`,
      }));

      const result = await flashcardPlugin.handler(
        { topic: "Test", cards },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).cards).toHaveLength(20);
    });
  });

  describe("handler - validation errors", () => {
    it("rejects missing topic", async () => {
      const result = await flashcardPlugin.handler(
        { cards: [{ front: "Q", back: "A" }] },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects empty topic", async () => {
      const result = await flashcardPlugin.handler(
        { topic: "", cards: [{ front: "Q", back: "A" }] },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Topic is required");
    });

    it("rejects topic over 200 characters", async () => {
      const result = await flashcardPlugin.handler(
        { topic: "a".repeat(201), cards: [{ front: "Q", back: "A" }] },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects missing cards", async () => {
      const result = await flashcardPlugin.handler(
        { topic: "Test" },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects empty cards array", async () => {
      const result = await flashcardPlugin.handler(
        { topic: "Test", cards: [] },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("At least one flashcard is required");
    });

    it("rejects card with empty front", async () => {
      const result = await flashcardPlugin.handler(
        { topic: "Test", cards: [{ front: "", back: "A" }] },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Card front is required");
    });

    it("rejects card with empty back", async () => {
      const result = await flashcardPlugin.handler(
        { topic: "Test", cards: [{ front: "Q", back: "" }] },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Card back is required");
    });

    it("rejects card front over 1000 characters", async () => {
      const result = await flashcardPlugin.handler(
        { topic: "Test", cards: [{ front: "a".repeat(1001), back: "A" }] },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects card back over 2000 characters", async () => {
      const result = await flashcardPlugin.handler(
        { topic: "Test", cards: [{ front: "Q", back: "a".repeat(2001) }] },
        mockContext,
      );

      expect(result.success).toBe(false);
    });
  });
});
