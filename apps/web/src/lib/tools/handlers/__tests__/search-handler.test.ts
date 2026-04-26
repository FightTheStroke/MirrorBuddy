/**
 * Search Handler Tests
 *
 * Tests for web and YouTube search functionality.
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
} from "vitest";
import { performWebSearch, performYouTubeSearch } from "../search-handler";

// Mock logger
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

// Mock nanoid
vi.mock("nanoid", () => ({
  nanoid: () => "test-id",
}));

// Import after setting up mocks
import { executeToolCall } from "../../tool-executor";

// Register handlers
beforeAll(async () => {
  await import("../search-handler");
});

describe("Search Handler", () => {
  const originalFetch = global.fetch;
  const defaultContext = {
    sessionId: "test-session",
    maestroId: "test-maestro",
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("performWebSearch", () => {
    it("should return Wikipedia results on success", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            query: {
              search: [
                {
                  title: "Matematica",
                  pageid: 12345,
                  snippet: "La <span>matematica</span> è una scienza",
                },
              ],
            },
          }),
      });

      const { results, source } = await performWebSearch("matematica");

      expect(results).toHaveLength(2); // Wikipedia result + Treccani link
      expect(results[0].type).toBe("web");
      expect(results[0].title).toContain("Matematica - Wikipedia");
      expect(results[0].url).toContain("wikipedia.org");
      expect(source).toBe("wikipedia");
    });

    it("should strip HTML tags from snippets", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            query: {
              search: [
                {
                  title: "Test",
                  pageid: 1,
                  snippet:
                    '<span class="searchmatch">bold</span> text <b>here</b>',
                },
              ],
            },
          }),
      });

      const { results } = await performWebSearch("test");

      expect(results[0].description).toBe("bold text here");
    });

    it("should always include Treccani link", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            query: { search: [] },
          }),
      });

      const { results } = await performWebSearch("fisica");

      const treccaniResult = results.find((r) => r.url.includes("treccani.it"));
      expect(treccaniResult).toBeDefined();
      expect(treccaniResult!.title).toContain('Cerca "fisica" su Treccani');
    });

    it("should handle empty Wikipedia response", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const { results } = await performWebSearch("test");

      // Should still return Treccani link
      expect(results).toHaveLength(1);
      expect(results[0].url).toContain("treccani.it");
    });

    it("should handle fetch failure gracefully", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const { results } = await performWebSearch("test");

      // Should still return Treccani link
      expect(results).toHaveLength(1);
      expect(results[0].url).toContain("treccani.it");
    });

    it("should handle non-ok response", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { results } = await performWebSearch("test");

      // Should still return Treccani link
      expect(results).toHaveLength(1);
    });

    it("should encode URL correctly for special characters", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            query: {
              search: [
                {
                  title: "C++",
                  pageid: 1,
                  snippet: "Programming language",
                },
              ],
            },
          }),
      });

      const { results } = await performWebSearch("C++");

      expect(results[0].url).toContain("C%2B%2B");
    });
  });

  describe("performYouTubeSearch", () => {
    it("should return YouTube search links", async () => {
      const results = await performYouTubeSearch("algebra");

      expect(results).toHaveLength(2);
      expect(results[0].type).toBe("youtube");
      expect(results[0].url).toContain("youtube.com/results");
    });

    it("should include educational query", async () => {
      const results = await performYouTubeSearch("matematica");

      const educationalResult = results.find((r) =>
        r.url.includes("spiegazione"),
      );
      expect(educationalResult).toBeDefined();
    });

    it("should include course query", async () => {
      const results = await performYouTubeSearch("fisica");

      const courseResult = results.find((r) => r.url.includes("corso"));
      expect(courseResult).toBeDefined();
    });

    it("should encode special characters in URL", async () => {
      const results = await performYouTubeSearch("equazioni di secondo grado");

      expect(results[0].url).toContain("equazioni%20di%20secondo%20grado");
    });
  });

  describe("web_search handler", () => {
    it("should return error for missing query", async () => {
      const result = await executeToolCall("web_search", {}, defaultContext);

      expect(result.success).toBe(false);
      // Zod validation catches the error
      expect(result.error).toContain("query");
    });

    it("should return error for non-string query", async () => {
      const result = await executeToolCall(
        "web_search",
        { query: 123 },
        defaultContext,
      );

      expect(result.success).toBe(false);
      // Zod validation catches the type error
      expect(result.error).toContain("query");
    });

    it("should return error for query too short", async () => {
      const result = await executeToolCall(
        "web_search",
        { query: "a" },
        defaultContext,
      );

      expect(result.success).toBe(false);
      // Handler validation for length
      expect(result.error).toBeDefined();
    });

    it("should perform web search successfully", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            query: {
              search: [
                {
                  title: "Test Result",
                  pageid: 123,
                  snippet: "Test snippet",
                },
              ],
            },
          }),
      });

      const result = await executeToolCall(
        "web_search",
        { query: "test query", type: "web" },
        defaultContext,
      );

      expect(result.success).toBe(true);
      expect(result.toolType).toBe("search");
      expect(result.data).toHaveProperty("query", "test query");
      expect(result.data).toHaveProperty("searchType", "web");
    });

    it("should perform YouTube search successfully", async () => {
      const result = await executeToolCall(
        "web_search",
        { query: "tutorial", type: "youtube" },
        defaultContext,
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("searchType", "youtube");
    });

    it("should perform combined search by default", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            query: { search: [] },
          }),
      });

      const result = await executeToolCall(
        "web_search",
        { query: "mathematics" },
        defaultContext,
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("searchType", "all");
    });

    it("should trim query whitespace", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            query: { search: [] },
          }),
      });

      const result = await executeToolCall(
        "web_search",
        { query: "  test  " },
        defaultContext,
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("query", "test");
    });

    it("should handle search errors gracefully", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network failure"));

      const result = await executeToolCall(
        "web_search",
        { query: "test query", type: "web" },
        defaultContext,
      );

      // Even with fetch error, performWebSearch returns Treccani fallback
      // so the handler should still succeed
      expect(result.success).toBe(true);
    });
  });
});
