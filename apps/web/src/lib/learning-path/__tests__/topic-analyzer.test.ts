/**
 * Tests for topic-analyzer.ts
 * Plan 8 MVP - Wave 1: Pedagogical Analysis [F-06, F-07, F-09]
 *
 * @vitest-environment node
 * @module learning-path/__tests__/topic-analyzer.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { analyzeTopics, orderTopicsPedagogically, type IdentifiedTopic } from '../topic-analyzer';

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

// Mock AI provider
vi.mock('@/lib/ai/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai/server')>();
  return {
    ...actual,
    chatCompletion: vi.fn(),
  };
});

// Mock tier service (ADR 0073)
vi.mock('@/lib/tier/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/tier/server')>();
  return {
    ...actual,
    tierService: {
      getFeatureAIConfigForUser: vi.fn(() =>
        Promise.resolve({ model: 'gpt-5-mini', temperature: 0.5, maxTokens: 2500 }),
      ),
    },
  };
});

// Mock deployment mapping

import { chatCompletion } from '@/lib/ai/server';
const mockChatCompletion = vi.mocked(chatCompletion);

// Minimum valid text (>100 chars) for tests that need to bypass validation
const MIN_VALID_TEXT =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.';

describe('topic-analyzer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // analyzeTopics - [F-06] Identify macro-topics
  // ============================================================================
  describe('analyzeTopics', () => {
    it('should identify 3 topics from Roman History text [F-06]', async () => {
      // Mock AI response for Roman History analysis
      const mockResponse = {
        content: JSON.stringify({
          documentTitle: 'Storia Romana',
          topics: [
            {
              id: 'topic-1',
              title: 'Le Origini di Roma',
              description: 'La fondazione di Roma e i sette re',
              keyConcepts: ['Romolo e Remo', 'I sette re', 'Fondazione 753 a.C.'],
              estimatedDifficulty: 'basic',
              order: 1,
              estimatedMinutes: 10,
              textExcerpt: 'Roma fu fondata secondo la tradizione...',
            },
            {
              id: 'topic-2',
              title: 'La Repubblica Romana',
              description: 'Il periodo repubblicano e le sue istituzioni',
              keyConcepts: ['Senato', 'Consoli', 'Guerre Puniche'],
              estimatedDifficulty: 'intermediate',
              order: 2,
              estimatedMinutes: 15,
              textExcerpt: 'Dopo la cacciata dei re...',
            },
            {
              id: 'topic-3',
              title: "L'Impero Romano",
              description: 'Da Augusto alla caduta',
              keyConcepts: ['Augusto', 'Pax Romana', 'Decadenza'],
              estimatedDifficulty: 'advanced',
              order: 3,
              estimatedMinutes: 15,
              textExcerpt: "Con Augusto inizia l'età imperiale...",
            },
          ],
          suggestedOrder: ['topic-1', 'topic-2', 'topic-3'],
          totalEstimatedMinutes: 40,
        }),
        provider: 'azure' as const,
        model: 'gpt-5-mini',
      };

      mockChatCompletion.mockResolvedValue(mockResponse);

      const romanHistoryText = `
        Roma fu fondata secondo la tradizione nel 753 a.C. da Romolo.
        I sette re di Roma governarono fino al 509 a.C.
        La Repubblica Romana si estese con le guerre puniche.
        L'Impero Romano iniziò con Augusto nel 27 a.C.
      `;

      const result = await analyzeTopics(romanHistoryText, 'Storia Romana', 'storia');

      // Verify F-06: identifies 2-5 topics
      expect(result.topics.length).toBeGreaterThanOrEqual(2);
      expect(result.topics.length).toBeLessThanOrEqual(5);

      // Verify correct topics identified
      expect(result.topics[0].title).toBe('Le Origini di Roma');
      expect(result.topics[1].title).toBe('La Repubblica Romana');
      expect(result.topics[2].title).toBe("L'Impero Romano");

      // Verify document title
      expect(result.documentTitle).toBe('Storia Romana');
    });

    it('should extract 3-5 key concepts per topic [F-07]', async () => {
      const mockResponse = {
        content: JSON.stringify({
          documentTitle: 'Test Document',
          topics: [
            {
              id: 'topic-1',
              title: 'Topic A',
              description: 'Description A',
              keyConcepts: ['concept1', 'concept2', 'concept3', 'concept4'],
              estimatedDifficulty: 'basic',
              order: 1,
              textExcerpt: 'Excerpt...',
            },
          ],
          suggestedOrder: ['topic-1'],
          totalEstimatedMinutes: 10,
        }),
        provider: 'azure' as const,
        model: 'gpt-5-mini',
      };

      mockChatCompletion.mockResolvedValue(mockResponse);

      const result = await analyzeTopics(MIN_VALID_TEXT, 'Test Doc');

      // Verify F-07: 3-5 key concepts
      expect(result.topics[0].keyConcepts.length).toBeGreaterThanOrEqual(3);
      expect(result.topics[0].keyConcepts.length).toBeLessThanOrEqual(5);
    });

    it('should suggest pedagogical order [F-09]', async () => {
      const mockResponse = {
        content: JSON.stringify({
          documentTitle: 'Test',
          topics: [
            {
              id: 't1',
              title: 'Basic',
              description: 'd1',
              keyConcepts: ['a'],
              estimatedDifficulty: 'basic',
              order: 1,
              textExcerpt: '',
            },
            {
              id: 't2',
              title: 'Advanced',
              description: 'd2',
              keyConcepts: ['b'],
              estimatedDifficulty: 'advanced',
              order: 2,
              textExcerpt: '',
            },
          ],
          suggestedOrder: ['t1', 't2'],
          totalEstimatedMinutes: 20,
        }),
        provider: 'azure' as const,
        model: 'gpt-5-mini',
      };

      mockChatCompletion.mockResolvedValue(mockResponse);

      const result = await analyzeTopics(MIN_VALID_TEXT, 'Test');

      // Verify F-09: suggested order exists
      expect(result.suggestedOrder).toEqual(['t1', 't2']);

      // Verify basic comes before advanced
      const basicTopic = result.topics.find((t) => t.estimatedDifficulty === 'basic');
      const advancedTopic = result.topics.find((t) => t.estimatedDifficulty === 'advanced');
      expect(basicTopic?.order).toBeLessThan(advancedTopic?.order ?? 0);
    });

    it('should handle malformed JSON gracefully', async () => {
      mockChatCompletion.mockResolvedValue({
        content: 'invalid json',
        provider: 'azure' as const,
        model: 'gpt-5-mini',
      });

      await expect(analyzeTopics(MIN_VALID_TEXT, 'title')).rejects.toThrow(
        'Failed to parse topic analysis response',
      );
    });

    it('should handle missing topics array', async () => {
      mockChatCompletion.mockResolvedValue({
        content: JSON.stringify({ documentTitle: 'Test' }),
        provider: 'azure' as const,
        model: 'gpt-5-mini',
      });

      await expect(analyzeTopics(MIN_VALID_TEXT, 'title')).rejects.toThrow(
        'Invalid topic analysis structure: missing topics array',
      );
    });

    it('should reject text that is too short', async () => {
      await expect(analyzeTopics('short text', 'title')).rejects.toThrow(
        'Invalid input: text is too short',
      );
    });

    it('should reject empty text', async () => {
      await expect(analyzeTopics('', 'title')).rejects.toThrow('Invalid input: text is required');
    });

    it('should reject empty title', async () => {
      await expect(analyzeTopics(MIN_VALID_TEXT, '')).rejects.toThrow(
        'Invalid input: title is required',
      );
    });
  });

  // ============================================================================
  // orderTopicsPedagogically - [F-09]
  // ============================================================================
  describe('orderTopicsPedagogically', () => {
    it('should sort topics by order field', () => {
      const topics: IdentifiedTopic[] = [
        {
          id: 't3',
          title: 'Third',
          description: '',
          keyConcepts: [],
          estimatedDifficulty: 'advanced',
          order: 3,
          textExcerpt: '',
        },
        {
          id: 't1',
          title: 'First',
          description: '',
          keyConcepts: [],
          estimatedDifficulty: 'basic',
          order: 1,
          textExcerpt: '',
        },
        {
          id: 't2',
          title: 'Second',
          description: '',
          keyConcepts: [],
          estimatedDifficulty: 'intermediate',
          order: 2,
          textExcerpt: '',
        },
      ];

      const sorted = orderTopicsPedagogically(topics);

      expect(sorted[0].title).toBe('First');
      expect(sorted[1].title).toBe('Second');
      expect(sorted[2].title).toBe('Third');
    });

    it('should not mutate original array', () => {
      const topics: IdentifiedTopic[] = [
        {
          id: 't2',
          title: 'Second',
          description: '',
          keyConcepts: [],
          estimatedDifficulty: 'intermediate',
          order: 2,
          textExcerpt: '',
        },
        {
          id: 't1',
          title: 'First',
          description: '',
          keyConcepts: [],
          estimatedDifficulty: 'basic',
          order: 1,
          textExcerpt: '',
        },
      ];

      const sorted = orderTopicsPedagogically(topics);

      // Original should be unchanged
      expect(topics[0].title).toBe('Second');
      // Sorted should have correct order
      expect(sorted[0].title).toBe('First');
    });
  });
});
