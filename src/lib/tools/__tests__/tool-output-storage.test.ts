/**
 * Tests for Tool Output Storage Service
 * Coverage improvement for tools/tool-output-storage.ts (0% -> 80%+)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveToolOutput,
  getToolOutputs,
  getToolOutputsByType,
  getToolOutputCount,
  getToolOutputStats,
  deleteToolOutputs,
} from '../tool-output-storage';
import { prisma } from '@/lib/db';

// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    toolOutput: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

// Mock tool-rag-indexer to avoid side effects
vi.mock('../tool-rag-indexer', () => ({
  indexToolOutput: vi.fn().mockResolvedValue(undefined),
}));

describe('tool-output-storage', () => {
  const conversationId = 'conv-123';
  const userId = 'user-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveToolOutput', () => {
    it('should save tool output and return parsed data', async () => {
      const mockData = { nodes: [{ id: '1', label: 'Test' }] };
      const mockCreated = {
        id: 'output-1',
        conversationId,
        toolType: 'mindmap',
        toolId: null,
        data: JSON.stringify(mockData),
        createdAt: new Date(),
      };

      vi.mocked(prisma.toolOutput.create).mockResolvedValue(mockCreated);

      const result = await saveToolOutput(conversationId, 'mindmap', mockData);

      expect(result.id).toBe('output-1');
      expect(result.data).toEqual(mockData);
      expect(prisma.toolOutput.create).toHaveBeenCalledWith({
        data: {
          conversationId,
          toolType: 'mindmap',
          toolId: null,
          data: JSON.stringify(mockData),
        },
      });
    });

    it('should include toolId when provided', async () => {
      const mockData = { title: 'Quiz' };
      const toolId = 'tool-789';
      const mockCreated = {
        id: 'output-2',
        conversationId,
        toolType: 'quiz',
        toolId,
        data: JSON.stringify(mockData),
        createdAt: new Date(),
      };

      vi.mocked(prisma.toolOutput.create).mockResolvedValue(mockCreated);

      const result = await saveToolOutput(conversationId, 'quiz', mockData, toolId);

      expect(result.toolId).toBe(toolId);
      expect(prisma.toolOutput.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ toolId }),
      });
    });

    it('should throw on database error', async () => {
      vi.mocked(prisma.toolOutput.create).mockRejectedValue(new Error('DB error'));

      await expect(saveToolOutput(conversationId, 'mindmap', {})).rejects.toThrow('DB error');
    });

    it('should trigger RAG indexing when enabled with userId', async () => {
      const { indexToolOutput } = await import('../tool-rag-indexer');
      const mockData = { content: 'test' };
      const mockCreated = {
        id: 'output-3',
        conversationId,
        toolType: 'summary',
        toolId: null,
        data: JSON.stringify(mockData),
        createdAt: new Date(),
      };

      vi.mocked(prisma.toolOutput.create).mockResolvedValue(mockCreated);

      await saveToolOutput(conversationId, 'summary', mockData, undefined, {
        enableRAG: true,
        userId,
      });

      expect(indexToolOutput).toHaveBeenCalled();
    });

    it('should not trigger RAG indexing when disabled', async () => {
      const { indexToolOutput } = await import('../tool-rag-indexer');
      vi.mocked(indexToolOutput).mockClear();

      const mockCreated = {
        id: 'output-4',
        conversationId,
        toolType: 'chart',
        toolId: null,
        data: '{}',
        createdAt: new Date(),
      };

      vi.mocked(prisma.toolOutput.create).mockResolvedValue(mockCreated);

      await saveToolOutput(conversationId, 'chart', {}, undefined, {
        enableRAG: false,
      });

      expect(indexToolOutput).not.toHaveBeenCalled();
    });
  });

  describe('getToolOutputs', () => {
    it('should return all outputs for conversation', async () => {
      const mockOutputs = [
        {
          id: 'out-1',
          conversationId,
          toolType: 'mindmap',
          toolId: null,
          data: '{"nodes":[]}',
          createdAt: new Date(),
        },
        {
          id: 'out-2',
          conversationId,
          toolType: 'quiz',
          toolId: null,
          data: '{"questions":[]}',
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.toolOutput.findMany).mockResolvedValue(mockOutputs);

      const results = await getToolOutputs(conversationId);

      expect(results).toHaveLength(2);
      expect(results[0].data).toEqual({ nodes: [] });
      expect(results[1].data).toEqual({ questions: [] });
      expect(prisma.toolOutput.findMany).toHaveBeenCalledWith({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: 500,
      });
    });

    it('should throw on database error', async () => {
      vi.mocked(prisma.toolOutput.findMany).mockRejectedValue(new Error('DB error'));

      await expect(getToolOutputs(conversationId)).rejects.toThrow('DB error');
    });
  });

  describe('getToolOutputsByType', () => {
    it('should filter outputs by tool type', async () => {
      const mockOutputs = [
        {
          id: 'out-1',
          conversationId,
          toolType: 'mindmap',
          toolId: null,
          data: '{}',
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.toolOutput.findMany).mockResolvedValue(mockOutputs);

      const results = await getToolOutputsByType(conversationId, 'mindmap');

      expect(results).toHaveLength(1);
      expect(prisma.toolOutput.findMany).toHaveBeenCalledWith({
        where: { conversationId, toolType: 'mindmap' },
        orderBy: { createdAt: 'desc' },
        take: 500,
      });
    });

    it('should throw on database error', async () => {
      vi.mocked(prisma.toolOutput.findMany).mockRejectedValue(new Error('DB error'));

      await expect(getToolOutputsByType(conversationId, 'quiz')).rejects.toThrow('DB error');
    });
  });

  describe('getToolOutputCount', () => {
    it('should return count of outputs', async () => {
      vi.mocked(prisma.toolOutput.count).mockResolvedValue(5);

      const count = await getToolOutputCount(conversationId);

      expect(count).toBe(5);
      expect(prisma.toolOutput.count).toHaveBeenCalledWith({
        where: { conversationId },
      });
    });

    it('should return 0 on error', async () => {
      vi.mocked(prisma.toolOutput.count).mockRejectedValue(new Error('DB error'));

      const count = await getToolOutputCount(conversationId);

      expect(count).toBe(0);
    });
  });

  describe('getToolOutputStats', () => {
    it('should return stats grouped by tool type', async () => {
      const mockOutputs = [
        { toolType: 'mindmap' },
        { toolType: 'mindmap' },
        { toolType: 'quiz' },
        { toolType: 'flashcard' },
        { toolType: 'flashcard' },
        { toolType: 'flashcard' },
      ];

      vi.mocked(prisma.toolOutput.findMany).mockResolvedValue(mockOutputs as any);

      const stats = await getToolOutputStats(conversationId);

      expect(stats).toEqual({
        mindmap: 2,
        quiz: 1,
        flashcard: 3,
      });
    });

    it('should return empty object on error', async () => {
      vi.mocked(prisma.toolOutput.findMany).mockRejectedValue(new Error('DB error'));

      const stats = await getToolOutputStats(conversationId);

      expect(stats).toEqual({});
    });
  });

  describe('deleteToolOutputs', () => {
    it('should delete all outputs for conversation', async () => {
      vi.mocked(prisma.toolOutput.deleteMany).mockResolvedValue({ count: 3 });

      const count = await deleteToolOutputs(conversationId);

      expect(count).toBe(3);
      expect(prisma.toolOutput.deleteMany).toHaveBeenCalledWith({
        where: { conversationId },
      });
    });

    it('should throw on database error', async () => {
      vi.mocked(prisma.toolOutput.deleteMany).mockRejectedValue(new Error('DB error'));

      await expect(deleteToolOutputs(conversationId)).rejects.toThrow('DB error');
    });
  });
});
