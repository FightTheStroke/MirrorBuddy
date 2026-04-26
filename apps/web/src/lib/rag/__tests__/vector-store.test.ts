/**
 * Tests for Vector Store Service
 * @module rag/vector-store
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock logger
vi.mock('@/lib/logger', () => ({
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

// Mock anonymization service
vi.mock('@/lib/privacy', () => ({
  anonymizeConversationMessage: vi.fn((content: string) => {
    // Simple mock: replace emails and phone numbers with placeholders
    return content
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');
  }),
}));

// Mock prisma - centralized mock
vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

// Mock pgvector utilities
vi.mock('../pgvector-utils', () => ({
  checkPgvectorStatus: vi.fn().mockResolvedValue({
    available: true,
    version: '0.8.0',
    indexType: 'hnsw',
    error: null,
  }),
  nativeVectorSearch: vi.fn(),
  updateNativeVector: vi.fn().mockResolvedValue(undefined),
}));

// Import after mocks
import {
  storeEmbedding,
  searchSimilar,
  deleteEmbeddings,
  type VectorSearchResult,
  type StoreEmbeddingInput,
} from '../vector-store';
import { prisma } from '@/lib/db';
import { anonymizeConversationMessage } from '@/lib/privacy';
import { nativeVectorSearch } from '../pgvector-utils';

describe('Vector Store Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('storeEmbedding', () => {
    it('should store embedding with correct structure', async () => {
      const input: StoreEmbeddingInput = {
        userId: 'user-123',
        sourceType: 'material',
        sourceId: 'mat-456',
        chunkIndex: 0,
        content: 'Test content',
        vector: Array(1536).fill(0.1),
        model: 'text-embedding-3-small',
        subject: 'mathematics',
      };

      vi.mocked(prisma.contentEmbedding.create).mockResolvedValueOnce({
        id: 'emb-789',
        ...input,
        vector: JSON.stringify(input.vector),
        dimensions: 1536,
        tokenCount: 5,
        tags: '[]',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await storeEmbedding(input);

      expect(result.id).toBe('emb-789');
      expect(prisma.contentEmbedding.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          sourceType: 'material',
          sourceId: 'mat-456',
          chunkIndex: 0,
          content: 'Test content',
          vector: JSON.stringify(input.vector),
          model: 'text-embedding-3-small',
          dimensions: 1536,
          subject: 'mathematics',
        }),
      });
    });

    it('should throw error for invalid vector dimensions', async () => {
      const input: StoreEmbeddingInput = {
        userId: 'user-123',
        sourceType: 'material',
        sourceId: 'mat-456',
        content: 'Test',
        vector: Array(100).fill(0.1), // Wrong dimensions
      };

      await expect(storeEmbedding(input)).rejects.toThrow('Invalid vector dimensions');
    });

    it('should anonymize content containing PII before storing', async () => {
      const input: StoreEmbeddingInput = {
        userId: 'user-123',
        sourceType: 'message',
        sourceId: 'msg-456',
        chunkIndex: 0,
        content: 'My email is john.doe@example.com and phone is 555-123-4567',
        vector: Array(1536).fill(0.1),
        model: 'text-embedding-3-small',
      };

      vi.mocked(prisma.contentEmbedding.create).mockResolvedValueOnce({
        id: 'emb-789',
        userId: input.userId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        chunkIndex: 0,
        content: 'My email is [EMAIL] and phone is [PHONE]',
        vector: JSON.stringify(input.vector),
        dimensions: 1536,
        tokenCount: 10,
        model: input.model,
        subject: null,
        tags: '[]',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await storeEmbedding(input);

      expect(anonymizeConversationMessage).toHaveBeenCalledWith(input.content);
      expect(prisma.contentEmbedding.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          content: 'My email is [EMAIL] and phone is [PHONE]',
        }),
      });
    });
  });

  describe('searchSimilar', () => {
    it('should return results sorted by similarity', async () => {
      const queryVector = Array(1536).fill(0.1);

      const nativeResults = [
        {
          id: 'emb-1',
          source_type: 'material',
          source_id: 'mat-1',
          chunk_index: 0,
          content: 'Very similar content',
          similarity: 0.96,
          subject: 'math',
          tags: '[]',
        },
        {
          id: 'emb-2',
          source_type: 'material',
          source_id: 'mat-2',
          chunk_index: 0,
          content: 'Less similar content',
          similarity: 0.71,
          subject: 'math',
          tags: '[]',
        },
      ];

      vi.mocked(nativeVectorSearch).mockResolvedValueOnce(nativeResults as any);

      const results = await searchSimilar({
        userId: 'user-123',
        vector: queryVector,
        limit: 10,
      });

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('emb-1'); // Most similar first
      expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
    });

    it('should filter by sourceType', async () => {
      vi.mocked(nativeVectorSearch).mockResolvedValueOnce([] as any);

      await searchSimilar({
        userId: 'user-123',
        vector: Array(1536).fill(0.1),
        sourceType: 'flashcard',
      });

      expect(nativeVectorSearch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          sourceType: 'flashcard',
        }),
      );
    });

    it('should filter by subject', async () => {
      vi.mocked(nativeVectorSearch).mockResolvedValueOnce([] as any);

      await searchSimilar({
        userId: 'user-123',
        vector: Array(1536).fill(0.1),
        subject: 'history',
      });

      expect(nativeVectorSearch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          subject: 'history',
        }),
      );
    });

    it('should respect minSimilarity threshold', async () => {
      const queryVector = Array(1536).fill(0.1);

      vi.mocked(nativeVectorSearch).mockResolvedValueOnce([] as any);

      const results = await searchSimilar({
        userId: 'user-123',
        vector: queryVector,
        minSimilarity: 0.8,
      });

      expect(results).toHaveLength(0);
      expect(nativeVectorSearch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          minSimilarity: 0.8,
        }),
      );
    });
  });

  describe('deleteEmbeddings', () => {
    it('should delete embeddings by sourceId', async () => {
      vi.mocked(prisma.contentEmbedding.deleteMany).mockResolvedValueOnce({
        count: 3,
      } as any);

      const count = await deleteEmbeddings({
        userId: 'user-123',
        sourceType: 'material',
        sourceId: 'mat-456',
      });

      expect(count).toBe(3);
      expect(prisma.contentEmbedding.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          sourceType: 'material',
          sourceId: 'mat-456',
        },
      });
    });

    it('should delete all embeddings of a type', async () => {
      vi.mocked(prisma.contentEmbedding.deleteMany).mockResolvedValueOnce({
        count: 10,
      } as any);

      await deleteEmbeddings({
        userId: 'user-123',
        sourceType: 'studykit',
      });

      expect(prisma.contentEmbedding.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          sourceType: 'studykit',
        },
      });
    });
  });

  describe('VectorSearchResult interface', () => {
    it('should have correct structure', async () => {
      const queryVector = Array(1536).fill(0.1);
      const nativeResult = {
        id: 'emb-1',
        source_type: 'material',
        source_id: 'mat-1',
        chunk_index: 0,
        content: 'Content',
        similarity: 1,
        subject: 'math',
        tags: '["test"]',
      };

      vi.mocked(nativeVectorSearch).mockResolvedValueOnce([nativeResult] as any);

      const results: VectorSearchResult[] = await searchSimilar({
        userId: 'user-123',
        vector: queryVector,
      });

      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('sourceType');
      expect(results[0]).toHaveProperty('sourceId');
      expect(results[0]).toHaveProperty('content');
      expect(results[0]).toHaveProperty('similarity');
      expect(typeof results[0].similarity).toBe('number');
    });
  });

  describe('StoreEmbeddingInput sourceType validation', () => {
    it('should accept conversation_summary as a valid sourceType', async () => {
      const input: StoreEmbeddingInput = {
        userId: 'user-123',
        sourceType: 'conversation_summary',
        sourceId: 'conv-456',
        chunkIndex: 0,
        content: 'Conversation summary content',
        vector: Array(1536).fill(0.1),
        model: 'text-embedding-3-small',
        subject: 'mathematics',
      };

      vi.mocked(prisma.contentEmbedding.create).mockResolvedValueOnce({
        id: 'emb-789',
        ...input,
        vector: JSON.stringify(input.vector),
        dimensions: 1536,
        tokenCount: 7,
        tags: '[]',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await storeEmbedding(input);

      expect(result.id).toBe('emb-789');
      expect(prisma.contentEmbedding.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sourceType: 'conversation_summary',
          sourceId: 'conv-456',
        }),
      });
    });

    it('should search embeddings filtered by conversation_summary sourceType', async () => {
      vi.mocked(nativeVectorSearch).mockResolvedValueOnce([] as any);

      await searchSimilar({
        userId: 'user-123',
        vector: Array(1536).fill(0.1),
        sourceType: 'conversation_summary',
      });

      expect(nativeVectorSearch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          sourceType: 'conversation_summary',
        }),
      );
    });
  });
});
