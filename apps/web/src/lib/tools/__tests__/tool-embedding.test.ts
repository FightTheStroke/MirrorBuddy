import { beforeEach, describe, expect, it, vi } from 'vitest';
import { extractTextForEmbedding, generateMaterialEmbeddingAsync } from '../tool-embedding';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { isEmbeddingConfigured } from '@/lib/rag';
import { generatePrivacyAwareEmbedding } from '@/lib/rag/server';

vi.mock('@/lib/db', () => ({ prisma: { contentEmbedding: { upsert: vi.fn() } } }));
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
}));
vi.mock('@/lib/rag', () => ({ isEmbeddingConfigured: vi.fn() }));
vi.mock('@/lib/rag/server', () => ({ generatePrivacyAwareEmbedding: vi.fn() }));

describe('material searchable text', () => {
  it('preserves common fields in order without coercing non-text values', () => {
    expect(
      extractTextForEmbedding(
        {
          title: 'Energy',
          topic: 'Physics',
          description: 'Motion',
          nodes: [],
        },
        'mindmap',
      ),
    ).toBe('Energy Physics Motion');
    expect(extractTextForEmbedding({ title: 42, topic: null, description: {} }, 'mindmap')).toBe(
      '',
    );
  });

  it('extracts mindmap labels and ignores malformed nodes', () => {
    expect(
      extractTextForEmbedding(
        {
          centralTopic: 'Energy',
          nodes: [{ label: 'Heat' }, { label: 12 }, {}, null, 'noise'],
        },
        'mindmap',
      ),
    ).toBe('Energy Heat 12');
  });

  it('extracts both sides of valid flashcards without coercing malformed sides', () => {
    expect(
      extractTextForEmbedding(
        {
          cards: [
            { front: 'Force', back: 'Mass times acceleration' },
            { front: 1, back: null },
            null,
            2,
          ],
        },
        'flashcards',
      ),
    ).toBe('Force Mass times acceleration');
  });

  it('indexes quiz questions, not answer choices', () => {
    expect(
      extractTextForEmbedding(
        {
          questions: [{ question: 'What is force?', options: ['A', 'B'] }, {}, null, false],
        },
        'quiz',
      ),
    ).toBe('What is force?');
  });

  it('extracts summary section headings and text', () => {
    expect(
      extractTextForEmbedding(
        {
          sections: [
            { title: 'Energy', content: 'Conserved quantity' },
            { title: false },
            null,
            'noise',
          ],
        },
        'summary',
      ),
    ).toBe('Energy Conserved quantity');
  });

  it('extracts timeline titles and descriptions', () => {
    expect(
      extractTextForEmbedding(
        {
          events: [{ title: '1687', description: 'Principia published' }, {}, null, 4],
        },
        'timeline',
      ),
    ).toBe('1687 Principia published');
  });

  it.each(['mindmap', 'flashcards', 'quiz', 'summary', 'timeline'])(
    'ignores absent or non-array collections for %s',
    (type) => {
      expect(extractTextForEmbedding({}, type)).toBe('');
      expect(
        extractTextForEmbedding(
          {
            nodes: {},
            cards: false,
            questions: 'text',
            sections: 1,
            events: null,
          },
          type,
        ),
      ).toBe('');
    },
  );

  it('indexes only long string values for unknown tools', () => {
    expect(
      extractTextForEmbedding(
        {
          body: 'A sufficiently long explanation',
          short: '1234567890',
          number: 22,
          absent: null,
        },
        'custom',
      ),
    ).toBe('A sufficiently long explanation');
  });
});

describe('material embedding persistence', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(isEmbeddingConfigured).mockReturnValue(true);
    vi.mocked(generatePrivacyAwareEmbedding).mockResolvedValue({
      vector: [0.1, 0.2],
      model: 'embedding-model',
      usage: { tokens: 12 },
    });
  });

  it('does not call the provider or database when disabled', async () => {
    vi.mocked(isEmbeddingConfigured).mockReturnValue(false);
    await generateMaterialEmbeddingAsync(
      'material',
      'user',
      { title: 'Long enough title' },
      'quiz',
    );
    expect(generatePrivacyAwareEmbedding).not.toHaveBeenCalled();
    expect(prisma.contentEmbedding.upsert).not.toHaveBeenCalled();
  });

  it.each(['', '123456789'])('skips text shorter than ten characters: %s', async (title) => {
    await generateMaterialEmbeddingAsync('material', 'user', { title }, 'quiz');
    expect(generatePrivacyAwareEmbedding).not.toHaveBeenCalled();
    expect(prisma.contentEmbedding.upsert).not.toHaveBeenCalled();
  });

  it('embeds text at the ten-character boundary and persists returned vector metadata', async () => {
    await generateMaterialEmbeddingAsync('material', 'user', { title: '1234567890' }, 'quiz');
    expect(generatePrivacyAwareEmbedding).toHaveBeenCalledWith('1234567890');
    expect(prisma.contentEmbedding.upsert).toHaveBeenCalledWith({
      where: {
        sourceType_sourceId_chunkIndex: {
          sourceType: 'material',
          sourceId: 'material',
          chunkIndex: 0,
        },
      },
      create: {
        userId: 'user',
        sourceType: 'material',
        sourceId: 'material',
        chunkIndex: 0,
        content: '1234567890',
        vector: '[0.1,0.2]',
        model: 'embedding-model',
        dimensions: 2,
        tokenCount: 12,
      },
      update: {
        content: '1234567890',
        vector: '[0.1,0.2]',
        model: 'embedding-model',
        tokenCount: 12,
      },
    });
  });

  it('caps provider input at 8000 and stored preview at 1000 characters', async () => {
    await generateMaterialEmbeddingAsync('material', 'user', { title: 'x'.repeat(9000) }, 'quiz');
    expect(generatePrivacyAwareEmbedding).toHaveBeenCalledWith('x'.repeat(8000));
    expect(prisma.contentEmbedding.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ content: 'x'.repeat(1000) }),
        update: expect.objectContaining({ content: 'x'.repeat(1000) }),
      }),
    );
  });

  it.each([new Error('provider unavailable'), 'unavailable'])(
    'logs provider failures without interrupting material saving',
    async (error) => {
      vi.mocked(generatePrivacyAwareEmbedding).mockRejectedValue(error);
      await expect(
        generateMaterialEmbeddingAsync('material', 'user', { title: 'Long enough title' }, 'quiz'),
      ).resolves.toBeUndefined();
      expect(prisma.contentEmbedding.upsert).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Failed to generate embedding for material', {
        materialId: 'material',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  );

  it('reports a database write failure after successful embedding', async () => {
    vi.mocked(prisma.contentEmbedding.upsert).mockRejectedValue(new Error('database unavailable'));
    await generateMaterialEmbeddingAsync(
      'material',
      'user',
      { title: 'Long enough title' },
      'quiz',
    );
    expect(logger.warn).toHaveBeenCalledWith('Failed to generate embedding for material', {
      materialId: 'material',
      error: 'database unavailable',
    });
  });
});
