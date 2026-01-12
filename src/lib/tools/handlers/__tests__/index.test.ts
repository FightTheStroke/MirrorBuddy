/**
 * Tool Handlers Index Tests
 * Verifies the barrel exports work correctly
 */

import { describe, it, expect } from 'vitest';
import {
  generateMarkdownFromNodes,
  validateQuestions,
  validateCode,
  sanitizeHtml,
  DANGEROUS_JS_PATTERNS,
  validateCards,
  validateSections,
  validateMermaidCode,
  validateEvents,
} from '../index';

describe('tools/handlers index exports', () => {
  describe('generateMarkdownFromNodes', () => {
    it('should be exported and callable', () => {
      expect(typeof generateMarkdownFromNodes).toBe('function');
    });
  });

  describe('validateQuestions', () => {
    it('should be exported and callable', () => {
      expect(typeof validateQuestions).toBe('function');
    });

    it('should validate quiz questions', () => {
      const valid = [
        {
          question: 'What is 2+2?',
          options: ['3', '4', '5', '6'],
          correctIndex: 1,
          explanation: 'Basic math',
        },
      ];
      const result = validateQuestions(valid);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateCode', () => {
    it('should be exported and callable', () => {
      expect(typeof validateCode).toBe('function');
    });
  });

  describe('sanitizeHtml', () => {
    it('should be exported and callable', () => {
      expect(typeof sanitizeHtml).toBe('function');
    });
  });

  describe('DANGEROUS_JS_PATTERNS', () => {
    it('should be exported as an array', () => {
      expect(Array.isArray(DANGEROUS_JS_PATTERNS)).toBe(true);
      expect(DANGEROUS_JS_PATTERNS.length).toBeGreaterThan(0);
    });
  });

  describe('validateCards', () => {
    it('should be exported and callable', () => {
      expect(typeof validateCards).toBe('function');
    });

    it('should validate flashcard data', () => {
      const valid = [{ front: 'Term', back: 'Definition' }];
      const result = validateCards(valid);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateSections', () => {
    it('should be exported and callable', () => {
      expect(typeof validateSections).toBe('function');
    });

    it('should validate summary sections', () => {
      const valid = [
        {
          id: '1',
          title: 'Introduction',
          content: 'Content here',
          collapsed: false,
        },
      ];
      const result = validateSections(valid);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateMermaidCode', () => {
    it('should be exported and callable', () => {
      expect(typeof validateMermaidCode).toBe('function');
    });

    it('should validate mermaid code', () => {
      const valid = 'graph TD\n  A --> B';
      const result = validateMermaidCode(valid);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateEvents', () => {
    it('should be exported and callable', () => {
      expect(typeof validateEvents).toBe('function');
    });

    it('should validate timeline events', () => {
      const valid = [
        {
          date: '2024',
          title: 'Event',
          description: 'Description',
          importance: 'high' as const,
        },
      ];
      const result = validateEvents(valid);
      expect(result.valid).toBe(true);
    });
  });
});
