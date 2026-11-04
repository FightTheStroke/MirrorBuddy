import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  findSimilarMaterials: vi.fn(),
  findRelatedConcepts: vi.fn(),
  retrieveMaestroKnowledge: vi.fn(),
  loadBatchedChatRetrieval: vi.fn(),
  resolveQueryEmbedding: vi.fn(),
}));

vi.mock('@/lib/rag/server', () => mocks);
vi.mock('../rag-context', () => ({
  loadBatchedChatRetrieval: mocks.loadBatchedChatRetrieval,
}));
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
vi.mock('../query-embedding', () => ({
  resolveQueryEmbedding: mocks.resolveQueryEmbedding,
}));

import { buildAllContexts, injectRAGContext } from '../context-builders';

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('chat vector retrievals run concurrently', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveQueryEmbedding.mockResolvedValue(undefined);
  });

  it('uses one batch for a shared embedding and preserves prompt and transparency order', async () => {
    mocks.resolveQueryEmbedding.mockResolvedValue([0.1]);
    mocks.loadBatchedChatRetrieval.mockResolvedValue({
      maestroKnowledge: '## KB',
      rag: {
        materials: [{ content: 'mat', similarity: 0.9 }],
        studyKits: [{ content: 'kit', similarity: 0.7 }],
      },
    });

    const result = await buildAllContexts({
      systemPrompt: 'BASE',
      userId: 'u1',
      maestroId: 'euclide',
      lastUserMessage: 'question',
    });

    expect(mocks.loadBatchedChatRetrieval).toHaveBeenCalledExactlyOnceWith('u1', 'euclide', [0.1]);
    expect(mocks.retrieveMaestroKnowledge).not.toHaveBeenCalled();
    expect(mocks.findSimilarMaterials).not.toHaveBeenCalled();
    expect(mocks.findRelatedConcepts).not.toHaveBeenCalled();
    expect(result.hasRAG).toBe(true);
    expect(result.ragResultsForTransparency.map((hit) => hit.content)).toEqual(['mat', 'kit']);
    expect(result.enhancedPrompt.indexOf('## KB')).toBeLessThan(
      result.enhancedPrompt.indexOf('- mat'),
    );
  });

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

  it('does not mix account-wide student material into a document conversation', async () => {
    mocks.resolveQueryEmbedding.mockResolvedValue([0.1]);
    mocks.loadBatchedChatRetrieval.mockResolvedValue({
      maestroKnowledge: '## Teacher knowledge',
      rag: null,
    });

    const result = await buildAllContexts({
      systemPrompt: 'BASE',
      userId: 'u1',
      maestroId: 'manzoni',
      conversationId: 'conversation-1',
      enableMemory: true,
      hasAttachments: true,
      lastUserMessage: 'Summarize these pages',
    });

    expect(mocks.loadBatchedChatRetrieval).toHaveBeenCalledExactlyOnceWith(
      undefined,
      'manzoni',
      [0.1],
    );
    expect(mocks.findSimilarMaterials).not.toHaveBeenCalled();
    expect(mocks.findRelatedConcepts).not.toHaveBeenCalled();
    expect(result.hasMemory).toBe(false);
    expect(result.hasToolContext).toBe(false);
    expect(result.ragResultsForTransparency).toEqual([]);
    expect(result.enhancedPrompt).toContain('Teacher knowledge');
  });

  it('keeps the prompt unchanged when a retrieval fails', async () => {
    mocks.findSimilarMaterials.mockRejectedValue(new Error('db down'));
    mocks.findRelatedConcepts.mockResolvedValue([]);

    const result = await injectRAGContext('BASE', 'u1', 'q', [0.1]);

    expect(result).toEqual({ enhancedPrompt: 'BASE', hasRAG: false, ragResults: [] });
  });
});
