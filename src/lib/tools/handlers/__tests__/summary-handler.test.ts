/**
 * Summary Handler Unit Tests
 *
 * Tests for the summary tool handler validation
 * Part of Issue #70: Real-time summary tool
 */

import { describe, it, expect } from 'vitest';
import { validateSections } from '../summary-handler';

describe('Summary Handler', () => {
  describe('validateSections', () => {
    it('returns invalid for empty sections array', () => {
      const result = validateSections([]);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('At least one section is required');
    });

    it('returns invalid for null sections', () => {
      const result = validateSections(null as unknown as unknown[]);
      expect(result.valid).toBe(false);
    });

    it('returns invalid for section without title', () => {
      const sections = [{ content: 'Some content' }];
      const result = validateSections(sections);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('title is required');
    });

    it('returns invalid for section without content', () => {
      const sections = [{ title: 'Some title' }];
      const result = validateSections(sections);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('content is required');
    });

    it('returns invalid for non-string title', () => {
      const sections = [{ title: 123, content: 'Content' }];
      const result = validateSections(sections);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('title is required');
    });

    it('returns invalid for non-string content', () => {
      const sections = [{ title: 'Title', content: 123 }];
      const result = validateSections(sections);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('content is required');
    });

    it('returns invalid for non-array keyPoints', () => {
      const sections = [{ title: 'Title', content: 'Content', keyPoints: 'not an array' }];
      const result = validateSections(sections);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('keyPoints must be an array');
    });

    it('returns valid for correct section structure', () => {
      const sections = [
        {
          title: 'Section 1',
          content: 'Content 1',
          keyPoints: ['Point 1', 'Point 2'],
        },
      ];
      const result = validateSections(sections);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('returns valid for section without keyPoints', () => {
      const sections = [{ title: 'Section 1', content: 'Content 1' }];
      const result = validateSections(sections);
      expect(result.valid).toBe(true);
    });

    it('returns valid for multiple sections', () => {
      const sections = [
        { title: 'Section 1', content: 'Content 1' },
        { title: 'Section 2', content: 'Content 2', keyPoints: ['Point'] },
        { title: 'Section 3', content: 'Content 3' },
      ];
      const result = validateSections(sections);
      expect(result.valid).toBe(true);
    });

    it('reports correct section index in error', () => {
      const sections = [
        { title: 'Valid', content: 'Valid' },
        { title: 'Missing content' },
      ];
      const result = validateSections(sections);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Section 2');
    });
  });
});
