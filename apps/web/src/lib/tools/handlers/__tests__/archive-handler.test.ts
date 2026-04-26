// ============================================================================
// ARCHIVE HANDLER TESTS
// Unit tests for archive search functionality
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ToolExecutionResult } from "@/types/tools";

// Mock nanoid
vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "test-archive-id-123"),
}));

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

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the tool executor module
vi.mock("../../tool-executor", () => ({
  registerToolHandler: vi.fn((name: string, handler: any) => {
    (globalThis as any).__archiveHandler = handler;
  }),
}));

// Import after mocks
import "../archive-handler";

function getArchiveHandler():
  | ((
      args: Record<string, unknown>,
      context?: any,
    ) => Promise<ToolExecutionResult>)
  | null {
  return (globalThis as any).__archiveHandler ?? null;
}

function requireArchiveHandler(): (
  args: Record<string, unknown>,
  context?: any,
) => Promise<ToolExecutionResult> {
  const handler = getArchiveHandler();
  if (!handler) throw new Error("Handler not registered");
  return handler;
}

describe("Archive Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Archive Handler Registration", () => {
    it("should have a registered handler", () => {
      expect(getArchiveHandler()).not.toBeNull();
      expect(typeof getArchiveHandler()).toBe("function");
    });
  });

  describe("Archive Search Validation", () => {
    it("should return error when no search criteria provided", async () => {
      const args = {};

      const result = await requireArchiveHandler()(args);

      expect(result.success).toBe(false);
      expect(result.toolId).toBe("test-archive-id-123");
      expect(result.toolType).toBe("search");
      expect(result.error).toContain("Specifica almeno un criterio");
    });

    it("should return error with empty search criteria", async () => {
      const args = { query: "", toolType: "", subject: "" };

      const result = await requireArchiveHandler()(args);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Specifica almeno un criterio");
    });
  });

  describe("Successful Archive Search", () => {
    it("should search by query successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          materials: [
            {
              id: "mat-1",
              toolId: "tool-1",
              toolType: "mindmap",
              title: "Fotosintesi",
              subject: "scienze",
              createdAt: "2024-01-15T10:00:00Z",
              isBookmarked: true,
            },
          ],
          totalFound: 1,
        }),
      });

      const args = { query: "fotosintesi" };
      const result = await requireArchiveHandler()(args);

      expect(result.success).toBe(true);
      expect(result.toolType).toBe("search");

      const data = result.data as any;
      expect(data.query).toBe("fotosintesi");
      expect(data.totalFound).toBe(1);
      expect(data.results).toHaveLength(1);
      expect(data.results[0].title).toBe("Fotosintesi");
      expect(data.message).toContain("Ho trovato 1 materiale");
    });

    it("should search by toolType successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          materials: [
            {
              id: "mat-1",
              toolId: "tool-1",
              toolType: "quiz",
              title: "Quiz Matematica",
              createdAt: "2024-01-15T10:00:00Z",
            },
            {
              id: "mat-2",
              toolId: "tool-2",
              toolType: "quiz",
              title: "Quiz Storia",
              createdAt: "2024-01-16T10:00:00Z",
            },
          ],
          totalFound: 2,
        }),
      });

      const args = { toolType: "quiz" };
      const result = await requireArchiveHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.toolType).toBe("quiz");
      expect(data.totalFound).toBe(2);
      expect(data.message).toContain("Ho trovato 2 materiali");
    });

    it("should search by subject successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          materials: [
            {
              id: "mat-1",
              toolId: "tool-1",
              toolType: "mindmap",
              title: "Equazioni",
              subject: "matematica",
              createdAt: "2024-01-15T10:00:00Z",
            },
          ],
          totalFound: 1,
        }),
      });

      const args = { subject: "matematica" };
      const result = await requireArchiveHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.subject).toBe("matematica");
      expect(data.totalFound).toBe(1);
    });

    it("should combine multiple search criteria", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          materials: [],
          totalFound: 0,
        }),
      });

      const args = { query: "test", toolType: "mindmap", subject: "scienze" };
      const result = await requireArchiveHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.query).toBe("test");
      expect(data.toolType).toBe("mindmap");
      expect(data.subject).toBe("scienze");
    });

    it("should include userId in search when provided in context", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          materials: [],
          totalFound: 0,
        }),
      });

      const args = { query: "test" };
      const context = { userId: "user-123" };

      await requireArchiveHandler()(args, context);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain("userId=user-123");
    });
  });

  describe("Empty Search Results", () => {
    it("should handle no results for query", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          materials: [],
          totalFound: 0,
        }),
      });

      const args = { query: "nonexistent" };
      const result = await requireArchiveHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.totalFound).toBe(0);
      expect(data.message).toContain(
        'Non ho trovato materiali con "nonexistent"',
      );
    });

    it("should handle no results for toolType", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          materials: [],
          totalFound: 0,
        }),
      });

      const args = { toolType: "timeline" };
      const result = await requireArchiveHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.message).toContain("Non ho trovato materiali");
      expect(data.message).toContain("timeline");
    });
  });

  describe("Error Handling", () => {
    it("should handle API error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const args = { query: "test" };
      const result = await requireArchiveHandler()(args);

      expect(result.success).toBe(false);
      expect(result.toolType).toBe("search");
      expect(result.error).toContain("Errore durante la ricerca");
    });

    it("should handle fetch exception", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const args = { query: "test" };
      const result = await requireArchiveHandler()(args);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Errore durante la ricerca");
    });

    it("should handle invalid JSON response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      const args = { query: "test" };
      const result = await requireArchiveHandler()(args);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Errore durante la ricerca");
    });
  });

  describe("Result Formatting", () => {
    it("should format bookmarked items with star", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          materials: [
            {
              id: "mat-1",
              toolId: "tool-1",
              toolType: "mindmap",
              title: "Bookmarked Item",
              createdAt: "2024-01-15T10:00:00Z",
              isBookmarked: true,
            },
          ],
          totalFound: 1,
        }),
      });

      const args = { query: "test" };
      const result = await requireArchiveHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.message).toContain("⭐");
    });

    it("should format dates in Italian locale", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          materials: [
            {
              id: "mat-1",
              toolId: "tool-1",
              toolType: "mindmap",
              title: "Test",
              createdAt: "2024-01-15T10:00:00Z",
            },
          ],
          totalFound: 1,
        }),
      });

      const args = { query: "test" };
      const result = await requireArchiveHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      // Italian date format
      expect(data.message).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it("should translate tool types to Italian", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          materials: [
            {
              id: "mat-1",
              toolId: "tool-1",
              toolType: "mindmap",
              title: "Test",
              createdAt: "2024-01-15T10:00:00Z",
            },
          ],
          totalFound: 1,
        }),
      });

      const args = { query: "test" };
      const result = await requireArchiveHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.message).toContain("mappa mentale");
    });
  });
});
