/**
 * Tests for Export Helpers
 */

import { describe, it, expect } from 'vitest';
import {
  safeJsonParse,
  sanitizeFilename,
  formatToolType,
  formatDate,
  formatDateCompact,
  formatContentAsMarkdown,
} from '../export-helpers';

describe('export-helpers', () => {
  describe('safeJsonParse', () => {
    it('parses valid JSON object', () => {
      const result = safeJsonParse('{"key": "value"}');
      expect(result).toEqual({ key: 'value' });
    });

    it('parses valid JSON array', () => {
      const result = safeJsonParse('[1, 2, 3]');
      expect(result).toEqual([1, 2, 3]);
    });

    it('parses valid JSON string', () => {
      const result = safeJsonParse('"hello"');
      expect(result).toBe('hello');
    });

    it('parses valid JSON number', () => {
      const result = safeJsonParse('42');
      expect(result).toBe(42);
    });

    it('returns original string for invalid JSON', () => {
      const result = safeJsonParse('not valid json');
      expect(result).toBe('not valid json');
    });

    it('returns original string for malformed JSON', () => {
      const result = safeJsonParse('{key: value}');
      expect(result).toBe('{key: value}');
    });

    it('handles empty string', () => {
      const result = safeJsonParse('');
      expect(result).toBe('');
    });
  });

  describe('sanitizeFilename', () => {
    it('removes illegal characters', () => {
      expect(sanitizeFilename('file<>:"/\\|?*name')).toBe('file_________name');
    });

    it('replaces spaces with underscores', () => {
      expect(sanitizeFilename('my file name')).toBe('my_file_name');
    });

    it('replaces multiple spaces with single underscore', () => {
      expect(sanitizeFilename('my   file    name')).toBe('my_file_name');
    });

    it('truncates to 100 characters', () => {
      const longName = 'a'.repeat(150);
      expect(sanitizeFilename(longName)).toHaveLength(100);
    });

    it('handles normal filename', () => {
      expect(sanitizeFilename('my-document')).toBe('my-document');
    });

    it('handles empty string', () => {
      expect(sanitizeFilename('')).toBe('');
    });

    it('handles filename with only illegal chars', () => {
      expect(sanitizeFilename('<>:"/\\|?*')).toBe('_________');
    });
  });

  describe('formatToolType', () => {
    it('formats mindmap', () => {
      expect(formatToolType('mindmap')).toBe('Mappa Mentale');
    });

    it('formats quiz', () => {
      expect(formatToolType('quiz')).toBe('Quiz');
    });

    it('formats flashcard', () => {
      expect(formatToolType('flashcard')).toBe('Flashcard');
    });

    it('formats summary', () => {
      expect(formatToolType('summary')).toBe('Riassunto');
    });

    it('formats demo', () => {
      expect(formatToolType('demo')).toBe('Demo Interattiva');
    });

    it('formats diagram', () => {
      expect(formatToolType('diagram')).toBe('Diagramma');
    });

    it('formats timeline', () => {
      expect(formatToolType('timeline')).toBe('Timeline');
    });

    it('formats formula', () => {
      expect(formatToolType('formula')).toBe('Formula');
    });

    it('formats chart', () => {
      expect(formatToolType('chart')).toBe('Grafico');
    });

    it('formats webcam', () => {
      expect(formatToolType('webcam')).toBe('Immagine');
    });

    it('formats pdf', () => {
      expect(formatToolType('pdf')).toBe('PDF');
    });

    it('formats homework', () => {
      expect(formatToolType('homework')).toBe('Compiti');
    });

    it('formats search', () => {
      expect(formatToolType('search')).toBe('Ricerca');
    });

    it('returns type as-is for unknown type', () => {
      expect(formatToolType('unknown' as unknown as 'mindmap')).toBe('unknown');
    });
  });

  describe('formatDate', () => {
    it('formats date in Italian format', () => {
      const date = new Date('2024-01-15');
      const result = formatDate(date);
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });

    it('formats different months', () => {
      const june = new Date('2024-06-20');
      const result = formatDate(june);
      expect(result).toContain('20');
      expect(result).toContain('2024');
    });
  });

  describe('formatDateCompact', () => {
    it('formats date as ISO date string', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(formatDateCompact(date)).toBe('2024-01-15');
    });

    it('handles different dates', () => {
      const date = new Date('2023-12-25T00:00:00Z');
      expect(formatDateCompact(date)).toBe('2023-12-25');
    });

    it('pads single digit months and days', () => {
      const date = new Date('2024-05-05T00:00:00Z');
      expect(formatDateCompact(date)).toBe('2024-05-05');
    });
  });

  describe('formatContentAsMarkdown', () => {
    it('handles null content', () => {
      expect(formatContentAsMarkdown('mindmap', null)).toBe('');
    });

    it('handles undefined content', () => {
      expect(formatContentAsMarkdown('mindmap', undefined)).toBe('');
    });

    it('handles string content', () => {
      expect(formatContentAsMarkdown('summary', 'text content')).toBe('text content');
    });

    describe('mindmap type', () => {
      it('returns markdown field if present', () => {
        const content = { markdown: '# Mindmap Title' };
        expect(formatContentAsMarkdown('mindmap', content)).toBe('# Mindmap Title');
      });

      it('returns JSON if no markdown field', () => {
        const content = { nodes: [] };
        const result = formatContentAsMarkdown('mindmap', content);
        expect(result).toContain('nodes');
      });
    });

    describe('quiz type', () => {
      it('formats quiz with questions', () => {
        const content = {
          questions: [
            { question: 'What is 2+2?', options: ['3', '4', '5'], explanation: 'Basic math' },
          ],
        };
        const result = formatContentAsMarkdown('quiz', content);
        expect(result).toContain('Domanda 1');
        expect(result).toContain('What is 2+2?');
        expect(result).toContain('1. 3');
        expect(result).toContain('2. 4');
        expect(result).toContain('Basic math');
      });

      it('handles quiz without options', () => {
        const content = {
          questions: [{ question: 'Question?' }],
        };
        const result = formatContentAsMarkdown('quiz', content);
        expect(result).toContain('Domanda 1');
        expect(result).toContain('Question?');
      });

      it('returns JSON for non-array questions', () => {
        const content = { questions: 'not an array' };
        const result = formatContentAsMarkdown('quiz', content);
        expect(result).toContain('"questions"');
      });
    });

    describe('flashcard type', () => {
      it('formats flashcards with cards', () => {
        const content = {
          cards: [{ front: 'Question 1', back: 'Answer 1' }],
        };
        const result = formatContentAsMarkdown('flashcard', content);
        expect(result).toContain('Card 1');
        expect(result).toContain('**Domanda**: Question 1');
        expect(result).toContain('**Risposta**: Answer 1');
      });

      it('separates multiple cards', () => {
        const content = {
          cards: [
            { front: 'Q1', back: 'A1' },
            { front: 'Q2', back: 'A2' },
          ],
        };
        const result = formatContentAsMarkdown('flashcard', content);
        expect(result).toContain('Card 1');
        expect(result).toContain('Card 2');
        expect(result).toContain('---');
      });

      it('returns JSON for non-array cards', () => {
        const content = { cards: 'not an array' };
        const result = formatContentAsMarkdown('flashcard', content);
        expect(result).toContain('"cards"');
      });
    });

    describe('summary type', () => {
      it('returns text field', () => {
        const content = { text: 'Summary text' };
        expect(formatContentAsMarkdown('summary', content)).toBe('Summary text');
      });

      it('returns content field if no text', () => {
        const content = { content: 'Content text' };
        expect(formatContentAsMarkdown('summary', content)).toBe('Content text');
      });

      it('returns summary field if no text or content', () => {
        const content = { summary: 'Summary field' };
        expect(formatContentAsMarkdown('summary', content)).toBe('Summary field');
      });

      it('returns JSON if no known field', () => {
        const content = { other: 'field' };
        const result = formatContentAsMarkdown('summary', content);
        expect(result).toContain('"other"');
      });
    });

    describe('default type', () => {
      it('returns formatted JSON for unknown types', () => {
        const content = { data: 'value' };
        const result = formatContentAsMarkdown('chart', content);
        expect(result).toContain('"data"');
        expect(result).toContain('"value"');
      });
    });
  });
});
