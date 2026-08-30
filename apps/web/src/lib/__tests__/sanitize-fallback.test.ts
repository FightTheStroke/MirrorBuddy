import { describe, it, expect } from 'vitest';
import { sanitizeFallback } from '../sanitize';

/**
 * Regression tests for the SSR-only fallback sanitizer.
 *
 * This path only runs when `typeof window === 'undefined'` (see sanitize.ts),
 * so the jsdom-backed tests in sanitize.test.ts never exercise it — every one
 * of those tests goes through DOMPurify instead. Nothing was testing this
 * function directly before this file, which is exactly the kind of "guardian
 * that never fired" this project has been bitten by elsewhere (ADR 0175).
 */
describe('sanitizeFallback (SSR conservative filter)', () => {
  describe('nested/overlapping tag bypass (CodeQL js/incomplete-multi-character-sanitization)', () => {
    it('does not leave a live <script> tag after removing a nested one', () => {
      const input = '<<script>script>alert(1)</script>';
      const result = sanitizeFallback(input);
      expect(result).not.toMatch(/<script[\s>]/i);
      expect(result).not.toContain('alert(1)');
    });

    it('strips doubled-up event handlers that would survive a single pass', () => {
      const input = '<p oonnclickclick="alert(1)">hi</p>';
      const result = sanitizeFallback(input);
      expect(result).not.toContain('onclick=');
    });

    it('still removes a plain script tag (no regression)', () => {
      const input = '<p>Safe</p><script>alert(1)</script>';
      const result = sanitizeFallback(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Safe</p>');
    });
  });

  describe('obfuscated dangerous protocols (CodeQL js/bad-tag-filter)', () => {
    it('strips javascript: with interspersed whitespace/control chars', () => {
      const input = '<a href="java\tscript:alert(1)">click</a>';
      const result = sanitizeFallback(input);
      expect(result).not.toContain('href=');
    });

    it('strips vbscript: links', () => {
      const input = '<a href="vbscript:msgbox(1)">click</a>';
      const result = sanitizeFallback(input);
      expect(result).not.toContain('href=');
    });

    it('strips data: links', () => {
      const input = '<a href="data:text/html,<script>alert(1)</script>">click</a>';
      const result = sanitizeFallback(input);
      expect(result).not.toContain('href=');
    });

    it('keeps a normal https href untouched', () => {
      const input = '<a href="https://example.com">click</a>';
      const result = sanitizeFallback(input);
      expect(result).toContain('href="https://example.com"');
    });
  });
});
