/**
 * Tests for LLM summarization and learning extraction
 * @module ai/summarize
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateConversationSummary,
  extractKeyFacts,
  extractTopics,
  extractLearnings,
  generateConversationTitle,
} from '../summarize';

// Mock dependencies
vi.mock('../providers', () => ({
  chatCompletion: vi.fn(),
  getActiveProvider: vi.fn(),
}));

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

// Mock tier service (ADR 0073)
vi.mock('@/lib/tier/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/tier/server')>();
  return {
    ...actual,
    tierService: {
      getFeatureAIConfigForUser: vi.fn(() =>
        Promise.resolve({ model: 'gpt-5-mini', temperature: 0.7, maxTokens: 1500 }),
      ),
    },
  };
});

// Mock deployment mapping
vi.mock('../providers/deployment-mapping', () => ({
  getDeploymentForModel: vi.fn((model: string) => model),
}));

import { chatCompletion, getActiveProvider } from '../providers';

const mockChatCompletion = vi.mocked(chatCompletion);
const mockGetActiveProvider = vi.mocked(getActiveProvider);

describe('Summarize Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateConversationSummary', () => {
    it('should generate summary when provider is available', async () => {
      mockGetActiveProvider.mockReturnValue({
        provider: 'azure',
        endpoint: 'https://test.openai.azure.com',
        model: 'gpt-4',
      });
      mockChatCompletion.mockResolvedValue({
        content: 'Lo studente ha chiesto aiuto con le frazioni e ha mostrato buona comprensione.',
        provider: 'azure',
        model: 'gpt-4',
      });

      const messages = [
        { role: 'user' as const, content: 'Come si sommano le frazioni?' },
        {
          role: 'assistant' as const,
          content: 'Per sommare le frazioni con lo stesso denominatore...',
        },
        {
          role: 'user' as const,
          content: 'Ah capisco! E se i denominatori sono diversi?',
        },
      ];

      const result = await generateConversationSummary(messages);

      expect(result).toContain('frazioni');
      expect(mockChatCompletion).toHaveBeenCalledOnce();
    });

    it('should throw error when no provider available', async () => {
      mockGetActiveProvider.mockReturnValue(null);

      const messages = [{ role: 'user' as const, content: 'Test' }];

      await expect(generateConversationSummary(messages)).rejects.toThrow(
        'No AI provider available for summarization',
      );
    });

    it('should format messages with STUDENTE/MAESTRO labels', async () => {
      mockGetActiveProvider.mockReturnValue({
        provider: 'azure',
        endpoint: 'https://test.openai.azure.com',
        model: 'gpt-4',
      });
      mockChatCompletion.mockResolvedValue({
        content: 'Riassunto della conversazione',
        provider: 'azure',
        model: 'gpt-4',
      });

      const messages = [
        { role: 'user' as const, content: 'Domanda' },
        { role: 'assistant' as const, content: 'Risposta' },
      ];

      await generateConversationSummary(messages);

      const callArgs = mockChatCompletion.mock.calls[0];
      const userPrompt = callArgs[0][0].content;
      expect(userPrompt).toContain('STUDENTE:');
      expect(userPrompt).toContain('MAESTRO:');
    });
  });

  describe('extractKeyFacts', () => {
    it('should extract key facts when provider is available', async () => {
      mockGetActiveProvider.mockReturnValue({
        provider: 'azure',
        endpoint: 'https://test.openai.azure.com',
        model: 'gpt-4',
      });
      mockChatCompletion.mockResolvedValue({
        content: JSON.stringify({
          decisions: ['vuole approfondire geometria'],
          preferences: ['preferisce esempi pratici'],
          learned: ['comprende il teorema di Pitagora'],
        }),
        provider: 'azure',
        model: 'gpt-4',
      });

      const messages = [
        { role: 'user' as const, content: 'Mi piacciono gli esempi pratici' },
        { role: 'assistant' as const, content: 'Ecco un esempio pratico...' },
      ];

      const result = await extractKeyFacts(messages);

      expect(result.decisions).toContain('vuole approfondire geometria');
      expect(result.preferences).toContain('preferisce esempi pratici');
      expect(result.learned).toContain('comprende il teorema di Pitagora');
    });

    it('should return empty arrays when no provider', async () => {
      mockGetActiveProvider.mockReturnValue(null);

      const messages = [{ role: 'user' as const, content: 'Test' }];
      const result = await extractKeyFacts(messages);

      expect(result).toEqual({
        decisions: [],
        preferences: [],
        learned: [],
      });
    });

    it('should return empty arrays on parse error', async () => {
      mockGetActiveProvider.mockReturnValue({
        provider: 'azure',
        endpoint: 'https://test.openai.azure.com',
        model: 'gpt-4',
      });
      mockChatCompletion.mockResolvedValue({
        content: 'invalid json response',
        provider: 'azure',
        model: 'gpt-4',
      });

      const messages = [{ role: 'user' as const, content: 'Test' }];
      const result = await extractKeyFacts(messages);

      expect(result).toEqual({
        decisions: [],
        preferences: [],
        learned: [],
      });
    });

    it('should extract JSON from mixed response', async () => {
      mockGetActiveProvider.mockReturnValue({
        provider: 'azure',
        endpoint: 'https://test.openai.azure.com',
        model: 'gpt-4',
      });
      mockChatCompletion.mockResolvedValue({
        content: 'Ecco i fatti: {"decisions": ["test"], "preferences": [], "learned": []}',
        provider: 'azure',
        model: 'gpt-4',
      });

      const messages = [{ role: 'user' as const, content: 'Test' }];
      const result = await extractKeyFacts(messages);

      expect(result.decisions).toContain('test');
    });

    it('should handle API errors gracefully', async () => {
      mockGetActiveProvider.mockReturnValue({
        provider: 'azure',
        endpoint: 'https://test.openai.azure.com',
        model: 'gpt-4',
      });
      mockChatCompletion.mockRejectedValue(new Error('API error'));

      const messages = [{ role: 'user' as const, content: 'Test' }];
      const result = await extractKeyFacts(messages);

      expect(result).toEqual({
        decisions: [],
        preferences: [],
        learned: [],
      });
    });
  });

  describe('extractTopics', () => {
    it('should extract topics array', async () => {
      mockGetActiveProvider.mockReturnValue({
        provider: 'azure',
        endpoint: 'https://test.openai.azure.com',
        model: 'gpt-4',
      });
      mockChatCompletion.mockResolvedValue({
        content: '["Matematica - Frazioni", "Geometria", "Esercizi"]',
        provider: 'azure',
        model: 'gpt-4',
      });

      const messages = [
        { role: 'user' as const, content: 'Parlami delle frazioni' },
        { role: 'assistant' as const, content: 'Le frazioni sono...' },
      ];

      const result = await extractTopics(messages);

      expect(result).toContain('Matematica - Frazioni');
      expect(result).toContain('Geometria');
      expect(result).toContain('Esercizi');
    });

    it('should return empty array when no provider', async () => {
      mockGetActiveProvider.mockReturnValue(null);

      const messages = [{ role: 'user' as const, content: 'Test' }];
      const result = await extractTopics(messages);

      expect(result).toEqual([]);
    });

    it('should return empty array on parse error', async () => {
      mockGetActiveProvider.mockReturnValue({
        provider: 'azure',
        endpoint: 'https://test.openai.azure.com',
        model: 'gpt-4',
      });
      mockChatCompletion.mockResolvedValue({
        content: 'not a valid array',
        provider: 'azure',
        model: 'gpt-4',
      });

      const messages = [{ role: 'user' as const, content: 'Test' }];
      const result = await extractTopics(messages);

      expect(result).toEqual([]);
    });

    it('should extract array from mixed response', async () => {
      mockGetActiveProvider.mockReturnValue({
        provider: 'azure',
        endpoint: 'https://test.openai.azure.com',
        model: 'gpt-4',
      });
      mockChatCompletion.mockResolvedValue({
        content: 'Gli argomenti sono: ["Storia", "Geografia"]',
        provider: 'azure',
        model: 'gpt-4',
      });

      const messages = [{ role: 'user' as const, content: 'Test' }];
      const result = await extractTopics(messages);

      expect(result).toContain('Storia');
      expect(result).toContain('Geografia');
    });

    it('should handle API errors gracefully', async () => {
      mockGetActiveProvider.mockReturnValue({
        provider: 'azure',
        endpoint: 'https://test.openai.azure.com',
        model: 'gpt-4',
      });
      mockChatCompletion.mockRejectedValue(new Error('Network error'));

      const messages = [{ role: 'user' as const, content: 'Test' }];
      const result = await extractTopics(messages);

      expect(result).toEqual([]);
    });
  });

  describe('extractLearnings', () => {
    it('should extract valid learnings', async () => {
      mockGetActiveProvider.mockReturnValue({
        provider: 'azure',
        endpoint: 'https://test.openai.azure.com',
        model: 'gpt-4',
      });
      mockChatCompletion.mockResolvedValue({
        content: JSON.stringify([
          {
            category: 'preference',
            insight: 'Preferisce esempi visivi',
            confidence: 0.8,
          },
          {
            category: 'weakness',
            insight: 'Difficoltà con le frazioni',
            confidence: 0.7,
          },
        ]),
        provider: 'azure',
        model: 'gpt-4',
      });

      const messages = [{ role: 'user', content: 'Non capisco le frazioni' }];
      const result = await extractLearnings(messages, 'archimede', 'matematica');

      expect(result).toHaveLength(2);
      expect(result[0].category).toBe('preference');
      expect(result[0].confidence).toBe(0.8);
    });

    it('should return empty array when no provider', async () => {
      mockGetActiveProvider.mockReturnValue(null);

      const messages = [{ role: 'user' as const, content: 'Test' }];
      const result = await extractLearnings(messages, 'archimede');

      expect(result).toEqual([]);
    });

    it('should filter invalid categories', async () => {
      mockGetActiveProvider.mockReturnValue({
        provider: 'azure',
        endpoint: 'https://test.openai.azure.com',
        model: 'gpt-4',
      });
      mockChatCompletion.mockResolvedValue({
        content: JSON.stringify([
          { category: 'invalid', insight: 'Test', confidence: 0.8 },
          { category: 'preference', insight: 'Valid', confidence: 0.7 },
        ]),
        provider: 'azure',
        model: 'gpt-4',
      });

      const messages = [{ role: 'user' as const, content: 'Test' }];
      const result = await extractLearnings(messages, 'archimede');

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('preference');
    });

    it('should filter learnings with low confidence', async () => {
      mockGetActiveProvider.mockReturnValue({
        provider: 'azure',
        endpoint: 'https://test.openai.azure.com',
        model: 'gpt-4',
      });
      mockChatCompletion.mockResolvedValue({
        content: JSON.stringify([
          { category: 'preference', insight: 'Too low', confidence: 0.2 },
          { category: 'strength', insight: 'Valid', confidence: 0.5 },
        ]),
        provider: 'azure',
        model: 'gpt-4',
      });

      const messages = [{ role: 'user' as const, content: 'Test' }];
      const result = await extractLearnings(messages, 'archimede');

      expect(result).toHaveLength(1);
      expect(result[0].insight).toBe('Valid');
    });

    it('should filter learnings with confidence above 1', async () => {
      mockGetActiveProvider.mockReturnValue({
        provider: 'azure',
        endpoint: 'https://test.openai.azure.com',
        model: 'gpt-4',
      });
      mockChatCompletion.mockResolvedValue({
        content: JSON.stringify([
          { category: 'preference', insight: 'Too high', confidence: 1.5 },
          { category: 'strength', insight: 'Valid', confidence: 0.9 },
        ]),
        provider: 'azure',
        model: 'gpt-4',
      });

      const messages = [{ role: 'user' as const, content: 'Test' }];
      const result = await extractLearnings(messages, 'archimede');

      expect(result).toHaveLength(1);
      expect(result[0].insight).toBe('Valid');
    });

    it('should limit to 3 learnings', async () => {
      mockGetActiveProvider.mockReturnValue({
        provider: 'azure',
        endpoint: 'https://test.openai.azure.com',
        model: 'gpt-4',
      });
      mockChatCompletion.mockResolvedValue({
        content: JSON.stringify([
          { category: 'preference', insight: 'One', confidence: 0.8 },
          { category: 'strength', insight: 'Two', confidence: 0.7 },
          { category: 'weakness', insight: 'Three', confidence: 0.6 },
          { category: 'interest', insight: 'Four', confidence: 0.5 },
          { category: 'style', insight: 'Five', confidence: 0.4 },
        ]),
        provider: 'azure',
        model: 'gpt-4',
      });

      const messages = [{ role: 'user' as const, content: 'Test' }];
      const result = await extractLearnings(messages, 'archimede');

      expect(result).toHaveLength(3);
    });

    it('should filter learnings without insight', async () => {
      mockGetActiveProvider.mockReturnValue({
        provider: 'azure',
        endpoint: 'https://test.openai.azure.com',
        model: 'gpt-4',
      });
      mockChatCompletion.mockResolvedValue({
        content: JSON.stringify([
          { category: 'preference', insight: '', confidence: 0.8 },
          { category: 'strength', insight: 'Valid', confidence: 0.7 },
        ]),
        provider: 'azure',
        model: 'gpt-4',
      });

      const messages = [{ role: 'user' as const, content: 'Test' }];
      const result = await extractLearnings(messages, 'archimede');

      expect(result).toHaveLength(1);
      expect(result[0].insight).toBe('Valid');
    });

    it('should handle API errors gracefully', async () => {
      mockGetActiveProvider.mockReturnValue({
        provider: 'azure',
        endpoint: 'https://test.openai.azure.com',
        model: 'gpt-4',
      });
      mockChatCompletion.mockRejectedValue(new Error('API error'));

      const messages = [{ role: 'user' as const, content: 'Test' }];
      const result = await extractLearnings(messages, 'archimede');

      expect(result).toEqual([]);
    });

    it('should handle invalid JSON response', async () => {
      mockGetActiveProvider.mockReturnValue({
        provider: 'azure',
        endpoint: 'https://test.openai.azure.com',
        model: 'gpt-4',
      });
      mockChatCompletion.mockResolvedValue({
        content: 'not valid json',
        provider: 'azure',
        model: 'gpt-4',
      });

      const messages = [{ role: 'user' as const, content: 'Test' }];
      const result = await extractLearnings(messages, 'archimede');

      expect(result).toEqual([]);
    });

    it('should accept all valid categories', async () => {
      const categories = ['preference', 'strength', 'weakness', 'interest', 'style'];

      mockGetActiveProvider.mockReturnValue({
        provider: 'azure',
        endpoint: 'https://test.openai.azure.com',
        model: 'gpt-4',
      });
      mockChatCompletion.mockResolvedValue({
        content: JSON.stringify(
          categories.map((cat, i) => ({
            category: cat,
            insight: `Insight ${i}`,
            confidence: 0.5,
          })),
        ),
        provider: 'azure',
        model: 'gpt-4',
      });

      const messages = [{ role: 'user' as const, content: 'Test' }];
      const result = await extractLearnings(messages, 'archimede');

      // Should have 3 (max limit)
      expect(result).toHaveLength(3);
      // All should have valid categories
      result.forEach((l) => {
        expect(categories).toContain(l.category);
      });
    });
  });

  describe('generateConversationTitle', () => {
    it('should return default title for empty messages', async () => {
      const result = await generateConversationTitle([]);
      expect(result).toBe('Nuova conversazione');
    });

    it('should use first user message as title', async () => {
      const messages = [
        { role: 'assistant' as const, content: 'Ciao!' },
        { role: 'user' as const, content: 'Come funzionano le frazioni?' },
      ];

      const result = await generateConversationTitle(messages);
      expect(result).toBe('Come funzionano le frazioni?');
    });

    it('should truncate long messages to 50 chars with ellipsis', async () => {
      const longMessage =
        'Questa è una domanda molto lunga che supera il limite di cinquanta caratteri imposto dal sistema';
      const messages = [{ role: 'user' as const, content: longMessage }];

      const result = await generateConversationTitle(messages);

      expect(result.length).toBeLessThanOrEqual(53); // 50 + "..."
      expect(result.endsWith('...')).toBe(true);
    });

    it('should not add ellipsis for short messages', async () => {
      const messages = [{ role: 'user' as const, content: 'Ciao!' }];

      const result = await generateConversationTitle(messages);

      expect(result).toBe('Ciao!');
      expect(result.endsWith('...')).toBe(false);
    });

    it('should return default if no user message', async () => {
      const messages = [
        { role: 'assistant' as const, content: 'Ciao!' },
        { role: 'assistant' as const, content: 'Come posso aiutarti?' },
      ];

      const result = await generateConversationTitle(messages);
      expect(result).toBe('Nuova conversazione');
    });

    it('should use first user message even if not first overall', async () => {
      const messages = [
        { role: 'assistant' as const, content: 'Benvenuto!' },
        { role: 'assistant' as const, content: 'Sono qui per aiutarti.' },
        { role: 'user' as const, content: 'Grazie, parliamo di storia' },
      ];

      const result = await generateConversationTitle(messages);
      expect(result).toBe('Grazie, parliamo di storia');
    });

    it('should handle exactly 50 character message', async () => {
      const exactMessage = '12345678901234567890123456789012345678901234567890';
      const messages = [{ role: 'user' as const, content: exactMessage }];

      const result = await generateConversationTitle(messages);

      expect(result).toBe(exactMessage);
      expect(result.endsWith('...')).toBe(false);
    });
  });
});
