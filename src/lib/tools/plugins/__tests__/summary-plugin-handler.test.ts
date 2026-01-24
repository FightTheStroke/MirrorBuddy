/**
 * Tests for Summary Plugin Handler
 * Coverage improvement for tools/plugins/summary-plugin.ts
 * Tests handler branches and validation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ToolCategory, Permission } from "../../plugin/types";

import { summaryPlugin } from "../summary-plugin";
import type { ToolContext } from "@/types/tools";

describe("summary-plugin handler", () => {
  const mockContext: ToolContext = {
    conversationId: "conv-123",
    userId: "user-456",
    sessionId: "sess-789",
    maestroId: "manzoni",
  };

  const validInput = {
    topic: "Italian Literature",
    sections: [
      {
        title: "Introduction",
        content: "This is the introduction to the topic.",
        keyPoints: ["Point 1", "Point 2"],
      },
      {
        title: "Main Content",
        content: "This is the main content of the summary.",
      },
    ],
    length: "medium" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("plugin configuration", () => {
    it("has correct id", () => {
      expect(summaryPlugin.id).toBe("create_summary");
    });

    it("has correct name", () => {
      expect(summaryPlugin.name).toBe("Riassunto");
    });

    it("has correct category", () => {
      expect(summaryPlugin.category).toBe(ToolCategory.CREATION);
    });

    it("has required permissions", () => {
      expect(summaryPlugin.permissions).toContain(Permission.WRITE_CONTENT);
      expect(summaryPlugin.permissions).toContain(Permission.READ_CONVERSATION);
    });

    it("has no prerequisites", () => {
      expect(summaryPlugin.prerequisites).toEqual([]);
    });

    it("has voice triggers in Italian and English", () => {
      expect(summaryPlugin.triggers).toContain("riassunto");
      expect(summaryPlugin.triggers).toContain("riassumi");
      expect(summaryPlugin.triggers).toContain("summary");
      expect(summaryPlugin.triggers).toContain("sintetizza");
    });

    it("has voice prompt with topic placeholder", () => {
      expect(summaryPlugin.voicePrompt).toBeDefined();
      if (typeof summaryPlugin.voicePrompt === "object") {
        expect(summaryPlugin.voicePrompt.template).toContain("{topic}");
      }
    });

    it("has voice feedback with itemCount placeholder", () => {
      expect(summaryPlugin.voiceFeedback).toBeDefined();
      if (typeof summaryPlugin.voiceFeedback === "object") {
        expect(summaryPlugin.voiceFeedback.template).toContain("{itemCount}");
      }
    });
  });

  describe("handler - success cases", () => {
    it("creates summary with all fields", async () => {
      const result = await summaryPlugin.handler(validInput, mockContext);

      expect(result.success).toBe(true);
      expect((result.data as any).topic).toBe("Italian Literature");
      expect((result.data as any).sections).toHaveLength(2);
      expect((result.data as any).length).toBe("medium");
    });

    it("creates summary without length (optional)", async () => {
      const result = await summaryPlugin.handler(
        {
          topic: "Test",
          sections: [{ title: "Title", content: "Content" }],
        },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).length).toBeUndefined();
    });

    it("creates summary without keyPoints (optional)", async () => {
      const result = await summaryPlugin.handler(
        {
          topic: "Test",
          sections: [{ title: "Title", content: "Content" }],
        },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).sections[0].keyPoints).toBeUndefined();
    });

    it("trims all string fields", async () => {
      const result = await summaryPlugin.handler(
        {
          topic: "  Spaced Topic  ",
          sections: [
            {
              title: "  Section Title  ",
              content: "  Section content  ",
              keyPoints: ["  Point 1  ", "  Point 2  "],
            },
          ],
        },
        mockContext,
      );

      expect(result.success).toBe(true);
      const data = result.data as {
        topic: string;
        sections: { title: string; content: string; keyPoints?: string[] }[];
      };
      expect(data.topic).toBe("Spaced Topic");
      expect(data.sections[0].title).toBe("Section Title");
      expect(data.sections[0].content).toBe("Section content");
      expect(data.sections[0].keyPoints?.[0]).toBe("Point 1");
    });
  });

  describe("handler - all length values", () => {
    const lengths = ["short", "medium", "long"] as const;

    it.each(lengths)("accepts length: %s", async (length) => {
      const result = await summaryPlugin.handler(
        {
          topic: "Test",
          sections: [{ title: "Title", content: "Content" }],
          length,
        },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).length).toBe(length);
    });
  });

  describe("handler - validation errors", () => {
    it("rejects missing topic", async () => {
      const result = await summaryPlugin.handler(
        { sections: [{ title: "Title", content: "Content" }] },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects empty topic", async () => {
      const result = await summaryPlugin.handler(
        { topic: "", sections: [{ title: "Title", content: "Content" }] },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Topic is required");
    });

    it("rejects topic over 200 characters", async () => {
      const result = await summaryPlugin.handler(
        {
          topic: "a".repeat(201),
          sections: [{ title: "Title", content: "Content" }],
        },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects missing sections", async () => {
      const result = await summaryPlugin.handler(
        { topic: "Test" },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects empty sections array", async () => {
      const result = await summaryPlugin.handler(
        { topic: "Test", sections: [] },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("At least one section is required");
    });

    it("rejects section with empty title", async () => {
      const result = await summaryPlugin.handler(
        { topic: "Test", sections: [{ title: "", content: "Content" }] },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Section title is required");
    });

    it("rejects section with empty content", async () => {
      const result = await summaryPlugin.handler(
        { topic: "Test", sections: [{ title: "Title", content: "" }] },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Section content is required");
    });

    it("rejects section title over 100 characters", async () => {
      const result = await summaryPlugin.handler(
        {
          topic: "Test",
          sections: [{ title: "a".repeat(101), content: "Content" }],
        },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects section content over 5000 characters", async () => {
      const result = await summaryPlugin.handler(
        {
          topic: "Test",
          sections: [{ title: "Title", content: "a".repeat(5001) }],
        },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects key point over 500 characters", async () => {
      const result = await summaryPlugin.handler(
        {
          topic: "Test",
          sections: [
            {
              title: "Title",
              content: "Content",
              keyPoints: ["a".repeat(501)],
            },
          ],
        },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects invalid length value", async () => {
      const result = await summaryPlugin.handler(
        {
          topic: "Test",
          sections: [{ title: "Title", content: "Content" }],
          length: "extra-long",
        },
        mockContext,
      );

      expect(result.success).toBe(false);
    });
  });
});
