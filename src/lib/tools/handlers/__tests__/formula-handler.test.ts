/**
 * Tests for Formula Handler
 */

import { describe, it, expect } from 'vitest';
import { isLatex, validateLatex } from '../formula-handler';

describe('formula-handler', () => {
  describe('isLatex', () => {
    it('detects LaTeX commands', () => {
      expect(isLatex('\\frac{1}{2}')).toBe(true);
      expect(isLatex('\\sqrt{x}')).toBe(true);
      expect(isLatex('\\sum_{i=1}^{n}')).toBe(true);
      expect(isLatex('\\int_{0}^{\\infty}')).toBe(true);
      expect(isLatex('\\prod_{i=1}^{n}')).toBe(true);
    });

    it('detects superscripts', () => {
      expect(isLatex('x^2')).toBe(true);
      expect(isLatex('x^{10}')).toBe(true);
      expect(isLatex('e^{-x}')).toBe(true);
    });

    it('detects subscripts', () => {
      expect(isLatex('x_n')).toBe(true);
      expect(isLatex('a_{max}')).toBe(true);
      expect(isLatex('x_{i}')).toBe(true);
    });

    it('detects delimiters', () => {
      expect(isLatex('\\left( x \\right)')).toBe(true);
      expect(isLatex('\\left[ x \\right]')).toBe(true);
    });

    it('returns false for plain text', () => {
      expect(isLatex('hello world')).toBe(false);
      expect(isLatex('2 + 2 = 4')).toBe(false);
      expect(isLatex('simple math')).toBe(false);
    });

    it('detects Greek letters', () => {
      expect(isLatex('\\alpha + \\beta')).toBe(true);
      expect(isLatex('\\pi r^2')).toBe(true);
    });
  });

  describe('validateLatex', () => {
    it('validates correct LaTeX', () => {
      expect(validateLatex('a^{2} + b^{2} = c^{2}')).toEqual({ valid: true });
      expect(validateLatex('\\frac{a}{b}')).toEqual({ valid: true });
      expect(validateLatex('\\sqrt{x}')).toEqual({ valid: true });
    });

    it('detects unbalanced opening braces', () => {
      const result = validateLatex('a^{2');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unbalanced braces');
    });

    it('detects unbalanced closing braces', () => {
      const result = validateLatex('a^2}');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unbalanced braces');
    });

    it('validates balanced nested braces', () => {
      expect(validateLatex('\\frac{a^{2}}{b^{2}}')).toEqual({ valid: true });
      expect(validateLatex('{{{{a}}}}')).toEqual({ valid: true });
    });

    it('detects unbalanced delimiters', () => {
      const result = validateLatex('\\left( x + y');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unbalanced delimiters');
    });

    it('validates balanced delimiters', () => {
      expect(validateLatex('\\left( x \\right)')).toEqual({ valid: true });
      expect(validateLatex('\\left[ \\frac{a}{b} \\right]')).toEqual({ valid: true });
    });

    it('handles multiple delimiter pairs', () => {
      expect(validateLatex('\\left( \\left[ x \\right] \\right)')).toEqual({ valid: true });
    });

    it('validates empty string', () => {
      expect(validateLatex('')).toEqual({ valid: true });
    });

    it('validates simple expressions without special syntax', () => {
      expect(validateLatex('a + b = c')).toEqual({ valid: true });
    });

    it('counts braces correctly with unmatched count', () => {
      const result = validateLatex('{{{');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('3 unclosed');
    });
  });
});
