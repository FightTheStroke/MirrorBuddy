/**
 * Tests for StudyKitViewer Utilities
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../utils';

describe('study-kit-viewer-utils', () => {
  describe('parseMarkdown', () => {
    it('returns empty string for empty input', () => {
      expect(parseMarkdown('')).toBe('');
    });

    it('returns empty string for null/undefined', () => {
      expect(parseMarkdown(null as unknown as string)).toBe('');
      expect(parseMarkdown(undefined as unknown as string)).toBe('');
    });

    it('escapes HTML entities', () => {
      const result = parseMarkdown('5 < 10 & 10 > 5');
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&amp;');
    });

    it('converts H1 headers', () => {
      const result = parseMarkdown('# Main Title');
      expect(result).toContain('<h1');
      expect(result).toContain('Main Title');
      expect(result).toContain('</h1>');
    });

    it('converts H2 headers', () => {
      const result = parseMarkdown('## Section');
      expect(result).toContain('<h2');
      expect(result).toContain('Section');
      expect(result).toContain('</h2>');
    });

    it('converts H3 headers', () => {
      const result = parseMarkdown('### Subsection');
      expect(result).toContain('<h3');
      expect(result).toContain('Subsection');
      expect(result).toContain('</h3>');
    });

    it('converts bold text with **', () => {
      const result = parseMarkdown('This is **bold** text');
      expect(result).toContain('<strong>bold</strong>');
    });

    it('converts italic text with *', () => {
      const result = parseMarkdown('This is *italic* text');
      expect(result).toContain('<em>italic</em>');
    });

    it('converts bold italic with ***', () => {
      const result = parseMarkdown('This is ***bold italic*** text');
      expect(result).toContain('<strong><em>bold italic</em></strong>');
    });

    it('converts unordered list items', () => {
      const result = parseMarkdown('- Item 1\n- Item 2');
      expect(result).toContain('<li');
      expect(result).toContain('Item 1');
      expect(result).toContain('Item 2');
    });

    it('converts ordered list items', () => {
      const result = parseMarkdown('1. First\n2. Second');
      expect(result).toContain('<li');
      expect(result).toContain('list-decimal');
      expect(result).toContain('First');
    });

    it('converts double newlines to paragraphs', () => {
      const result = parseMarkdown('Paragraph 1\n\nParagraph 2');
      expect(result).toContain('</p><p');
    });

    it('converts single newlines to br', () => {
      const result = parseMarkdown('Line 1\nLine 2');
      expect(result).toContain('<br/>');
    });

    it('handles multiple formatting in same text', () => {
      const result = parseMarkdown('# Title\n\nSome **bold** and *italic* text');
      expect(result).toContain('<h1');
      expect(result).toContain('<strong>bold</strong>');
      expect(result).toContain('<em>italic</em>');
    });

    it('applies CSS classes to headers', () => {
      const h1 = parseMarkdown('# Title');
      expect(h1).toContain('text-2xl');
      expect(h1).toContain('font-bold');

      const h2 = parseMarkdown('## Section');
      expect(h2).toContain('text-xl');
      expect(h2).toContain('font-semibold');

      const h3 = parseMarkdown('### Sub');
      expect(h3).toContain('text-lg');
    });

    it('applies margin classes to list items', () => {
      const result = parseMarkdown('- Item');
      expect(result).toContain('ml-4');
    });

    it('handles text without any markdown', () => {
      const plain = 'Just plain text';
      const result = parseMarkdown(plain);
      expect(result).toBe(plain);
    });

    it('handles special characters in content', () => {
      const result = parseMarkdown('## Math: x² + y²');
      expect(result).toContain('x² + y²');
    });
  });
});
