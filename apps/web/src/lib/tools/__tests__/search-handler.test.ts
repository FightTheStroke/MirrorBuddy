import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  performWebSearch,
  performYouTubeSearch,
} from "../handlers/search-handler";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock logger to avoid console output
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

describe("search-handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("performWebSearch", () => {
    it("should return Wikipedia results for valid query", async () => {
      const mockWikiResponse = {
        query: {
          search: [
            {
              title: "Teorema di Pitagora",
              pageid: 12345,
              snippet:
                'Il <span class="highlight">teorema</span> di Pitagora...',
            },
            {
              title: "Pitagora",
              pageid: 12346,
              snippet: "Pitagora di Samo fu un filosofo greco...",
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWikiResponse,
      });

      const { results, source } = await performWebSearch("teorema di pitagora");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("it.wikipedia.org"),
      );

      // Should have Wikipedia results + Treccani
      expect(results.length).toBe(3);
      expect(source).toBe("wikipedia");

      // Check Wikipedia results
      expect(results[0].type).toBe("web");
      expect(results[0].title).toContain("Teorema di Pitagora");
      expect(results[0].url).toContain("it.wikipedia.org/wiki/");

      // Check HTML is stripped from snippet
      expect(results[0].description).not.toContain("<span");
      expect(results[0].description).toContain("teorema");

      // Check Treccani is always included
      const treccaniResult = results.find((r) => r.url.includes("treccani.it"));
      expect(treccaniResult).toBeDefined();
      expect(treccaniResult?.title).toContain("Treccani");
    });

    it("should return only Treccani when Wikipedia API fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { results, source } = await performWebSearch("matematica");

      // Should still have Treccani as fallback
      expect(results.length).toBe(1);
      expect(results[0].url).toContain("treccani.it");
      expect(source).toBe("wikipedia");
    });

    it("should return only Treccani when Wikipedia returns no results", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ query: { search: [] } }),
      });

      const { results, source } = await performWebSearch("xyznonexistent123");

      expect(results.length).toBe(1);
      expect(results[0].url).toContain("treccani.it");
      expect(source).toBe("wikipedia");
    });

    it("should handle Wikipedia API returning non-OK status", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { results, source } = await performWebSearch("test");

      // Should still have Treccani
      expect(results.length).toBe(1);
      expect(results[0].url).toContain("treccani.it");
      expect(source).toBe("wikipedia");
    });

    it("should properly encode special characters in URLs", async () => {
      const mockWikiResponse = {
        query: {
          search: [
            {
              title: "C++",
              pageid: 99999,
              snippet: "Linguaggio di programmazione",
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWikiResponse,
      });

      const { results } = await performWebSearch("C++");

      // Check URL is properly encoded
      const wikiResult = results.find((r) => r.title.includes("C++"));
      expect(wikiResult?.url).toContain("C%2B%2B");
    });

    it("should limit results to 3 Wikipedia entries", async () => {
      const mockWikiResponse = {
        query: {
          search: [
            { title: "Result 1", pageid: 1, snippet: "Test 1" },
            { title: "Result 2", pageid: 2, snippet: "Test 2" },
            { title: "Result 3", pageid: 3, snippet: "Test 3" },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWikiResponse,
      });

      const { results } = await performWebSearch("test");

      // 3 Wikipedia + 1 Treccani
      expect(results.length).toBe(4);
      expect(results.filter((r) => r.url.includes("wikipedia")).length).toBe(3);
    });
  });

  describe("performYouTubeSearch", () => {
    it("should return YouTube search links for query", async () => {
      const results = await performYouTubeSearch("frazioni");

      expect(results.length).toBe(2);

      // Check educational search link
      expect(results[0].type).toBe("youtube");
      expect(results[0].url).toContain("youtube.com/results");
      expect(results[0].url).toContain("frazioni");
      expect(results[0].url).toContain("spiegazione");

      // Check course search link
      expect(results[1].type).toBe("youtube");
      expect(results[1].url).toContain("corso");
    });

    it("should properly encode query in YouTube URLs", async () => {
      const results = await performYouTubeSearch("algebra & geometria");

      expect(results[0].url).toContain(
        encodeURIComponent("algebra & geometria spiegazione"),
      );
    });

    it("should return Italian-focused educational queries", async () => {
      const results = await performYouTubeSearch("matematica");

      // Check that queries include Italian educational terms
      expect(results[0].url).toContain("lezione");
      expect(results[1].url).toContain("italiano");
    });
  });
});
