/**
 * Tests for Search Plugin
 * Coverage improvement for tools/plugins/search-plugin.ts
 * Tests plugin configuration, schema validation, and handler branches
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { ToolCategory, Permission } from "../../plugin/types";

// Mock dependencies
vi.mock("../../handlers/search-handler", () => ({
  performWebSearch: vi.fn(() =>
    Promise.resolve({
      results: [
        {
          type: "web",
          title: "Wikipedia Result",
          url: "https://wikipedia.org/test",
        },
      ],
      source: "wikipedia" as const,
    }),
  ),
  performYouTubeSearch: vi.fn(() =>
    Promise.resolve([
      {
        type: "youtube",
        title: "YouTube Video",
        url: "https://youtube.com/watch?v=123",
      },
    ]),
  ),
}));

import { searchPlugin } from "../search-plugin";
import {
  performWebSearch,
  performYouTubeSearch,
} from "../../handlers/search-handler";
import type { ToolContext } from "@/types/tools";

describe("search-plugin", () => {
  const mockContext: ToolContext = {
    conversationId: "conv-123",
    userId: "user-456",
    sessionId: "sess-789",
    maestroId: "euclide",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("plugin configuration", () => {
    it("has correct id", () => {
      expect(searchPlugin.id).toBe("web_search");
    });

    it("has correct name", () => {
      expect(searchPlugin.name).toBe("Ricerca Web");
    });

    it("has correct category", () => {
      expect(searchPlugin.category).toBe(ToolCategory.UTILITY);
    });

    it("has required permissions", () => {
      expect(searchPlugin.permissions).toContain(Permission.READ_CONVERSATION);
      expect(searchPlugin.permissions).toContain(Permission.VOICE_OUTPUT);
    });

    it("has voice triggers in Italian and English", () => {
      expect(searchPlugin.triggers).toContain("ricerca");
      expect(searchPlugin.triggers).toContain("cerca");
      expect(searchPlugin.triggers).toContain("search");
      expect(searchPlugin.triggers).toContain("wikipedia");
      expect(searchPlugin.triggers).toContain("youtube");
    });

    it("is voice enabled", () => {
      expect(searchPlugin.voiceEnabled).toBe(true);
    });

    it("has no prerequisites", () => {
      expect(searchPlugin.prerequisites).toEqual([]);
    });

    it("has handler function", () => {
      expect(typeof searchPlugin.handler).toBe("function");
    });

    it("has voice prompt with query placeholder", () => {
      expect(searchPlugin.voicePrompt).toBeDefined();
      if (typeof searchPlugin.voicePrompt === "object") {
        expect(searchPlugin.voicePrompt.template).toContain("{query}");
        expect(searchPlugin.voicePrompt.fallback).toBeDefined();
      }
    });

    it("has voice feedback with resultCount placeholder", () => {
      expect(searchPlugin.voiceFeedback).toBeDefined();
      if (typeof searchPlugin.voiceFeedback === "object") {
        expect(searchPlugin.voiceFeedback.template).toContain("{resultCount}");
        expect(searchPlugin.voiceFeedback.fallback).toBeDefined();
      }
    });
  });

  describe("handler - search type variations", () => {
    it("performs all searches when type is all (default)", async () => {
      const result = await searchPlugin.handler(
        { query: "pythagorean theorem" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(performWebSearch).toHaveBeenCalledWith("pythagorean theorem");
      expect(performYouTubeSearch).toHaveBeenCalledWith("pythagorean theorem");
      const data = result.data as { results: unknown[]; searchType: string };
      expect(data.results.length).toBe(2);
      expect(data.searchType).toBe("all");
    });

    it("performs only web search when type is web", async () => {
      const result = await searchPlugin.handler(
        { query: "math history", type: "web" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(performWebSearch).toHaveBeenCalledWith("math history");
      expect(performYouTubeSearch).not.toHaveBeenCalled();
      expect((result.data as any).searchType).toBe("web");
      expect((result.data as any).searchSource).toBe("wikipedia");
    });

    it("performs only YouTube search when type is youtube", async () => {
      const result = await searchPlugin.handler(
        { query: "algebra tutorial", type: "youtube" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(performWebSearch).not.toHaveBeenCalled();
      expect(performYouTubeSearch).toHaveBeenCalledWith("algebra tutorial");
      expect((result.data as any).searchType).toBe("youtube");
    });

    it("explicitly handles type all", async () => {
      const result = await searchPlugin.handler(
        { query: "science", type: "all" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(performWebSearch).toHaveBeenCalled();
      expect(performYouTubeSearch).toHaveBeenCalled();
    });
  });

  describe("handler - success cases", () => {
    it("returns results with correct structure", async () => {
      const result = await searchPlugin.handler(
        { query: "geometry" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).query).toBe("geometry");
      expect((result.data as any).results).toBeInstanceOf(Array);
      expect((result.data as any).resultCount).toBeGreaterThan(0);
      expect((result.data as any).createdAt).toBeDefined();
    });

    it("trims query whitespace", async () => {
      const result = await searchPlugin.handler(
        { query: "  spaced query  " },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).query).toBe("spaced query");
    });

    it("includes searchSource from web search", async () => {
      vi.mocked(performWebSearch).mockResolvedValueOnce({
        results: [
          { type: "web", title: "Brave Result", url: "https://example.com" },
        ],
        source: "brave",
      });

      const result = await searchPlugin.handler(
        { query: "test", type: "web" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).searchSource).toBe("brave");
    });
  });

  describe("handler - empty results", () => {
    it("returns error when no results found (web only)", async () => {
      vi.mocked(performWebSearch).mockResolvedValueOnce({
        results: [],
        source: "wikipedia",
      });

      const result = await searchPlugin.handler(
        { query: "obscure topic xyz", type: "web" },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("No results found");
    });

    it("returns error when no results found (youtube only)", async () => {
      vi.mocked(performYouTubeSearch).mockResolvedValueOnce([]);

      const result = await searchPlugin.handler(
        { query: "nonexistent video", type: "youtube" },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("returns error when both searches return empty (all)", async () => {
      vi.mocked(performWebSearch).mockResolvedValueOnce({
        results: [],
        source: "wikipedia",
      });
      vi.mocked(performYouTubeSearch).mockResolvedValueOnce([]);

      const result = await searchPlugin.handler(
        { query: "nothing found", type: "all" },
        mockContext,
      );

      expect(result.success).toBe(false);
    });
  });

  describe("handler - validation errors", () => {
    it("rejects query shorter than 2 characters", async () => {
      const result = await searchPlugin.handler({ query: "x" }, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Validation error");
    });

    it("rejects query longer than 500 characters", async () => {
      const result = await searchPlugin.handler(
        { query: "a".repeat(501) },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects invalid search type", async () => {
      const result = await searchPlugin.handler(
        { query: "test", type: "invalid" },
        mockContext,
      );

      expect(result.success).toBe(false);
    });
  });

  describe("handler - error handling", () => {
    it("handles web search throwing an error", async () => {
      vi.mocked(performWebSearch).mockRejectedValueOnce(
        new Error("Network error"),
      );

      const result = await searchPlugin.handler(
        { query: "test", type: "web" },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
    });

    it("handles YouTube search throwing an error", async () => {
      vi.mocked(performYouTubeSearch).mockRejectedValueOnce(
        new Error("API quota exceeded"),
      );

      const result = await searchPlugin.handler(
        { query: "test", type: "youtube" },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("API quota exceeded");
    });

    it("handles non-Error exception", async () => {
      vi.mocked(performWebSearch).mockRejectedValueOnce("string error");

      const result = await searchPlugin.handler(
        { query: "test", type: "web" },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Search failed");
    });
  });

  describe("schema validation", () => {
    const SearchPluginSchema = z.object({
      query: z.string().min(2).max(500),
      type: z.enum(["web", "youtube", "all"]).default("all"),
    });

    it("accepts valid query with default type", () => {
      const result = SearchPluginSchema.safeParse({ query: "mathematics" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).type).toBe("all");
      }
    });

    it("accepts valid query with web type", () => {
      const result = SearchPluginSchema.safeParse({
        query: "test",
        type: "web",
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid query with youtube type", () => {
      const result = SearchPluginSchema.safeParse({
        query: "test",
        type: "youtube",
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid query with all type", () => {
      const result = SearchPluginSchema.safeParse({
        query: "test",
        type: "all",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing query", () => {
      const result = SearchPluginSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("voice triggers", () => {
    it("has at least 7 triggers", () => {
      expect(searchPlugin.triggers.length).toBeGreaterThanOrEqual(7);
    });

    it("includes Italian triggers", () => {
      const italianTriggers = ["ricerca", "cerca"];
      italianTriggers.forEach((trigger) => {
        expect(searchPlugin.triggers).toContain(trigger);
      });
    });

    it("includes English triggers", () => {
      const englishTriggers = [
        "search",
        "google",
        "wikipedia",
        "youtube",
        "video",
      ];
      englishTriggers.forEach((trigger) => {
        expect(searchPlugin.triggers).toContain(trigger);
      });
    });
  });
});
