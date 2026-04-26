/**
 * Tests for Voice Session Memory Utilities
 */

import { describe, it, expect } from 'vitest';
import { sanitizeHtmlComments, buildMemoryContext } from '../memory-utils';
import type { ConversationMemory } from '../types';

describe('memory-utils', () => {
  describe('sanitizeHtmlComments', () => {
    it('removes simple HTML comment', () => {
      const input = 'Hello <!-- comment --> World';
      expect(sanitizeHtmlComments(input)).toBe('Hello  World');
    });

    it('removes multiple HTML comments', () => {
      const input = 'A <!-- first --> B <!-- second --> C';
      expect(sanitizeHtmlComments(input)).toBe('A  B  C');
    });

    it('removes multiline comments', () => {
      const input = 'Start <!-- multi\nline\ncomment --> End';
      expect(sanitizeHtmlComments(input)).toBe('Start  End');
    });

    it('removes nested comment markers', () => {
      const input = 'Hello <!----> World';
      expect(sanitizeHtmlComments(input)).toBe('Hello  World');
    });

    it('removes orphaned start marker', () => {
      const input = 'Hello <!-- orphan';
      expect(sanitizeHtmlComments(input)).toBe('Hello  orphan');
    });

    it('removes orphaned end marker', () => {
      const input = 'Hello --> orphan';
      expect(sanitizeHtmlComments(input)).toBe('Hello  orphan');
    });

    it('handles browser quirk --!> variant', () => {
      const input = 'Hello <!-- comment --!> World';
      expect(sanitizeHtmlComments(input)).toBe('Hello  World');
    });

    it('handles empty string', () => {
      expect(sanitizeHtmlComments('')).toBe('');
    });

    it('returns unchanged string without comments', () => {
      const input = 'No comments here';
      expect(sanitizeHtmlComments(input)).toBe('No comments here');
    });

    it('handles consecutive comments', () => {
      const input = '<!-- a --><!-- b -->';
      expect(sanitizeHtmlComments(input)).toBe('');
    });
  });

  describe('buildMemoryContext', () => {
    it('returns empty string for null memory', () => {
      expect(buildMemoryContext(null)).toBe('');
    });

    it('builds context with summary only', () => {
      const memory: ConversationMemory = {
        summary: 'Student learned fractions',
      };
      const result = buildMemoryContext(memory);

      expect(result).toContain('MEMORIA DELLE CONVERSAZIONI');
      expect(result).toContain('Riassunto');
      expect(result).toContain('Student learned fractions');
    });

    it('builds context with learned facts', () => {
      const memory: ConversationMemory = {
        keyFacts: {
          learned: ['fractions', 'decimals'],
        },
      };
      const result = buildMemoryContext(memory);

      expect(result).toContain('Concetti capiti');
      expect(result).toContain('- fractions');
      expect(result).toContain('- decimals');
    });

    it('builds context with preferences', () => {
      const memory: ConversationMemory = {
        keyFacts: {
          preferences: ['visual learning', 'hands-on exercises'],
        },
      };
      const result = buildMemoryContext(memory);

      expect(result).toContain('Preferenze');
      expect(result).toContain('- visual learning');
      expect(result).toContain('- hands-on exercises');
    });

    it('builds context with recent topics', () => {
      const memory: ConversationMemory = {
        recentTopics: ['algebra', 'geometry'],
      };
      const result = buildMemoryContext(memory);

      expect(result).toContain('Argomenti recenti');
      expect(result).toContain('- algebra');
      expect(result).toContain('- geometry');
    });

    it('builds full context with all fields', () => {
      const memory: ConversationMemory = {
        summary: 'Good progress in math',
        keyFacts: {
          learned: ['addition'],
          preferences: ['games'],
        },
        recentTopics: ['numbers'],
      };
      const result = buildMemoryContext(memory);

      expect(result).toContain('Good progress in math');
      expect(result).toContain('- addition');
      expect(result).toContain('- games');
      expect(result).toContain('- numbers');
      expect(result).toContain('USA QUESTE INFORMAZIONI');
    });

    it('skips empty arrays', () => {
      const memory: ConversationMemory = {
        keyFacts: {
          learned: [],
          preferences: [],
        },
        recentTopics: [],
      };
      const result = buildMemoryContext(memory);

      expect(result).not.toContain('Concetti capiti');
      expect(result).not.toContain('Preferenze');
      expect(result).not.toContain('Argomenti recenti');
    });
  });
});
