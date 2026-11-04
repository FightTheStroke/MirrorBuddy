import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  checkPgvectorStatus: vi.fn(),
  searchSimilar: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: { $queryRaw: mocks.queryRaw } }));
vi.mock('../../../../lib/rag/vector-store', () => ({ searchSimilar: mocks.searchSimilar }));
vi.mock('../../../../lib/rag/pgvector-utils', () => ({
  checkPgvectorStatus: mocks.checkPgvectorStatus,
  formatVectorForPg: (vector: number[]) => `[${vector.join(',')}]`,
}));
vi.mock('../../../../lib/rag/embedding-service', () => ({ isEmbeddingConfigured: vi.fn() }));
vi.mock('../../../../lib/rag/privacy-aware-embedding', () => ({
  generatePrivacyAwareEmbedding: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

import { loadBatchedChatRetrieval } from '../rag-context';
import { logger } from '@/lib/logger';

function row(searchIndex: number, content: string, similarity = 0.8) {
  return {
    search_index: searchIndex,
    id: `${searchIndex}-${content}`,
    source_type: ['maestro_knowledge', 'material', 'studykit'][searchIndex],
    source_id: searchIndex === 0 ? 'euclide' : `source-${searchIndex}`,
    chunk_index: 0,
    content,
    similarity,
    subject: null,
    tags: '["math"]',
  };
}

describe('batched chat vector retrieval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkPgvectorStatus.mockResolvedValue({ available: true });
    mocks.queryRaw.mockResolvedValue([]);
    mocks.searchSimilar.mockResolvedValue([]);
  });

  it('retrieves all three corpora in one parameterized database call with isolated filters', async () => {
    mocks.queryRaw.mockResolvedValue([
      row(2, 'study kit'),
      row(1, 'material'),
      row(0, 'knowledge'),
    ]);

    const result = await loadBatchedChatRetrieval('student-1', 'euclide', [0.1, 0.2]);

    expect(mocks.queryRaw).toHaveBeenCalledTimes(1);
    expect(mocks.searchSimilar).not.toHaveBeenCalled();
    const query: Prisma.Sql = mocks.queryRaw.mock.calls[0][0];
    expect(query.text).toContain('UNION ALL');
    expect(query.text.match(/search_similar_embeddings\(/g)).toHaveLength(3);
    expect(query.text).not.toContain('student-1');
    expect(query.values).toEqual([
      0,
      'SYSTEM_MAESTRO_KB',
      '[0.1,0.2]',
      3,
      0.3,
      'maestro_knowledge',
      null,
      'euclide',
      1,
      'student-1',
      '[0.1,0.2]',
      3,
      0.6,
      'material',
      null,
      null,
      2,
      'student-1',
      '[0.1,0.2]',
      3,
      0.5,
      'studykit',
      null,
      null,
    ]);
    expect(result.maestroKnowledge).toBe('## Conoscenze Didattiche Rilevanti\nknowledge');
    expect(result.rag?.materials.map((hit) => hit.content)).toEqual(['material']);
    expect(result.rag?.studyKits.map((hit) => hit.content)).toEqual(['study kit']);
    expect(result.rag?.materials[0].tags).toEqual(['math']);
  });

  it('preserves descending similarity and excludes knowledge from another maestro', async () => {
    mocks.queryRaw.mockResolvedValue([
      row(0, 'unrelated maestro', 0.99),
      { ...row(0, 'knowledge', 0.7), source_id: 'feynman' },
      row(1, 'lower score', 0.7),
      row(1, 'higher score', 0.9),
    ]);

    const result = await loadBatchedChatRetrieval('student-1', 'feynman', [0.1]);

    expect(result.maestroKnowledge).toBe('## Conoscenze Didattiche Rilevanti\nknowledge');
    expect(result.rag?.materials.map((hit) => hit.content)).toEqual([
      'higher score',
      'lower score',
    ]);
  });

  it('does not search student corpora for an anonymous request', async () => {
    mocks.queryRaw.mockResolvedValue([row(0, 'knowledge')]);

    const result = await loadBatchedChatRetrieval(undefined, 'euclide', [0.1]);

    const query: Prisma.Sql = mocks.queryRaw.mock.calls[0][0];
    expect(query.text.match(/search_similar_embeddings\(/g)).toHaveLength(1);
    expect(query.values).not.toContain('material');
    expect(query.values).not.toContain('studykit');
    expect(result.rag).toBeNull();
    expect(result.maestroKnowledge).toContain('knowledge');
  });

  it('handles a missing maestro and empty corpora without mixing result groups', async () => {
    mocks.queryRaw.mockResolvedValue([{ ...row(1, 'study kit'), source_type: 'studykit' }]);

    const result = await loadBatchedChatRetrieval('student-1', undefined, [0.1]);

    expect(result).toMatchObject({
      maestroKnowledge: '',
      rag: { materials: [], studyKits: [{ content: 'study kit' }] },
    });
    expect(mocks.queryRaw).toHaveBeenCalledTimes(1);
  });

  it('skips database work when neither corpus owner is present', async () => {
    expect(await loadBatchedChatRetrieval(undefined, undefined, [0.1])).toEqual({
      maestroKnowledge: '',
      rag: null,
    });
    expect(mocks.queryRaw).not.toHaveBeenCalled();
  });

  it('keeps maestro knowledge if the native batch and one student fallback fail', async () => {
    mocks.queryRaw.mockRejectedValue(new Error('search function unavailable'));
    mocks.searchSimilar
      .mockResolvedValueOnce([{ ...row(0, 'knowledge'), sourceId: 'euclide' }])
      .mockRejectedValueOnce(new Error('student search failed'))
      .mockResolvedValueOnce([]);

    const result = await loadBatchedChatRetrieval('student-1', 'euclide', [0.1]);

    expect(result.maestroKnowledge).toContain('knowledge');
    expect(result.rag).toBeNull();
    expect(mocks.searchSimilar).toHaveBeenCalledTimes(3);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('uses the existing fallback without native queries when pgvector is unavailable', async () => {
    mocks.checkPgvectorStatus.mockResolvedValue({ available: false });

    expect(await loadBatchedChatRetrieval('student-1', 'euclide', [0.1])).toEqual({
      maestroKnowledge: '',
      rag: { materials: [], studyKits: [] },
    });
    expect(mocks.queryRaw).not.toHaveBeenCalled();
    expect(mocks.searchSimilar).toHaveBeenCalledTimes(3);
  });
});
