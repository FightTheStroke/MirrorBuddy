/**
 * Tests for pgvector Utilities
 * @module rag/pgvector-utils
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

import {
  isPostgresDatabase,
  formatVectorForPg,
  clearPgvectorStatusCache,
  checkPgvectorStatus,
} from "../pgvector-utils";

describe("pgvector Utilities", () => {
  const originalEnv = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    clearPgvectorStatusCache();
  });

  afterEach(() => {
    process.env.DATABASE_URL = originalEnv;
  });

  describe("isPostgresDatabase", () => {
    it("should return true for postgres:// URL", () => {
      process.env.DATABASE_URL = "postgres://user:pass@host:5432/db";
      expect(isPostgresDatabase()).toBe(true);
    });

    it("should return true for postgresql:// URL", () => {
      process.env.DATABASE_URL = "postgresql://user:pass@host:5432/db";
      expect(isPostgresDatabase()).toBe(true);
    });

    it("should return false for SQLite file URL", () => {
      process.env.DATABASE_URL = "file:./prisma/dev.db";
      expect(isPostgresDatabase()).toBe(false);
    });

    it("should return false for empty/undefined URL", () => {
      delete process.env.DATABASE_URL;
      expect(isPostgresDatabase()).toBe(false);
    });

    it("should return false for mysql URL", () => {
      process.env.DATABASE_URL = "mysql://user:pass@host:3306/db";
      expect(isPostgresDatabase()).toBe(false);
    });
  });

  describe("formatVectorForPg", () => {
    it("should format empty vector", () => {
      expect(formatVectorForPg([])).toBe("[]");
    });

    it("should format single element vector", () => {
      expect(formatVectorForPg([0.5])).toBe("[0.5]");
    });

    it("should format multi-element vector", () => {
      expect(formatVectorForPg([0.1, 0.2, 0.3])).toBe("[0.1,0.2,0.3]");
    });

    it("should handle negative values", () => {
      expect(formatVectorForPg([-0.5, 0.5, -0.25])).toBe("[-0.5,0.5,-0.25]");
    });

    it("should handle scientific notation", () => {
      const vector = [1e-10, 1.5e-5, 0.1];
      const result = formatVectorForPg(vector);
      expect(result).toContain(",");
      expect(result.startsWith("[")).toBe(true);
      expect(result.endsWith("]")).toBe(true);
    });

    it("should handle 1536-dimension vector", () => {
      const vector = Array(1536).fill(0.1);
      const result = formatVectorForPg(vector);
      expect(result.startsWith("[")).toBe(true);
      expect(result.endsWith("]")).toBe(true);
      expect(result.split(",").length).toBe(1536);
    });
  });

  describe("checkPgvectorStatus", () => {
    it("should return not available for SQLite", async () => {
      process.env.DATABASE_URL = "file:./prisma/dev.db";

      const mockPrisma = {
        $queryRaw: vi.fn(),
      };

      const status = await checkPgvectorStatus(mockPrisma);

      expect(status.available).toBe(false);
      expect(status.error).toBe("Not using PostgreSQL database");
      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    });

    it("should check extension for PostgreSQL", async () => {
      process.env.DATABASE_URL = "postgresql://localhost/db";

      const mockPrisma = {
        $queryRaw: vi
          .fn()
          .mockResolvedValueOnce([{ extversion: "0.7.0" }])
          .mockResolvedValueOnce([{ indexname: "idx_vector_ivfflat" }]),
      };

      const status = await checkPgvectorStatus(mockPrisma);

      expect(status.available).toBe(true);
      expect(status.version).toBe("0.7.0");
      expect(status.indexType).toBe("ivfflat");
    });

    it("should detect HNSW index", async () => {
      process.env.DATABASE_URL = "postgresql://localhost/db";
      clearPgvectorStatusCache();

      const mockPrisma = {
        $queryRaw: vi
          .fn()
          .mockResolvedValueOnce([{ extversion: "0.7.0" }])
          .mockResolvedValueOnce([{ indexname: "idx_content_hnsw" }]),
      };

      const status = await checkPgvectorStatus(mockPrisma);

      expect(status.indexType).toBe("hnsw");
    });

    it("should handle missing extension", async () => {
      process.env.DATABASE_URL = "postgresql://localhost/db";
      clearPgvectorStatusCache();

      const mockPrisma = {
        $queryRaw: vi.fn().mockResolvedValueOnce([]),
      };

      const status = await checkPgvectorStatus(mockPrisma);

      expect(status.available).toBe(false);
      expect(status.error).toBe("pgvector extension not installed");
    });

    it("should handle query errors", async () => {
      process.env.DATABASE_URL = "postgresql://localhost/db";
      clearPgvectorStatusCache();

      const mockPrisma = {
        $queryRaw: vi
          .fn()
          .mockRejectedValueOnce(new Error("Connection failed")),
      };

      const status = await checkPgvectorStatus(mockPrisma);

      expect(status.available).toBe(false);
      expect(status.error).toBe("Connection failed");
    });

    it("should cache result after first check", async () => {
      process.env.DATABASE_URL = "postgresql://localhost/db";
      clearPgvectorStatusCache();

      const mockPrisma = {
        $queryRaw: vi
          .fn()
          .mockResolvedValueOnce([{ extversion: "0.7.0" }])
          .mockResolvedValueOnce([]),
      };

      await checkPgvectorStatus(mockPrisma);
      await checkPgvectorStatus(mockPrisma);

      // Should only call once due to caching
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(2); // First check makes 2 calls
    });
  });

  describe("clearPgvectorStatusCache", () => {
    it("should clear cached status", async () => {
      process.env.DATABASE_URL = "file:./prisma/dev.db";

      const mockPrisma = {
        $queryRaw: vi.fn(),
      };

      // First check - should cache
      await checkPgvectorStatus(mockPrisma);

      // Change to PostgreSQL
      process.env.DATABASE_URL = "postgresql://localhost/db";

      // Without clear, should still return SQLite status
      const cachedStatus = await checkPgvectorStatus(mockPrisma);
      expect(cachedStatus.error).toBe("Not using PostgreSQL database");

      // After clear, should re-check
      clearPgvectorStatusCache();
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ extversion: "0.7.0" }])
        .mockResolvedValueOnce([]);

      const newStatus = await checkPgvectorStatus(mockPrisma);
      expect(newStatus.available).toBe(true);
    });
  });
});
