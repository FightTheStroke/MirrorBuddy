/**
 * Unicode Normalizer Tests
 * Part of Ethical Design Hardening (F-17)
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeUnicode,
  containsSuspiciousUnicode,
  analyzeUnicodeContent,
} from '../unicode-normalizer';

describe('unicode-normalizer', () => {
  describe('normalizeUnicode', () => {
    it('should normalize Cyrillic lookalikes to Latin', () => {
      // Cyrillic 'а' (U+0430) looks like Latin 'a'
      const input = 'p\u0430ssword'; // Contains Cyrillic а
      const result = normalizeUnicode(input);

      expect(result.normalized).toBe('password');
      expect(result.wasModified).toBe(true);
    });

    it('should normalize Greek lookalikes to Latin', () => {
      // Greek 'ο' (U+03BF) looks like Latin 'o'
      const input = 'hell\u03BF'; // Contains Greek ο
      const result = normalizeUnicode(input);

      expect(result.normalized).toBe('hello');
      expect(result.wasModified).toBe(true);
    });

    it('should normalize typographic quotes to ASCII', () => {
      const input = '\u201Cciao\u201D'; // "ciao" with smart quotes
      const result = normalizeUnicode(input);

      expect(result.normalized).toBe('"ciao"');
      expect(result.wasModified).toBe(true);
    });

    it('should normalize various dashes to hyphen', () => {
      const input = 'a\u2013b\u2014c'; // en-dash and em-dash
      const result = normalizeUnicode(input);

      expect(result.normalized).toBe('a-b-c');
    });

    it('should not modify clean ASCII text', () => {
      const input = 'Hello World 123!';
      const result = normalizeUnicode(input);

      expect(result.normalized).toBe(input);
      expect(result.wasModified).toBe(false);
    });

    it('should preserve legitimate Italian accented characters', () => {
      const input = 'città perché così';
      const result = normalizeUnicode(input);

      expect(result.normalized).toBe(input);
      expect(result.wasModified).toBe(false);
    });

    it('should handle empty string', () => {
      const result = normalizeUnicode('');
      expect(result.normalized).toBe('');
      expect(result.wasModified).toBe(false);
    });

    it('should track changes made', () => {
      const input = '\u0430bc'; // Cyrillic а at start
      const result = normalizeUnicode(input);

      expect(result.changes).toBeDefined();
      expect(result.changes.length).toBeGreaterThan(0);
      expect(result.changes.some((c) => c.type === 'homoglyph_replaced')).toBe(true);
    });

    it('should remove invisible characters', () => {
      const input = 'hello\u200Bworld'; // Zero-width space
      const result = normalizeUnicode(input);

      expect(result.normalized).toBe('helloworld');
      expect(result.wasModified).toBe(true);
    });
  });

  describe('containsSuspiciousUnicode', () => {
    it('should detect Cyrillic homoglyphs', () => {
      const input = '\u0430\u0435\u043E\u0440\u0441'; // Cyrillic аеорс
      const result = containsSuspiciousUnicode(input);

      expect(result.suspicious).toBe(true);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('should detect Greek homoglyphs', () => {
      const input = '\u03B7\u03B8\u03B9\u03BA\u03BF\u03C2'; // Greek ηθικος
      const result = containsSuspiciousUnicode(input);

      expect(result.suspicious).toBe(true);
    });

    it('should return clean for normal text', () => {
      const input = 'Normal English text';
      const result = containsSuspiciousUnicode(input);

      expect(result.suspicious).toBe(false);
    });

    it('should allow legitimate Italian text', () => {
      const input = 'Lezione di italiano';
      const result = containsSuspiciousUnicode(input);

      // Pure Latin script should not be flagged
      expect(result.suspicious).toBe(false);
    });

    it('should detect mixed scripts attack', () => {
      // Mixing Latin and Cyrillic in same text
      const input = 'p\u0430ypal'; // Cyrillic а in Latin word
      const result = containsSuspiciousUnicode(input);

      expect(result.suspicious).toBe(true);
      expect(result.reasons.some((r) => r.includes('Mixed script'))).toBe(true);
    });

    it('should return false for empty string', () => {
      const result = containsSuspiciousUnicode('');
      expect(result.suspicious).toBe(false);
    });
  });

  describe('analyzeUnicodeContent', () => {
    it('should identify Latin script', () => {
      const result = analyzeUnicodeContent('Hello World');

      expect(result.scripts).toContain('Latin');
      expect(result.hasHomoglyphs).toBe(false);
    });

    it('should identify Cyrillic script', () => {
      const result = analyzeUnicodeContent('\u041F\u0440\u0438\u0432\u0435\u0442'); // Привет

      expect(result.scripts).toContain('Cyrillic');
    });

    it('should detect homoglyphs', () => {
      const result = analyzeUnicodeContent('p\u0430ssword'); // Cyrillic а

      expect(result.hasHomoglyphs).toBe(true);
    });

    it('should detect invisible characters', () => {
      const result = analyzeUnicodeContent('hello\u200Bworld');

      expect(result.hasInvisible).toBe(true);
    });

    it('should report normalized length', () => {
      const input = 'hello\u200Bworld'; // Zero-width space
      const result = analyzeUnicodeContent(input);

      expect(result.normalizedLength).toBeLessThan(result.length);
    });
  });
});
