/**
 * Tests for Maestro Knowledge Retriever
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  retrieveMaestroKnowledge,
  retrieveMaestroKnowledgeRaw,
} from './maestro-knowledge-retriever';

vi.mock('./embedding-service', () => ({
  isEmbeddingConfigured: vi.fn(),
}));

vi.mock('./privacy-aware-embedding', () => ({
  generatePrivacyAwareEmbedding: vi.fn(),
}));

vi.mock('./vector-store', () => ({
  searchSimilar: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

const { isEmbeddingConfigured } = await import('./embedding-service');
const { generatePrivacyAwareEmbedding } = await import('./privacy-aware-embedding');
const { searchSimilar } = await import('./vector-store');

describe('retrieveMaestroKnowledge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty string when embedding not configured (graceful fallback)', async () => {
    vi.mocked(isEmbeddingConfigured).mockReturnValue(false);

    const result = await retrieveMaestroKnowledge('feynman', 'explain derivatives');
    expect(result).toBe('');
    expect(searchSimilar).not.toHaveBeenCalled();
  });

  it('returns empty string for empty query', async () => {
    vi.mocked(isEmbeddingConfigured).mockReturnValue(true);

    const result = await retrieveMaestroKnowledge('feynman', '');
    expect(result).toBe('');
  });

  it('returns empty string for empty maestroId', async () => {
    vi.mocked(isEmbeddingConfigured).mockReturnValue(true);

    const result = await retrieveMaestroKnowledge('', 'explain derivatives');
    expect(result).toBe('');
  });

  it('returns formatted knowledge when results found', async () => {
    vi.mocked(isEmbeddingConfigured).mockReturnValue(true);
    vi.mocked(generatePrivacyAwareEmbedding).mockResolvedValue({
      vector: new Array(1536).fill(0.1),
      model: 'text-embedding-3-small',
      usage: { tokens: 5 },
    });
    vi.mocked(searchSimilar).mockResolvedValue([
      {
        id: '1',
        sourceType: 'maestro_knowledge',
        sourceId: 'feynman',
        chunkIndex: 0,
        content: 'QED is the most precise theory in physics',
        similarity: 0.85,
        subject: 'physics',
        tags: [],
      },
      {
        id: '2',
        sourceType: 'maestro_knowledge',
        sourceId: 'feynman',
        chunkIndex: 1,
        content: 'Feynman diagrams visualize particle interactions',
        similarity: 0.72,
        subject: 'physics',
        tags: [],
      },
    ]);

    const result = await retrieveMaestroKnowledge('feynman', 'explain quantum electrodynamics');

    expect(result).toContain('## Conoscenze Didattiche Rilevanti');
    expect(result).toContain('QED is the most precise theory');
    expect(result).toContain('Feynman diagrams');
    expect(searchSimilar).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'SYSTEM_MAESTRO_KB',
        sourceType: 'maestro_knowledge',
      }),
    );
  });

  it('filters results by maestroId', async () => {
    vi.mocked(isEmbeddingConfigured).mockReturnValue(true);
    vi.mocked(generatePrivacyAwareEmbedding).mockResolvedValue({
      vector: new Array(1536).fill(0.1),
      model: 'text-embedding-3-small',
      usage: { tokens: 5 },
    });
    vi.mocked(searchSimilar).mockResolvedValue([
      {
        id: '1',
        sourceType: 'maestro_knowledge',
        sourceId: 'feynman',
        chunkIndex: 0,
        content: 'Physics content',
        similarity: 0.8,
        subject: 'physics',
        tags: [],
      },
      {
        id: '2',
        sourceType: 'maestro_knowledge',
        sourceId: 'galileo',
        chunkIndex: 0,
        content: 'Other maestro content',
        similarity: 0.7,
        subject: 'physics',
        tags: [],
      },
    ]);

    const result = await retrieveMaestroKnowledge('feynman', 'physics question');
    expect(result).toContain('Physics content');
    expect(result).not.toContain('Other maestro content');
  });

  it('returns empty string when no matching results', async () => {
    vi.mocked(isEmbeddingConfigured).mockReturnValue(true);
    vi.mocked(generatePrivacyAwareEmbedding).mockResolvedValue({
      vector: new Array(1536).fill(0.1),
      model: 'text-embedding-3-small',
      usage: { tokens: 5 },
    });
    vi.mocked(searchSimilar).mockResolvedValue([]);

    const result = await retrieveMaestroKnowledge('feynman', 'cooking recipes');
    expect(result).toBe('');
  });

  it('handles errors gracefully', async () => {
    vi.mocked(isEmbeddingConfigured).mockReturnValue(true);
    vi.mocked(generatePrivacyAwareEmbedding).mockRejectedValue(new Error('Embedding service down'));

    const result = await retrieveMaestroKnowledge('feynman', 'test query');
    expect(result).toBe('');
  });
});

describe('retrieveMaestroKnowledgeRaw', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when embedding not configured', async () => {
    vi.mocked(isEmbeddingConfigured).mockReturnValue(false);

    const results = await retrieveMaestroKnowledgeRaw('feynman', 'test');
    expect(results).toEqual([]);
  });

  it('returns raw results with similarity scores', async () => {
    vi.mocked(isEmbeddingConfigured).mockReturnValue(true);
    vi.mocked(generatePrivacyAwareEmbedding).mockResolvedValue({
      vector: new Array(1536).fill(0.1),
      model: 'text-embedding-3-small',
      usage: { tokens: 5 },
    });
    vi.mocked(searchSimilar).mockResolvedValue([
      {
        id: '1',
        sourceType: 'maestro_knowledge',
        sourceId: 'feynman',
        chunkIndex: 2,
        content: 'Feynman diagrams',
        similarity: 0.9,
        subject: 'physics',
        tags: [],
      },
    ]);

    const results = await retrieveMaestroKnowledgeRaw('feynman', 'diagrams');
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      content: 'Feynman diagrams',
      similarity: 0.9,
      chunkIndex: 2,
    });
  });
});

describe('maestro scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isEmbeddingConfigured).mockReturnValue(true);
    vi.mocked(generatePrivacyAwareEmbedding).mockResolvedValue({
      vector: new Array(1536).fill(0.1),
      model: 'text-embedding-3-small',
      usage: { tokens: 5 },
    });
    vi.mocked(searchSimilar).mockResolvedValue([]);
  });

  // The store ranks and truncates to `limit` before the caller sees anything,
  // so asking for the global top-N and discarding the other maestri afterwards
  // means a maestro has to outrank all the others to be read at all. Measured
  // against production on 20 Aug 2026: 69 chunks recovered of 83 available,
  // and nothing at all for feynman on an ordinary question (finding G-11).
  it('asks the store for one maestro rather than narrowing afterwards', async () => {
    await retrieveMaestroKnowledge('feynman', 'spiegami la fisica in modo semplice');

    expect(searchSimilar).toHaveBeenCalledWith(
      expect.objectContaining({ sourceType: 'maestro_knowledge', sourceId: 'feynman' }),
    );
  });

  it('scopes the raw variant to the same maestro', async () => {
    await retrieveMaestroKnowledgeRaw('curie', 'radioattivita');

    expect(searchSimilar).toHaveBeenCalledWith(
      expect.objectContaining({ sourceType: 'maestro_knowledge', sourceId: 'curie' }),
    );
  });

  // Defence in depth: a database still carrying the six-argument search
  // function falls back to the JS path, and the persona boundary must hold
  // whichever path answered.
  it('still drops a foreign maestro if one reaches the caller', async () => {
    vi.mocked(searchSimilar).mockResolvedValue([
      {
        id: '1',
        sourceType: 'maestro_knowledge',
        sourceId: 'mascetti',
        chunkIndex: 0,
        content: 'supercazzola',
        similarity: 0.9,
        subject: 'italiano',
        tags: [],
      },
    ]);

    const result = await retrieveMaestroKnowledge('feynman', 'fisica');
    expect(result).toBe('');
  });
});

describe('retrieveMaestroKnowledge embedding reuse', () => {
  const precomputed = new Array(1536).fill(0.42);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isEmbeddingConfigured).mockReturnValue(true);
    vi.mocked(searchSimilar).mockResolvedValue([]);
  });

  it('does not regenerate the embedding when one is supplied', async () => {
    await retrieveMaestroKnowledge('feynman', 'spiegami la fisica', undefined, precomputed);

    expect(generatePrivacyAwareEmbedding).not.toHaveBeenCalled();
  });

  it('searches with the supplied vector', async () => {
    await retrieveMaestroKnowledge('feynman', 'spiegami la fisica', undefined, precomputed);

    expect(searchSimilar).toHaveBeenCalledWith(expect.objectContaining({ vector: precomputed }));
  });

  it('still generates the embedding when none is supplied', async () => {
    vi.mocked(generatePrivacyAwareEmbedding).mockResolvedValue({
      vector: new Array(1536).fill(0.1),
      model: 'text-embedding-3-small',
      usage: { tokens: 5 },
    });

    await retrieveMaestroKnowledge('feynman', 'spiegami la fisica');

    expect(generatePrivacyAwareEmbedding).toHaveBeenCalledTimes(1);
  });

  it('works with a supplied vector even when the embedding service is unconfigured', async () => {
    vi.mocked(isEmbeddingConfigured).mockReturnValue(false);

    await retrieveMaestroKnowledge('feynman', 'spiegami la fisica', undefined, precomputed);

    expect(searchSimilar).toHaveBeenCalledTimes(1);
  });
});
