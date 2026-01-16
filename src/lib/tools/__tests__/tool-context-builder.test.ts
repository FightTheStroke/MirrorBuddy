// ============================================================================
// TOOL CONTEXT BUILDER TESTS
// Verify tool context injection for AI
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getToolOutputs,
  buildToolContext,
  formatToolOutput,
  type ToolOutput,
} from '../tool-context-builder';
import { prisma } from '@/lib/db';

// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    material: {
      findMany: vi.fn(),
    },
  },
}));

describe('tool-context-builder', () => {
  const userId = 'test-user-123';
  const conversationId = 'conv-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getToolOutputs', () => {
    it('should retrieve tool outputs for conversation', async () => {
      const mockMaterials = [
        {
          toolId: 'tool-1',
          toolType: 'quiz',
          title: 'Math Quiz',
          content: JSON.stringify({ questions: [{ question: 'What is 2+2?', correctAnswer: '4' }] }),
          createdAt: new Date('2024-01-01'),
        },
      ];

      vi.mocked(prisma.material.findMany).mockResolvedValue(mockMaterials as any);

      const outputs = await getToolOutputs(userId, conversationId);

      expect(outputs).toHaveLength(1);
      expect(outputs[0].type).toBe('quiz');
      expect(outputs[0].title).toBe('Math Quiz');
      expect(prisma.material.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          conversationId,
          status: 'active',
        },
        orderBy: { createdAt: 'asc' },
        select: expect.any(Object),
      });
    });

    it('should return empty array on error', async () => {
      vi.mocked(prisma.material.findMany).mockRejectedValue(new Error('DB error'));

      const outputs = await getToolOutputs(userId, conversationId);

      expect(outputs).toEqual([]);
    });
  });

  describe('formatToolOutput', () => {
    it('should format quiz output', () => {
      const output: ToolOutput = {
        toolId: 'tool-1',
        type: 'quiz',
        title: 'Math Quiz',
        content: {
          questions: [
            { question: 'What is 2+2?', correctAnswer: '4' },
            { question: 'What is 3+3?', correctAnswer: '6' },
          ],
        },
        createdAt: new Date(),
      };

      const formatted = formatToolOutput(output);

      expect(formatted).toContain('**Quiz: Math Quiz**');
      expect(formatted).toContain('1. What is 2+2?');
      expect(formatted).toContain('Risposta: 4');
      expect(formatted).toContain('2. What is 3+3?');
    });

    it('should format mindmap output', () => {
      const output: ToolOutput = {
        toolId: 'tool-2',
        type: 'mindmap',
        title: 'Biology Concepts',
        content: {
          root: { label: 'Cell' },
          nodes: [
            { label: 'Nucleus' },
            { label: 'Mitochondria' },
          ],
        },
        createdAt: new Date(),
      };

      const formatted = formatToolOutput(output);

      expect(formatted).toContain('**Mappa mentale: Biology Concepts**');
      expect(formatted).toContain('Concetto centrale: Cell');
      expect(formatted).toContain('Nucleus');
    });

    it('should format flashcard output', () => {
      const output: ToolOutput = {
        toolId: 'tool-3',
        type: 'flashcard',
        title: 'History Facts',
        content: {
          cards: [
            { front: 'When did WWII start?', back: '1939' },
            { front: 'When did WWII end?', back: '1945' },
          ],
        },
        createdAt: new Date(),
      };

      const formatted = formatToolOutput(output);

      expect(formatted).toContain('**Flashcard: History Facts**');
      expect(formatted).toContain('When did WWII start? → 1939');
    });
  });

  describe('buildToolContext', () => {
    it('should build formatted context string', async () => {
      const mockMaterials = [
        {
          toolId: 'tool-1',
          toolType: 'quiz',
          title: 'Math Quiz',
          content: JSON.stringify({ questions: [{ question: 'What is 2+2?', correctAnswer: '4' }] }),
          createdAt: new Date('2024-01-01'),
        },
        {
          toolId: 'tool-2',
          toolType: 'summary',
          title: 'Chapter 1 Summary',
          content: JSON.stringify({ summary: 'This chapter covers basic concepts.' }),
          createdAt: new Date('2024-01-02'),
        },
      ];

      vi.mocked(prisma.material.findMany).mockResolvedValue(mockMaterials as any);

      const result = await buildToolContext(userId, conversationId);

      expect(result.toolCount).toBe(2);
      expect(result.types).toEqual(['quiz', 'summary']);
      expect(result.formattedContext).toContain('## Contenuti generati in questa sessione:');
      expect(result.formattedContext).toContain('**Quiz: Math Quiz**');
      expect(result.formattedContext).toContain('**Riassunto: Chapter 1 Summary**');
    });

    it('should return empty context when no tools', async () => {
      vi.mocked(prisma.material.findMany).mockResolvedValue([]);

      const result = await buildToolContext(userId, conversationId);

      expect(result.toolCount).toBe(0);
      expect(result.types).toEqual([]);
      expect(result.formattedContext).toBe('');
    });
  });
});
