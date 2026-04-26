/**
 * Tests for searchable text utilities
 * @module search/searchable-text
 */

import { describe, it, expect } from 'vitest';
import {
  generateSearchableText,
  createMaterialSearch,
  searchMaterials,
  highlightMatches,
  type SearchableMaterial,
} from '../searchable-text';

describe('searchable-text', () => {
  describe('generateSearchableText', () => {
    it('returns empty string for null content', () => {
      expect(generateSearchableText('mindmap', null)).toBe('');
    });

    it('returns empty string for undefined content', () => {
      expect(generateSearchableText('quiz', undefined)).toBe('');
    });

    describe('mindmap extraction', () => {
      it('extracts title from mindmap', () => {
        const content = { title: 'La Liguria', nodes: [] };
        const result = generateSearchableText('mindmap', content);
        expect(result).toContain('La Liguria');
      });

      it('extracts node labels from mindmap', () => {
        const content = {
          title: 'Test',
          nodes: [
            { id: '1', label: 'Geografia' },
            { id: '2', label: 'Storia' },
          ],
        };
        const result = generateSearchableText('mindmap', content);
        expect(result).toContain('Geografia');
        expect(result).toContain('Storia');
      });

      it('includes markdown content if present', () => {
        const content = {
          title: 'Test',
          nodes: [],
          markdown: '# Heading\nParagraph text',
        };
        const result = generateSearchableText('mindmap', content);
        expect(result).toContain('Heading');
        expect(result).toContain('Paragraph text');
      });
    });

    describe('quiz extraction', () => {
      it('extracts topic from quiz', () => {
        const content = { topic: 'Matematica', questions: [] };
        const result = generateSearchableText('quiz', content);
        expect(result).toContain('Matematica');
      });

      it('extracts questions and options', () => {
        const content = {
          topic: 'Test',
          questions: [
            {
              question: 'Quanto fa 2+2?',
              options: ['3', '4', '5'],
              explanation: 'La risposta è 4',
            },
          ],
        };
        const result = generateSearchableText('quiz', content);
        expect(result).toContain('Quanto fa 2+2?');
        expect(result).toContain('4');
        expect(result).toContain('La risposta è 4');
      });
    });

    describe('flashcard extraction', () => {
      it('extracts card front and back', () => {
        const content = {
          topic: 'Vocabolario',
          cards: [
            { front: 'Hello', back: 'Ciao', hint: 'Italian greeting' },
          ],
        };
        const result = generateSearchableText('flashcard', content);
        expect(result).toContain('Hello');
        expect(result).toContain('Ciao');
        expect(result).toContain('Italian greeting');
      });
    });

    describe('summary extraction', () => {
      it('extracts text field', () => {
        const content = { text: 'This is a summary of the lesson.' };
        const result = generateSearchableText('summary', content);
        expect(result).toContain('This is a summary');
      });

      it('extracts content field', () => {
        const content = { content: 'Alternative content field.' };
        const result = generateSearchableText('summary', content);
        expect(result).toContain('Alternative content field');
      });
    });

    describe('demo extraction', () => {
      it('extracts title and description', () => {
        const content = {
          title: 'Demo Title',
          description: 'Demo Description',
        };
        const result = generateSearchableText('demo', content);
        expect(result).toContain('Demo Title');
        expect(result).toContain('Demo Description');
      });

      it('strips HTML tags from html content', () => {
        const content = {
          html: '<div><h1>Hello</h1><p>World</p></div>',
        };
        const result = generateSearchableText('demo', content);
        expect(result).toContain('Hello');
        expect(result).toContain('World');
        expect(result).not.toContain('<div>');
      });
    });

    it('handles JSON string content', () => {
      const content = JSON.stringify({ title: 'Parsed JSON', nodes: [] });
      const result = generateSearchableText('mindmap', content);
      expect(result).toContain('Parsed JSON');
    });

    it('handles invalid JSON gracefully', () => {
      const content = 'not valid json {{{';
      const result = generateSearchableText('mindmap', content);
      expect(result).toBe('');
    });
  });

  describe('createMaterialSearch', () => {
    it('creates Fuse instance with materials', () => {
      const materials: SearchableMaterial[] = [
        {
          id: '1',
          title: 'Test Material',
          toolType: 'mindmap',
          searchableText: 'test content',
          createdAt: new Date(),
        },
      ];

      const fuse = createMaterialSearch(materials);
      expect(fuse).toBeDefined();
    });

    it('accepts custom options', () => {
      const materials: SearchableMaterial[] = [];
      const fuse = createMaterialSearch(materials, { threshold: 0.5 });
      expect(fuse).toBeDefined();
    });
  });

  describe('searchMaterials', () => {
    const materials: SearchableMaterial[] = [
      {
        id: '1',
        title: 'Matematica Frazioni',
        toolType: 'mindmap',
        subject: 'matematica',
        searchableText: 'frazioni numeratore denominatore',
        createdAt: new Date(),
      },
      {
        id: '2',
        title: 'Storia Romana',
        toolType: 'quiz',
        subject: 'storia',
        searchableText: 'impero romano giulio cesare',
        createdAt: new Date(),
      },
      {
        id: '3',
        title: 'Vocabolario Inglese',
        toolType: 'flashcard',
        subject: 'inglese',
        searchableText: 'hello goodbye thank you',
        createdAt: new Date(),
      },
    ];

    it('returns empty array for empty query', () => {
      const fuse = createMaterialSearch(materials);
      const results = searchMaterials(fuse, '');
      expect(results).toEqual([]);
    });

    it('returns empty array for whitespace query', () => {
      const fuse = createMaterialSearch(materials);
      const results = searchMaterials(fuse, '   ');
      expect(results).toEqual([]);
    });

    it('finds materials by title', () => {
      const fuse = createMaterialSearch(materials);
      const results = searchMaterials(fuse, 'Matematica');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.title).toContain('Matematica');
    });

    it('finds materials by searchableText', () => {
      const fuse = createMaterialSearch(materials);
      const results = searchMaterials(fuse, 'giulio cesare');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.title).toBe('Storia Romana');
    });

    it('respects limit parameter', () => {
      const fuse = createMaterialSearch(materials);
      const results = searchMaterials(fuse, 'a', 1);
      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('uses fuzzy matching', () => {
      const fuse = createMaterialSearch(materials);
      const results = searchMaterials(fuse, 'matematca'); // typo
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('highlightMatches', () => {
    it('returns single segment for no matches', () => {
      const result = highlightMatches('hello world', []);
      expect(result).toEqual([{ text: 'hello world', isMatch: false }]);
    });

    it('highlights single match', () => {
      const result = highlightMatches('hello world', [[0, 4]]);
      expect(result).toEqual([
        { text: 'hello', isMatch: true },
        { text: ' world', isMatch: false },
      ]);
    });

    it('highlights multiple matches', () => {
      const result = highlightMatches('hello world', [[0, 4], [6, 10]]);
      expect(result).toEqual([
        { text: 'hello', isMatch: true },
        { text: ' ', isMatch: false },
        { text: 'world', isMatch: true },
      ]);
    });

    it('handles match at end of string', () => {
      const result = highlightMatches('hello', [[0, 4]]);
      expect(result).toEqual([{ text: 'hello', isMatch: true }]);
    });
  });
});
