// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: {
    conversation: { count: vi.fn().mockResolvedValue(0) },
    $disconnect: vi.fn().mockResolvedValue(undefined),
  },
}));
import * as summaryIndexer from '../../apps/web/src/lib/rag/summary-indexer';
import { processConversationBatch } from '../migrate-summary-embeddings';

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('summary migration nullable database boundary', () => {
  it('counts missing summaries as failures without submitting them for embedding', async () => {
    const index = vi.spyOn(summaryIndexer, 'indexConversationSummary').mockResolvedValue(undefined);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const base = { userId: 'user-1', maestroId: 'euclide', topics: '["geometry"]' };
    const result = await processConversationBatch(
      [
        { ...base, id: 'missing', summary: null },
        { ...base, id: 'present', summary: 'A triangle has three sides.' },
      ],
      0,
    );
    expect(result).toEqual({
      successful: 1,
      failed: 1,
      errors: [{ id: 'missing', error: 'Conversation summary is missing' }],
    });
    expect(index).toHaveBeenCalledExactlyOnceWith(
      'present',
      'user-1',
      'A triangle has three sides.',
      { maestroId: 'euclide', topics: ['geometry'] },
    );
  });
});
