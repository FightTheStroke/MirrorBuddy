/**
 * Tests for Embedding Service
 * @module rag/embedding-service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateEmbedding,
  generateEmbeddings,
  isEmbeddingConfigured,
  getEmbeddingDimensions,
  type EmbeddingResult,
} from '../embedding-service';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Embedding Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isEmbeddingConfigured', () => {
    it('should return true when Azure embedding is configured', () => {
      vi.stubEnv('AZURE_OPENAI_ENDPOINT', 'https://test.openai.azure.com');
      vi.stubEnv('AZURE_OPENAI_API_KEY', 'test-key');
      vi.stubEnv('AZURE_OPENAI_EMBEDDING_DEPLOYMENT', 'text-embedding-3-small');

      expect(isEmbeddingConfigured()).toBe(true);

      vi.unstubAllEnvs();
    });

    it('should return false when embedding deployment is missing', () => {
      vi.stubEnv('AZURE_OPENAI_ENDPOINT', 'https://test.openai.azure.com');
      vi.stubEnv('AZURE_OPENAI_API_KEY', 'test-key');
      vi.stubEnv('AZURE_OPENAI_EMBEDDING_DEPLOYMENT', '');

      expect(isEmbeddingConfigured()).toBe(false);

      vi.unstubAllEnvs();
    });
  });

  describe('getEmbeddingDimensions', () => {
    it('should return 1536 for text-embedding-3-small', () => {
      expect(getEmbeddingDimensions('text-embedding-3-small')).toBe(1536);
    });

    it('should return 3072 for text-embedding-3-large', () => {
      expect(getEmbeddingDimensions('text-embedding-3-large')).toBe(3072);
    });

    it('should return 1536 for text-embedding-ada-002', () => {
      expect(getEmbeddingDimensions('text-embedding-ada-002')).toBe(1536);
    });

    it('should return 1536 for unknown models', () => {
      expect(getEmbeddingDimensions('unknown-model')).toBe(1536);
    });
  });

  describe('generateEmbedding', () => {
    beforeEach(() => {
      vi.stubEnv('AZURE_OPENAI_ENDPOINT', 'https://test.openai.azure.com');
      vi.stubEnv('AZURE_OPENAI_API_KEY', 'test-key');
      vi.stubEnv('AZURE_OPENAI_EMBEDDING_DEPLOYMENT', 'text-embedding-3-small');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('should generate embedding for text', async () => {
      const mockVector = Array(1536).fill(0.1);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockVector, index: 0 }],
          usage: { prompt_tokens: 10, total_tokens: 10 },
        }),
      });

      const result = await generateEmbedding('Test text');

      expect(result.vector).toHaveLength(1536);
      expect(result.model).toBe('text-embedding-3-small');
      expect(result.usage.tokens).toBe(10);
    });

    it('should throw error for empty text', async () => {
      await expect(generateEmbedding('')).rejects.toThrow('Text cannot be empty');
    });

    it('should throw error when not configured', async () => {
      vi.unstubAllEnvs();
      vi.stubEnv('AZURE_OPENAI_ENDPOINT', '');
      vi.stubEnv('AZURE_OPENAI_API_KEY', '');
      vi.stubEnv('AZURE_OPENAI_EMBEDDING_DEPLOYMENT', '');

      await expect(generateEmbedding('test')).rejects.toThrow('Embedding service not configured');
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      });

      await expect(generateEmbedding('test')).rejects.toThrow('Azure Embedding error (429)');
    });
  });

  describe('generateEmbeddings (batch)', () => {
    beforeEach(() => {
      vi.stubEnv('AZURE_OPENAI_ENDPOINT', 'https://test.openai.azure.com');
      vi.stubEnv('AZURE_OPENAI_API_KEY', 'test-key');
      vi.stubEnv('AZURE_OPENAI_EMBEDDING_DEPLOYMENT', 'text-embedding-3-small');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('should generate embeddings for multiple texts', async () => {
      const mockVectors = [
        Array(1536).fill(0.1),
        Array(1536).fill(0.2),
        Array(1536).fill(0.3),
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockVectors.map((v, i) => ({ embedding: v, index: i })),
          usage: { prompt_tokens: 30, total_tokens: 30 },
        }),
      });

      const texts = ['Text 1', 'Text 2', 'Text 3'];
      const results = await generateEmbeddings(texts);

      expect(results).toHaveLength(3);
      results.forEach((result, i) => {
        expect(result.vector).toHaveLength(1536);
        expect(result.index).toBe(i);
      });
    });

    it('should return empty array for empty input', async () => {
      const results = await generateEmbeddings([]);
      expect(results).toEqual([]);
    });

    it('should filter out empty texts', async () => {
      const mockVector = Array(1536).fill(0.1);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockVector, index: 0 }],
          usage: { prompt_tokens: 10, total_tokens: 10 },
        }),
      });

      const texts = ['', 'Valid text', '   '];
      const results = await generateEmbeddings(texts);

      expect(results).toHaveLength(1);
    });
  });

  describe('EmbeddingResult interface', () => {
    it('should have correct structure', async () => {
      vi.stubEnv('AZURE_OPENAI_ENDPOINT', 'https://test.openai.azure.com');
      vi.stubEnv('AZURE_OPENAI_API_KEY', 'test-key');
      vi.stubEnv('AZURE_OPENAI_EMBEDDING_DEPLOYMENT', 'text-embedding-3-small');

      const mockVector = Array(1536).fill(0.1);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockVector, index: 0 }],
          usage: { prompt_tokens: 10, total_tokens: 10 },
        }),
      });

      const result: EmbeddingResult = await generateEmbedding('test');

      expect(result).toHaveProperty('vector');
      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('usage');
      expect(Array.isArray(result.vector)).toBe(true);
      expect(typeof result.model).toBe('string');
      expect(result.usage).toHaveProperty('tokens');

      vi.unstubAllEnvs();
    });
  });
});
