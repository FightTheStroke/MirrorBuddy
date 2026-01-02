/**
 * Tests for system prompt enhancer
 * @module conversation/prompt-enhancer
 */

import { describe, it, expect, vi } from 'vitest';
import {
  enhanceSystemPrompt,
  hasMemoryContext,
  extractBasePrompt,
} from '../prompt-enhancer';
import type { ConversationMemory } from '../memory-loader';

// Mock the safety guardrails
vi.mock('@/lib/safety/safety-prompts', () => ({
  injectSafetyGuardrails: vi.fn((prompt, _options) => `[SAFE] ${prompt}`),
}));

describe('prompt-enhancer', () => {
  const basePrompt = 'Sei Melissa, una professoressa di matematica.';
  const safetyOptions = { role: 'maestro' as const };

  describe('enhanceSystemPrompt', () => {
    it('returns safe prompt when no memory', () => {
      const emptyMemory: ConversationMemory = {
        recentSummary: null,
        keyFacts: [],
        topics: [],
        lastSessionDate: null,
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory: emptyMemory,
        safetyOptions,
      });

      expect(result).toBe('[SAFE] Sei Melissa, una professoressa di matematica.');
    });

    it('appends memory section when summary exists', () => {
      const memory: ConversationMemory = {
        recentSummary: 'Lo studente ha imparato le frazioni',
        keyFacts: [],
        topics: [],
        lastSessionDate: new Date('2026-01-01'),
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
      });

      expect(result).toContain('Memoria delle Sessioni Precedenti');
      expect(result).toContain('Lo studente ha imparato le frazioni');
    });

    it('includes key facts in memory section', () => {
      const memory: ConversationMemory = {
        recentSummary: null,
        keyFacts: ['preferisce esempi visivi', 'ha difficoltà con le divisioni'],
        topics: [],
        lastSessionDate: null,
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
      });

      expect(result).toContain('Fatti Chiave dello Studente');
      expect(result).toContain('- preferisce esempi visivi');
      expect(result).toContain('- ha difficoltà con le divisioni');
    });

    it('includes topics in memory section', () => {
      const memory: ConversationMemory = {
        recentSummary: null,
        keyFacts: ['fatto1'],
        topics: ['matematica', 'frazioni', 'divisioni'],
        lastSessionDate: null,
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
      });

      expect(result).toContain('Argomenti Già Trattati');
      expect(result).toContain('matematica, frazioni, divisioni');
    });

    it('includes relative date for last session', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const memory: ConversationMemory = {
        recentSummary: 'Sessione precedente',
        keyFacts: [],
        topics: [],
        lastSessionDate: yesterday,
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
      });

      expect(result).toContain('Ultimo Incontro (ieri)');
    });

    it('applies safety guardrails first', () => {
      const memory: ConversationMemory = {
        recentSummary: 'Summary',
        keyFacts: [],
        topics: [],
        lastSessionDate: new Date(),
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
      });

      expect(result).toMatch(/^\[SAFE\]/);
    });

    it('includes usage instructions', () => {
      const memory: ConversationMemory = {
        recentSummary: 'Summary',
        keyFacts: [],
        topics: [],
        lastSessionDate: new Date(),
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
      });

      expect(result).toContain('ISTRUZIONI MEMORIA');
      expect(result).toContain('personalizzare l\'interazione');
    });
  });

  describe('hasMemoryContext', () => {
    it('returns true when memory section present', () => {
      const prompt = 'Base prompt\n\n## Memoria delle Sessioni Precedenti\n...';
      expect(hasMemoryContext(prompt)).toBe(true);
    });

    it('returns false when memory section absent', () => {
      const prompt = 'Base prompt without memory';
      expect(hasMemoryContext(prompt)).toBe(false);
    });
  });

  describe('extractBasePrompt', () => {
    it('returns full prompt when no memory section', () => {
      const prompt = 'This is the full prompt without memory';
      expect(extractBasePrompt(prompt)).toBe(prompt);
    });

    it('returns base prompt without memory section', () => {
      const prompt = 'Base prompt\n\n## Memoria delle Sessioni Precedenti\nMemory content';
      expect(extractBasePrompt(prompt)).toBe('Base prompt');
    });

    it('trims whitespace from extracted prompt', () => {
      const prompt = 'Base prompt   \n\n## Memoria delle Sessioni Precedenti\n...';
      expect(extractBasePrompt(prompt)).toBe('Base prompt');
    });
  });
});
