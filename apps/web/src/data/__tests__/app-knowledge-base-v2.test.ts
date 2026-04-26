/**
 * Tests for app knowledge base v2
 * @module data/app-knowledge-base-v2
 */

import { describe, it, expect } from 'vitest';
import {
  detectCategories,
  getKnowledgeForCategories,
  getRelevantKnowledge,
  generateCompactIndexPrompt,
  FEATURE_INDEX,
  type KnowledgeCategory,
} from '../app-knowledge-base-v2';

describe('app-knowledge-base-v2', () => {
  describe('FEATURE_INDEX', () => {
    it('has entries for maestro keywords', () => {
      expect(FEATURE_INDEX['maestro']).toContain('maestri');
      expect(FEATURE_INDEX['euclide']).toContain('maestri');
      expect(FEATURE_INDEX['melissa']).toContain('coach');
    });

    it('has entries for voice keywords', () => {
      expect(FEATURE_INDEX['voce']).toContain('voice');
      expect(FEATURE_INDEX['microfono']).toContain('voice');
    });

    it('has entries for tool keywords', () => {
      expect(FEATURE_INDEX['quiz']).toContain('quizzes');
      expect(FEATURE_INDEX['flashcard']).toContain('flashcards');
      expect(FEATURE_INDEX['mappa']).toContain('mindmaps');
    });
  });

  describe('detectCategories', () => {
    it('returns empty array for unrecognized query', () => {
      const result = detectCategories('asdfghjkl nonsense');
      expect(result).toEqual([]);
    });

    it('detects maestri category from keyword', () => {
      const result = detectCategories('chi è euclide?');
      expect(result).toContain('maestri');
    });

    it('detects voice category from keyword', () => {
      const result = detectCategories('come uso il microfono?');
      expect(result).toContain('voice');
    });

    it('detects multiple categories from query', () => {
      const result = detectCategories('come creo flashcard con Melissa?');
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('is case insensitive', () => {
      const result1 = detectCategories('EUCLIDE');
      const result2 = detectCategories('euclide');
      expect(result1).toEqual(result2);
    });
  });

  describe('getKnowledgeForCategories', () => {
    it('returns empty string for empty categories', () => {
      const result = getKnowledgeForCategories([]);
      expect(result).toBe('');
    });

    it('returns knowledge for single category', () => {
      const result = getKnowledgeForCategories(['maestri'] as KnowledgeCategory[]);
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('Maestro');
    });

    it('combines knowledge for multiple categories', () => {
      const result = getKnowledgeForCategories(['voice', 'flashcards'] as KnowledgeCategory[]);
      expect(result).toContain('Chiamate Vocali');
      expect(result).toContain('Flashcard FSRS');
    });
  });

  describe('getRelevantKnowledge', () => {
    it('returns empty string for unrecognized query', () => {
      const result = getRelevantKnowledge('xyz123 random text');
      expect(result).toBe('');
    });

    it('returns relevant knowledge for recognized query', () => {
      const result = getRelevantKnowledge('come creo un quiz?');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('generateCompactIndexPrompt', () => {
    it('returns non-empty compact index', () => {
      const result = generateCompactIndexPrompt();
      expect(result.length).toBeGreaterThan(0);
    });

    it('includes version info', () => {
      const result = generateCompactIndexPrompt();
      expect(result).toMatch(/v\d+\.\d+\.\d+/);
    });

    it('mentions key categories', () => {
      const result = generateCompactIndexPrompt();
      expect(result.toLowerCase()).toContain('maestr');
    });
  });
});
