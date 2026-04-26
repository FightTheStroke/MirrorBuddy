/**
 * Tests for Timeline Plugin Handler
 * Coverage improvement for tools/plugins/timeline-plugin.ts
 * Tests handler branches and event validation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ToolCategory, Permission } from "../../plugin/types";

// Mock dependencies
vi.mock("../../handlers/timeline-handler", () => ({
  validateEvents: vi.fn(() => ({ valid: true })),
}));

import { timelinePlugin } from "../timeline-plugin";
import { validateEvents } from "../../handlers/timeline-handler";
import type { ToolContext } from "@/types/tools";

describe("timeline-plugin handler", () => {
  const mockContext: ToolContext = {
    conversationId: "conv-123",
    userId: "user-456",
    sessionId: "sess-789",
    maestroId: "erodoto",
  };

  const validInput = {
    topic: "World War II",
    period: "1939-1945",
    events: [
      {
        date: "1939",
        title: "War Begins",
        description: "Germany invades Poland",
      },
      { date: "1945", title: "War Ends", description: "Victory in Europe" },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateEvents).mockReturnValue({ valid: true });
  });

  describe("plugin configuration", () => {
    it("has correct id", () => {
      expect(timelinePlugin.id).toBe("create_timeline");
    });

    it("has correct name", () => {
      expect(timelinePlugin.name).toBe("Timeline");
    });

    it("has correct category", () => {
      expect(timelinePlugin.category).toBe(ToolCategory.CREATION);
    });

    it("has required permissions", () => {
      expect(timelinePlugin.permissions).toContain(Permission.WRITE_CONTENT);
      expect(timelinePlugin.permissions).toContain(Permission.VOICE_OUTPUT);
    });

    it("is voice enabled", () => {
      expect(timelinePlugin.voiceEnabled).toBe(true);
    });

    it("has voice triggers in Italian and English", () => {
      expect(timelinePlugin.triggers).toContain("timeline");
      expect(timelinePlugin.triggers).toContain("cronologia");
      expect(timelinePlugin.triggers).toContain("storia");
    });

    it("has voice prompt with topic placeholder", () => {
      expect(timelinePlugin.voicePrompt).toBeDefined();
      if (typeof timelinePlugin.voicePrompt === "object") {
        expect(timelinePlugin.voicePrompt.template).toContain("{topic}");
      }
    });

    it("has voice feedback with eventCount placeholder", () => {
      expect(timelinePlugin.voiceFeedback).toBeDefined();
      if (typeof timelinePlugin.voiceFeedback === "object") {
        expect(timelinePlugin.voiceFeedback.template).toContain("{eventCount}");
      }
    });
  });

  describe("handler - success cases", () => {
    it("creates timeline with all fields", async () => {
      const result = await timelinePlugin.handler(validInput, mockContext);

      expect(result.success).toBe(true);
      expect((result.data as any).topic).toBe("World War II");
      expect((result.data as any).period).toBe("1939-1945");
      expect((result.data as any).events).toHaveLength(2);
      expect((result.data as any).eventCount).toBe(2);
      expect((result.data as any).createdAt).toBeDefined();
    });

    it("creates timeline without period (optional)", async () => {
      const result = await timelinePlugin.handler(
        { topic: "Roman History", events: validInput.events },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).period).toBeUndefined();
    });

    it("creates timeline with events without description", async () => {
      const result = await timelinePlugin.handler(
        {
          topic: "Test",
          events: [{ date: "2020", title: "Event" }],
        },
        mockContext,
      );

      expect(result.success).toBe(true);
      const data = result.data as { events: { description?: string }[] };
      expect(data.events[0].description).toBeUndefined();
    });

    it("trims all string fields", async () => {
      const result = await timelinePlugin.handler(
        {
          topic: "  Spaced Topic  ",
          period: "  1900-2000  ",
          events: [
            {
              date: "  1950  ",
              title: "  Event Title  ",
              description: "  Description  ",
            },
          ],
        },
        mockContext,
      );

      expect(result.success).toBe(true);
      const data = result.data as {
        topic: string;
        period: string;
        events: { date: string; title: string; description: string }[];
      };
      expect(data.topic).toBe("Spaced Topic");
      expect(data.period).toBe("1900-2000");
      expect(data.events[0].date).toBe("1950");
      expect(data.events[0].title).toBe("Event Title");
      expect(data.events[0].description).toBe("Description");
    });
  });

  describe("handler - event validation errors", () => {
    it("returns error when events structure is invalid", async () => {
      vi.mocked(validateEvents).mockReturnValueOnce({
        valid: false,
        error: "Events must have valid dates",
      });

      const result = await timelinePlugin.handler(validInput, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Events must have valid dates");
    });

    it("returns default error when validation fails without message", async () => {
      vi.mocked(validateEvents).mockReturnValueOnce({ valid: false });

      const result = await timelinePlugin.handler(validInput, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid events structure");
    });
  });

  describe("handler - schema validation errors", () => {
    it("rejects missing topic", async () => {
      const result = await timelinePlugin.handler(
        { events: validInput.events },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Validation error");
    });

    it("rejects empty topic", async () => {
      const result = await timelinePlugin.handler(
        { topic: "", events: validInput.events },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Topic is required");
    });

    it("rejects topic over 200 characters", async () => {
      const result = await timelinePlugin.handler(
        { topic: "a".repeat(201), events: validInput.events },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects period over 100 characters", async () => {
      const result = await timelinePlugin.handler(
        { topic: "Test", period: "a".repeat(101), events: validInput.events },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects empty events array", async () => {
      const result = await timelinePlugin.handler(
        { topic: "Test", events: [] },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("At least one event is required");
    });

    it("rejects missing events", async () => {
      const result = await timelinePlugin.handler(
        { topic: "Test" },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects events over 100 items", async () => {
      const manyEvents = Array.from({ length: 101 }, (_, i) => ({
        date: `${1900 + i}`,
        title: `Event ${i}`,
      }));

      const result = await timelinePlugin.handler(
        { topic: "Test", events: manyEvents },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Maximum 100 events");
    });

    it("rejects event with empty date", async () => {
      const result = await timelinePlugin.handler(
        { topic: "Test", events: [{ date: "", title: "Event" }] },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Date is required");
    });

    it("rejects event with empty title", async () => {
      const result = await timelinePlugin.handler(
        { topic: "Test", events: [{ date: "2020", title: "" }] },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Title is required");
    });
  });

  describe("handler - error handling", () => {
    it("handles non-Error exception", async () => {
      vi.mocked(validateEvents).mockImplementationOnce(() => {
        throw "string error";
      });

      const result = await timelinePlugin.handler(validInput, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Timeline creation failed");
    });

    it("handles Error exception", async () => {
      vi.mocked(validateEvents).mockImplementationOnce(() => {
        throw new Error("Event validation crashed");
      });

      const result = await timelinePlugin.handler(validInput, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Event validation crashed");
    });
  });
});
