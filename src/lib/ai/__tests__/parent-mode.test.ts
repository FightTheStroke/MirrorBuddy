/**
 * Tests for parent-mode.ts
 * Issue #69: Increase unit test coverage
 *
 * @vitest-environment node
 * @module ai/__tests__/parent-mode.test
 */

import { describe, it, expect } from 'vitest';
import type { Learning } from '@prisma/client';
import {
  PARENT_MODE_PREAMBLE,
  formatLearningsForParentMode,
  generateParentModePrompt,
  getParentModeGreeting,
} from '../parent-mode';

// Helper to create mock Learning objects
function createMockLearning(overrides: Partial<Learning> = {}): Learning {
  return {
    id: 'learning-1',
    visitorId: 'visitor-1',
    category: 'learning_preference',
    insight: 'Test insight',
    confidence: 0.8,
    occurrences: 1,
    metadata: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('parent-mode', () => {
  // ============================================================================
  // PARENT_MODE_PREAMBLE
  // ============================================================================
  describe('PARENT_MODE_PREAMBLE', () => {
    it('should contain formal language instructions', () => {
      expect(PARENT_MODE_PREAMBLE).toContain('dare del "Lei"');
    });

    it('should contain what NOT to do', () => {
      expect(PARENT_MODE_PREAMBLE).toContain('Cosa NON Fare');
      expect(PARENT_MODE_PREAMBLE).toContain('NON usare il tono giocoso');
      expect(PARENT_MODE_PREAMBLE).toContain('NON fare battute');
    });

    it('should contain response structure guidelines', () => {
      expect(PARENT_MODE_PREAMBLE).toContain('Accoglienza');
      expect(PARENT_MODE_PREAMBLE).toContain('Contesto');
      expect(PARENT_MODE_PREAMBLE).toContain('Osservazioni');
      expect(PARENT_MODE_PREAMBLE).toContain('Suggerimenti');
    });

    it('should contain AI disclaimer', () => {
      expect(PARENT_MODE_PREAMBLE).toContain('Disclaimer AI');
      expect(PARENT_MODE_PREAMBLE).toContain('professionisti qualificati');
    });
  });

  // ============================================================================
  // formatLearningsForParentMode
  // ============================================================================
  describe('formatLearningsForParentMode', () => {
    it('should return appropriate message when no learnings exist', () => {
      const result = formatLearningsForParentMode([], 'Mario');

      expect(result).toContain('Non ho ancora abbastanza osservazioni su Mario');
      expect(result).toContain('sessioni di studio future');
    });

    it('should format strengths correctly (high confidence)', () => {
      const learnings: Learning[] = [
        createMockLearning({
          id: '1',
          insight: 'Eccelle nella risoluzione di problemi',
          confidence: 0.9,
          occurrences: 5,
          category: 'strength_area',
        }),
        createMockLearning({
          id: '2',
          insight: 'Buona memoria visiva',
          confidence: 0.75,
          occurrences: 3,
          category: 'memory_strategy',
        }),
      ];

      const result = formatLearningsForParentMode(learnings, 'Mario');

      expect(result).toContain('Punti di Forza Osservati');
      expect(result).toContain('Eccelle nella risoluzione di problemi');
      expect(result).toContain('osservato 5 volte');
      expect(result).toContain('osservato 3 volte');
    });

    it('should format growth areas correctly (low confidence)', () => {
      const learnings: Learning[] = [
        createMockLearning({
          id: '1',
          insight: 'Difficoltà con le frazioni',
          confidence: 0.3,
          occurrences: 4,
          category: 'struggle_pattern',
        }),
        createMockLearning({
          id: '2',
          insight: 'Fatica a concentrarsi',
          confidence: 0.4,
          occurrences: 1,
          category: 'attention_pattern',
        }),
      ];

      const result = formatLearningsForParentMode(learnings, 'Mario');

      expect(result).toContain('Aree di Crescita');
      expect(result).toContain('Difficoltà con le frazioni');
      expect(result).toContain('osservato 4 volte');
      expect(result).toContain('osservato 1 volta'); // singular
    });

    it('should group learnings by category', () => {
      const learnings: Learning[] = [
        createMockLearning({
          id: '1',
          insight: 'Preferisce studiare la mattina',
          category: 'learning_preference',
          confidence: 0.6,
        }),
        createMockLearning({
          id: '2',
          insight: 'Si emoziona facilmente',
          category: 'emotional_response',
          confidence: 0.6,
        }),
      ];

      const result = formatLearningsForParentMode(learnings, 'Mario');

      expect(result).toContain('Osservazioni per Categoria');
      expect(result).toContain('Preferenze di Apprendimento');
      expect(result).toContain('Risposte Emotive');
    });

    it('should handle all category types', () => {
      const categories = [
        'learning_preference',
        'emotional_response',
        'struggle_pattern',
        'strength_area',
        'interest_topic',
        'social_learning',
        'attention_pattern',
        'memory_strategy',
      ];

      const learnings: Learning[] = categories.map((cat, i) =>
        createMockLearning({
          id: `${i}`,
          category: cat,
          insight: `Insight for ${cat}`,
          confidence: 0.6,
        })
      );

      const result = formatLearningsForParentMode(learnings, 'Mario');

      expect(result).toContain('Preferenze di Apprendimento');
      expect(result).toContain('Risposte Emotive');
      expect(result).toContain('Difficolta Ricorrenti');
      expect(result).toContain('Aree di Forza');
      expect(result).toContain('Interessi Particolari');
      expect(result).toContain('Apprendimento Sociale');
      expect(result).toContain('Pattern di Attenzione');
      expect(result).toContain('Strategie di Memorizzazione');
    });

    it('should handle unknown categories gracefully', () => {
      const learnings: Learning[] = [
        createMockLearning({
          id: '1',
          insight: 'Unknown category insight',
          category: 'unknown_category',
          confidence: 0.6,
        }),
      ];

      const result = formatLearningsForParentMode(learnings, 'Mario');

      // Should use category name as-is for unknown categories
      expect(result).toContain('unknown_category');
    });

    it('should limit to top 5 strengths and growth areas', () => {
      const learnings: Learning[] = [];

      // Add 7 high-confidence items
      for (let i = 0; i < 7; i++) {
        learnings.push(
          createMockLearning({
            id: `strength-${i}`,
            insight: `Strength ${i}`,
            confidence: 0.9 - i * 0.01,
            category: 'strength_area',
          })
        );
      }

      // Add 7 low-confidence items
      for (let i = 0; i < 7; i++) {
        learnings.push(
          createMockLearning({
            id: `growth-${i}`,
            insight: `Growth ${i}`,
            confidence: 0.1 + i * 0.01,
            category: 'struggle_pattern',
          })
        );
      }

      const result = formatLearningsForParentMode(learnings, 'Mario');

      // Should only include top 5 strengths and top 5 growth areas
      expect(result).toContain('Strength 0');
      expect(result).toContain('Strength 4');
      expect(result).not.toContain('Strength 6');

      expect(result).toContain('Growth 0');
      expect(result).toContain('Growth 4');
      expect(result).not.toContain('Growth 6');
    });

    it('should limit category items to 3', () => {
      const learnings: Learning[] = [];

      for (let i = 0; i < 5; i++) {
        learnings.push(
          createMockLearning({
            id: `pref-${i}`,
            insight: `Preference ${i}`,
            category: 'learning_preference',
            confidence: 0.6,
          })
        );
      }

      const result = formatLearningsForParentMode(learnings, 'Mario');

      expect(result).toContain('Preference 0');
      expect(result).toContain('Preference 2');
      // The 4th and 5th should not appear in category section
      const categorySection = result.split('Osservazioni per Categoria')[1];
      expect(categorySection).not.toContain('Preference 4');
    });
  });

  // ============================================================================
  // generateParentModePrompt
  // ============================================================================
  describe('generateParentModePrompt', () => {
    it('should combine maestro prompt with parent mode preamble', () => {
      const maestroPrompt = 'Sei Archimede, matematico di Siracusa.';
      const learnings: Learning[] = [];
      const studentName = 'Mario';

      const result = generateParentModePrompt(maestroPrompt, learnings, studentName);

      expect(result).toContain(maestroPrompt);
      expect(result).toContain('MODALITA GENITORE');
    });

    it('should include learnings context', () => {
      const maestroPrompt = 'Sei Archimede.';
      const learnings: Learning[] = [
        createMockLearning({
          insight: 'Ama la geometria',
          confidence: 0.9,
          category: 'interest_topic',
        }),
      ];

      const result = generateParentModePrompt(maestroPrompt, learnings, 'Mario');

      expect(result).toContain('Ama la geometria');
      expect(result).toContain('Osservazioni su Mario');
    });

    it('should include reminder about parent conversation', () => {
      const result = generateParentModePrompt('Prompt', [], 'Mario');

      expect(result).toContain('stai parlando con il genitore di Mario');
      expect(result).toContain('non con lo studente');
    });

    it('should be in Italian', () => {
      const result = generateParentModePrompt('Prompt', [], 'Mario');

      expect(result).toContain('Rispondi sempre in italiano');
    });
  });

  // ============================================================================
  // getParentModeGreeting
  // ============================================================================
  describe('getParentModeGreeting', () => {
    it('should return greeting with learnings when hasLearnings is true', () => {
      const greeting = getParentModeGreeting('Archimede', 'Mario', true);

      expect(greeting).toContain('Buongiorno');
      expect(greeting).toContain('Archimede');
      expect(greeting).toContain('Mario');
      expect(greeting).toContain('raccolto alcune osservazioni');
      expect(greeting).toContain('Come posso aiutarLa');
    });

    it('should return greeting without learnings when hasLearnings is false', () => {
      const greeting = getParentModeGreeting('Archimede', 'Mario', false);

      expect(greeting).toContain('Buongiorno');
      expect(greeting).toContain('Archimede');
      expect(greeting).toContain('Non ho ancora avuto molte interazioni');
      expect(greeting).toContain('osservazioni sono ancora limitate');
      expect(greeting).toContain('Come posso esserLe utile');
    });

    it('should use formal language (Lei)', () => {
      const withLearnings = getParentModeGreeting('Curie', 'Anna', true);
      const withoutLearnings = getParentModeGreeting('Curie', 'Anna', false);

      expect(withLearnings).toContain('La');
      expect(withoutLearnings).toContain('Le');
    });

    it('should include student name in both cases', () => {
      const withLearnings = getParentModeGreeting('Darwin', 'Luca', true);
      const withoutLearnings = getParentModeGreeting('Darwin', 'Luca', false);

      expect(withLearnings).toContain('Luca');
      expect(withoutLearnings).toContain('Luca');
    });
  });
});
