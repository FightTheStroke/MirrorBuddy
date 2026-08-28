/**
 * Tests for the shared per-request query embedding
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/rag/server', () => ({
  isEmbeddingConfigured: vi.fn(),
  generatePrivacyAwareEmbedding: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    child: () => ({
      debug: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

const { isEmbeddingConfigured, generatePrivacyAwareEmbedding } = await import('@/lib/rag/server');
const { resolveQueryEmbedding } = await import('../query-embedding');

describe('resolveQueryEmbedding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isEmbeddingConfigured).mockReturnValue(true);
  });

  it('returns the generated vector', async () => {
    const vector = new Array(1536).fill(0.3);
    vi.mocked(generatePrivacyAwareEmbedding).mockResolvedValue({
      vector,
      model: 'text-embedding-3-small',
      usage: { tokens: 4 },
    });

    await expect(resolveQueryEmbedding('spiegami le frazioni')).resolves.toBe(vector);
  });

  it('generates the embedding exactly once per call', async () => {
    vi.mocked(generatePrivacyAwareEmbedding).mockResolvedValue({
      vector: new Array(1536).fill(0.3),
      model: 'text-embedding-3-small',
      usage: { tokens: 4 },
    });

    await resolveQueryEmbedding('spiegami le frazioni');

    expect(generatePrivacyAwareEmbedding).toHaveBeenCalledTimes(1);
  });

  it('returns undefined without calling the service when the query is empty', async () => {
    await expect(resolveQueryEmbedding('')).resolves.toBeUndefined();
    expect(generatePrivacyAwareEmbedding).not.toHaveBeenCalled();
  });

  it('returns undefined when the embedding service is not configured', async () => {
    vi.mocked(isEmbeddingConfigured).mockReturnValue(false);

    await expect(resolveQueryEmbedding('spiegami le frazioni')).resolves.toBeUndefined();
    expect(generatePrivacyAwareEmbedding).not.toHaveBeenCalled();
  });

  it('degrades to undefined instead of throwing when generation fails', async () => {
    vi.mocked(generatePrivacyAwareEmbedding).mockRejectedValue(new Error('azure down'));

    await expect(resolveQueryEmbedding('spiegami le frazioni')).resolves.toBeUndefined();
  });
});
