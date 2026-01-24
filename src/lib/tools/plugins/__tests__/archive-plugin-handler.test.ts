/**
 * Tests for Archive Plugin Handler
 * Coverage improvement for tools/plugins/archive-plugin.ts
 * Tests handler branches and fetch scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ToolCategory, Permission } from "../../plugin/types";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { archivePlugin } from "../archive-plugin";
import type { ToolContext } from "@/types/tools";

describe("archive-plugin handler", () => {
  const mockContext: ToolContext = {
    conversationId: "conv-123",
    userId: "user-456",
    sessionId: "sess-789",
    maestroId: "euclide",
    studentAge: 14,
    studentName: "Marco",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default successful response
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          materials: [
            { id: "1", title: "Math Notes", toolType: "summary" },
            { id: "2", title: "History Timeline", toolType: "timeline" },
          ],
          totalFound: 2,
        }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("plugin configuration", () => {
    it("has correct id", () => {
      expect(archivePlugin.id).toBe("search_archive");
    });

    it("has correct name", () => {
      expect(archivePlugin.name).toBe("Archivio Personale");
    });

    it("has correct category", () => {
      expect(archivePlugin.category).toBe(ToolCategory.NAVIGATION);
    });

    it("has required permissions", () => {
      expect(archivePlugin.permissions).toContain(Permission.READ_PROFILE);
      expect(archivePlugin.permissions).toContain(Permission.VOICE_OUTPUT);
    });

    it("is voice enabled", () => {
      expect(archivePlugin.voiceEnabled).toBe(true);
    });

    it("has voice triggers", () => {
      expect(archivePlugin.triggers).toContain("archivio");
      expect(archivePlugin.triggers).toContain("archive");
      expect(archivePlugin.triggers).toContain("saved");
    });
  });

  describe("handler - success cases", () => {
    it("searches with query parameter", async () => {
      const result = await archivePlugin.handler(
        { query: "mathematics" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.data.query).toBe("mathematics");
      expect(result.data.resultCount).toBe(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("q=mathematics"),
        expect.any(Object),
      );
    });

    it("searches with toolType parameter", async () => {
      const result = await archivePlugin.handler(
        { toolType: "mindmap" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.data.toolType).toBe("mindmap");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("type=mindmap"),
        expect.any(Object),
      );
    });

    it("searches with subject parameter", async () => {
      const result = await archivePlugin.handler(
        { subject: "history" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.data.subject).toBe("history");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("subject=history"),
        expect.any(Object),
      );
    });

    it("searches with all parameters", async () => {
      const result = await archivePlugin.handler(
        { query: "war", toolType: "timeline", subject: "history" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.data.query).toBe("war");
      expect(result.data.toolType).toBe("timeline");
      expect(result.data.subject).toBe("history");
    });

    it("includes userId in search params", async () => {
      await archivePlugin.handler({ query: "test" }, mockContext);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("userId=user-456"),
        expect.any(Object),
      );
    });

    it("includes limit in search params", async () => {
      await archivePlugin.handler({ query: "test" }, mockContext);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("limit=10"),
        expect.any(Object),
      );
    });

    it("includes createdAt timestamp", async () => {
      const result = await archivePlugin.handler(
        { query: "test" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.data.createdAt).toBeDefined();
    });
  });

  describe("handler - empty results", () => {
    it("returns error when no materials found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            materials: [],
            totalFound: 0,
          }),
      });

      const result = await archivePlugin.handler(
        { query: "nonexistent" },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("No materials found");
    });
  });

  describe("handler - validation errors", () => {
    it("rejects when no search criteria provided", async () => {
      const result = await archivePlugin.handler({}, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("At least one search criterion required");
    });

    it("rejects invalid toolType", async () => {
      const result = await archivePlugin.handler(
        { toolType: "invalid" },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects query over 500 characters", async () => {
      const result = await archivePlugin.handler(
        { query: "a".repeat(501) },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects subject over 100 characters", async () => {
      const result = await archivePlugin.handler(
        { subject: "a".repeat(101) },
        mockContext,
      );

      expect(result.success).toBe(false);
    });
  });

  describe("handler - API errors", () => {
    it("handles fetch error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await archivePlugin.handler(
        { query: "test" },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
    });

    it("handles non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await archivePlugin.handler(
        { query: "test" },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Search API: 500");
    });

    it("handles non-Error exception", async () => {
      mockFetch.mockRejectedValueOnce("string error");

      const result = await archivePlugin.handler(
        { query: "test" },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Archive search failed");
    });
  });

  describe("handler - all valid toolTypes", () => {
    const validTypes = [
      "mindmap",
      "quiz",
      "flashcard",
      "summary",
      "diagram",
      "timeline",
    ] as const;

    it.each(validTypes)("accepts toolType: %s", async (toolType) => {
      const result = await archivePlugin.handler({ toolType }, mockContext);

      expect(result.success).toBe(true);
      expect(result.data.toolType).toBe(toolType);
    });
  });
});
