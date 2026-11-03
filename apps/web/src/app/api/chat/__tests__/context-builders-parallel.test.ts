import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  findSimilarMaterials: vi.fn(),
  findRelatedConcepts: vi.fn(),
  retrieveMaestroKnowledge: vi.fn(),
}));

vi.mock('@/lib/rag/server', () => mocks);
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
}));
vi.mock('@/lib/conversation/memory-loader', () => ({ loadPreviousContext: vi.fn() }));
vi.mock('@/lib/conversation/prompt-enhancer', () => ({ enhanceSystemPrompt: vi.fn() }));
vi.mock('@/lib/tools/tool-context-builder', () => ({ buildToolContext: vi.fn() }));
vi.mock('@/data/maestri', () => ({ getMaestroById: vi.fn() }));
vi.mock('@/lib/education', () => ({ buildAdaptiveInstruction: vi.fn(() => '') }));
vi.mock('@/lib/education/server', () => ({ getAdaptiveContextForUser: vi.fn() }));
vi.mock('@/lib/i18n/language-instructions', () => ({ getLanguageInstruction: () => 'LANG' }));
vi.mock('../query-embedding', () => ({ resolveQueryEmbedding: vi.fn(async () => [0.1]) }));

import { buildAllContexts, injectRAGContext } from '../context-builders';

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('chat vector retrievals run concurrently', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts maestro KB, materials and study kits before any of them finishes', async () => {
    const kb = deferred<string>();
    const mats = deferred<unknown[]>();
    const kits = deferred<unknown[]>();
    mocks.retrieveMaestroKnowledge.mockReturnValue(kb.promise);
    mocks.findSimilarMaterials.mockReturnValue(mats.promise);
    mocks.findRelatedConcepts.mockReturnValue(kits.promise);

    const pending = buildAllContexts({
      systemPrompt: 'BASE',
      userId: 'u1',
      maestroId: 'euclide',
      lastUserMessage: 'domanda',
    });

    await vi.waitFor(() => {
      expect(mocks.retrieveMaestroKnowledge).toHaveBeenCalledTimes(1);
      expect(mocks.findSimilarMaterials).toHaveBeenCalledTimes(1);
      expect(mocks.findRelatedConcepts).toHaveBeenCalledTimes(1);
    });

    kb.resolve('## KB');
    mats.resolve([{ content: 'mat', similarity: 0.9 }]);
    kits.resolve([{ content: 'kit', similarity: 0.7 }]);
    const result = await pending;

    expect(result.hasRAG).toBe(true);
    expect(result.ragResultsForTransparency.map((r) => r.content)).toEqual(['mat', 'kit']);
    // Original order: maestro knowledge first, then student materials.
    expect(result.enhancedPrompt.indexOf('## KB')).toBeLessThan(
      result.enhancedPrompt.indexOf('- mat'),
    );
  });

  it('keeps the prompt unchanged when a retrieval fails', async () => {
    mocks.findSimilarMaterials.mockRejectedValue(new Error('db down'));
    mocks.findRelatedConcepts.mockResolvedValue([]);

    const result = await injectRAGContext('BASE', 'u1', 'q', [0.1]);

    expect(result).toEqual({ enhancedPrompt: 'BASE', hasRAG: false, ragResults: [] });
  });
});
