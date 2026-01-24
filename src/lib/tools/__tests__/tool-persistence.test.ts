/**
 * Tests for Tool Persistence CRUD Operations
 * Coverage improvement for tools/tool-persistence.ts (0% -> 80%+)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  saveTool,
  getUserTools,
  getToolById,
  deleteTool,
  updateToolRating,
  toggleBookmark,
} from "../tool-persistence";
import { prisma } from "@/lib/db";
import type { MaterialRecord } from "../tool-persistence-helpers";

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    material: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    materialEdge: {
      create: vi.fn(),
    },
  },
}));

// Mock tool-embedding to avoid side effects
vi.mock("../tool-embedding", () => ({
  generateMaterialEmbeddingAsync: vi.fn(),
}));

// Mock crypto.randomUUID
vi.mock("crypto", () => ({
  randomUUID: vi.fn(() => "mock-uuid-1234"),
}));

describe("tool-persistence", () => {
  const userId = "user-123";
  const toolId = "tool-mock-uuid-1234";

  const createMockMaterial = (
    overrides: Partial<MaterialRecord> = {},
  ): MaterialRecord => ({
    id: "mat-1",
    toolId: "tool-123",
    userId,
    toolType: "mindmap",
    title: "Test Mindmap",
    topic: "Math",
    content: JSON.stringify({ nodes: [] }),
    maestroId: "euclide",
    conversationId: "conv-1",
    sessionId: "sess-1",
    userRating: null,
    isBookmarked: false,
    viewCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("saveTool", () => {
    it("should create a new material with generated toolId", async () => {
      const mockMaterial = createMockMaterial({ toolId });
      vi.mocked(prisma.material.create).mockResolvedValue(mockMaterial as any);

      const result = await saveTool({
        userId,
        type: "mindmap",
        title: "Test Mindmap",
        topic: "Math",
        content: { nodes: [] },
        maestroId: "euclide",
        conversationId: "conv-1",
        sessionId: "sess-1",
      });

      expect(result.type).toBe("mindmap");
      expect(result.title).toBe("Test Mindmap");
      expect(prisma.material.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          toolType: "mindmap",
          title: "Test Mindmap",
          status: "active",
        }),
      });
    });

    it("should create derived_from edge when sourceToolId provided", async () => {
      const mockMaterial = createMockMaterial();
      const sourceMaterial = { id: "source-mat-1" };

      vi.mocked(prisma.material.create).mockResolvedValue(mockMaterial as any);
      vi.mocked(prisma.material.findUnique).mockResolvedValue(
        sourceMaterial as any,
      );
      vi.mocked(prisma.materialEdge.create).mockResolvedValue({} as any);

      await saveTool({
        userId,
        type: "quiz",
        title: "Quiz from Mindmap",
        content: {},
        sourceToolId: "source-tool-123",
      });

      expect(prisma.material.findUnique).toHaveBeenCalledWith({
        where: { toolId: "source-tool-123" },
        select: { id: true },
      });
      expect(prisma.materialEdge.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          relationType: "derived_from",
        }),
      });
    });

    it("should handle missing source material gracefully", async () => {
      const mockMaterial = createMockMaterial();

      vi.mocked(prisma.material.create).mockResolvedValue(mockMaterial as any);
      vi.mocked(prisma.material.findUnique).mockResolvedValue(null);

      // Should not throw
      const result = await saveTool({
        userId,
        type: "quiz",
        title: "Quiz",
        content: {},
        sourceToolId: "non-existent",
      });

      expect(result).toBeDefined();
      expect(prisma.materialEdge.create).not.toHaveBeenCalled();
    });
  });

  describe("getUserTools", () => {
    it("should return all active tools for user", async () => {
      const mockMaterials = [
        createMockMaterial({ id: "mat-1" }),
        createMockMaterial({ id: "mat-2", toolType: "quiz" }),
      ];

      vi.mocked(prisma.material.findMany).mockResolvedValue(
        mockMaterials as any,
      );

      const results = await getUserTools(userId);

      expect(results).toHaveLength(2);
      expect(prisma.material.findMany).toHaveBeenCalledWith({
        where: { userId, status: "active" },
        orderBy: { createdAt: "desc" },
        take: 50,
        skip: 0,
      });
    });

    it("should filter by tool type", async () => {
      vi.mocked(prisma.material.findMany).mockResolvedValue([]);

      await getUserTools(userId, { type: "mindmap" });

      expect(prisma.material.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ toolType: "mindmap" }),
        orderBy: { createdAt: "desc" },
        take: 50,
        skip: 0,
      });
    });

    it("should filter by maestroId", async () => {
      vi.mocked(prisma.material.findMany).mockResolvedValue([]);

      await getUserTools(userId, { maestroId: "euclide" });

      expect(prisma.material.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ maestroId: "euclide" }),
        orderBy: { createdAt: "desc" },
        take: 50,
        skip: 0,
      });
    });

    it("should filter by bookmark status", async () => {
      vi.mocked(prisma.material.findMany).mockResolvedValue([]);

      await getUserTools(userId, { isBookmarked: true });

      expect(prisma.material.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ isBookmarked: true }),
        orderBy: { createdAt: "desc" },
        take: 50,
        skip: 0,
      });
    });

    it("should apply pagination", async () => {
      vi.mocked(prisma.material.findMany).mockResolvedValue([]);

      await getUserTools(userId, { limit: 10, offset: 20 });

      expect(prisma.material.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        orderBy: { createdAt: "desc" },
        take: 10,
        skip: 20,
      });
    });
  });

  describe("getToolById", () => {
    it("should return tool by id or toolId", async () => {
      const mockMaterial = createMockMaterial();
      vi.mocked(prisma.material.findFirst).mockResolvedValue(
        mockMaterial as any,
      );

      const result = await getToolById("tool-123", userId);

      expect(result).not.toBeNull();
      expect(result?.toolId).toBe("tool-123");
      expect(prisma.material.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
          status: "active",
          OR: [{ id: "tool-123" }, { toolId: "tool-123" }],
        },
      });
    });

    it("should return null when not found", async () => {
      vi.mocked(prisma.material.findFirst).mockResolvedValue(null);

      const result = await getToolById("non-existent", userId);

      expect(result).toBeNull();
    });
  });

  describe("deleteTool", () => {
    it("should soft delete by setting status to deleted", async () => {
      const mockMaterial = createMockMaterial();
      vi.mocked(prisma.material.findFirst).mockResolvedValue(
        mockMaterial as any,
      );
      vi.mocked(prisma.material.update).mockResolvedValue({} as any);

      const result = await deleteTool("tool-123", userId);

      expect(result).toBe(true);
      expect(prisma.material.update).toHaveBeenCalledWith({
        where: { id: "mat-1" },
        data: { status: "deleted" },
      });
    });

    it("should return false when tool not found", async () => {
      vi.mocked(prisma.material.findFirst).mockResolvedValue(null);

      const result = await deleteTool("non-existent", userId);

      expect(result).toBe(false);
      expect(prisma.material.update).not.toHaveBeenCalled();
    });
  });

  describe("updateToolRating", () => {
    it("should update rating for valid values (1-5)", async () => {
      const mockMaterial = createMockMaterial();
      vi.mocked(prisma.material.findFirst).mockResolvedValue(
        mockMaterial as any,
      );
      vi.mocked(prisma.material.update).mockResolvedValue({} as any);

      await updateToolRating("tool-123", userId, 4);

      expect(prisma.material.update).toHaveBeenCalledWith({
        where: { id: "mat-1" },
        data: { userRating: 4 },
      });
    });

    it("should throw for rating less than 1", async () => {
      await expect(updateToolRating("tool-123", userId, 0)).rejects.toThrow(
        "Rating must be between 1 and 5",
      );
    });

    it("should throw for rating greater than 5", async () => {
      await expect(updateToolRating("tool-123", userId, 6)).rejects.toThrow(
        "Rating must be between 1 and 5",
      );
    });

    it("should return null when tool not found", async () => {
      vi.mocked(prisma.material.findFirst).mockResolvedValue(null);

      const result = await updateToolRating("non-existent", userId, 3);

      expect(result).toBeNull();
    });
  });

  describe("toggleBookmark", () => {
    it("should toggle bookmark from false to true", async () => {
      const mockMaterial = createMockMaterial({ isBookmarked: false });
      vi.mocked(prisma.material.findFirst).mockResolvedValue(
        mockMaterial as any,
      );
      vi.mocked(prisma.material.update).mockResolvedValue({} as any);

      await toggleBookmark("tool-123", userId);

      expect(prisma.material.update).toHaveBeenCalledWith({
        where: { id: "mat-1" },
        data: { isBookmarked: true },
      });
    });

    it("should toggle bookmark from true to false", async () => {
      const mockMaterial = createMockMaterial({ isBookmarked: true });
      vi.mocked(prisma.material.findFirst).mockResolvedValue(
        mockMaterial as any,
      );
      vi.mocked(prisma.material.update).mockResolvedValue({} as any);

      await toggleBookmark("tool-123", userId);

      expect(prisma.material.update).toHaveBeenCalledWith({
        where: { id: "mat-1" },
        data: { isBookmarked: false },
      });
    });

    it("should return null when tool not found", async () => {
      vi.mocked(prisma.material.findFirst).mockResolvedValue(null);

      const result = await toggleBookmark("non-existent", userId);

      expect(result).toBeNull();
    });
  });
});
