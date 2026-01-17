/**
 * Tests for Demo Validators
 */

import { describe, it, expect } from 'vitest';
import { validateCode, sanitizeHtml, validateDescription, PURIFY_CONFIG } from '../demo-validators';

describe('demo-validators', () => {
  describe('PURIFY_CONFIG', () => {
    it('forbids dangerous tags', () => {
      expect(PURIFY_CONFIG.FORBID_TAGS).toContain('script');
      expect(PURIFY_CONFIG.FORBID_TAGS).toContain('iframe');
      expect(PURIFY_CONFIG.FORBID_TAGS).toContain('object');
      expect(PURIFY_CONFIG.FORBID_TAGS).toContain('embed');
      expect(PURIFY_CONFIG.FORBID_TAGS).toContain('form');
    });

    it('forbids dangerous attributes', () => {
      expect(PURIFY_CONFIG.FORBID_ATTR).toContain('onerror');
      expect(PURIFY_CONFIG.FORBID_ATTR).toContain('onload');
      expect(PURIFY_CONFIG.FORBID_ATTR).toContain('onclick');
    });

    it('disallows data attributes', () => {
      expect(PURIFY_CONFIG.ALLOW_DATA_ATTR).toBe(false);
    });
  });

  describe('validateCode', () => {
    it('returns safe for simple code', () => {
      const result = validateCode('const x = 1; console.log(x);');
      expect(result.safe).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('returns safe for normal function code', () => {
      const code = `
        function animate() {
          const element = document.getElementById('canvas');
          element.style.transform = 'rotate(45deg)';
        }
      `;
      const result = validateCode(code);
      expect(result.safe).toBe(true);
    });

    it('detects eval usage', () => {
      const result = validateCode('eval("alert(1)")');
      expect(result.safe).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('detects Function constructor', () => {
      const result = validateCode('new Function("return 1")');
      expect(result.safe).toBe(false);
    });

    it('detects fetch calls', () => {
      const result = validateCode('fetch("http://evil.com")');
      expect(result.safe).toBe(false);
    });

    it('detects XMLHttpRequest', () => {
      const result = validateCode('new XMLHttpRequest()');
      expect(result.safe).toBe(false);
    });

    it('detects document.cookie access', () => {
      const result = validateCode('const x = document.cookie');
      expect(result.safe).toBe(false);
    });

    it('detects localStorage access', () => {
      const result = validateCode('localStorage.setItem("key", "value")');
      expect(result.safe).toBe(false);
    });

    it('detects window.location manipulation', () => {
      const result = validateCode('window.location.href = "evil.com"');
      expect(result.safe).toBe(false);
    });

    it('returns multiple violations', () => {
      const code = 'eval("1"); fetch("/"); document.write("");';
      const result = validateCode(code);
      expect(result.safe).toBe(false);
      expect(result.violations.length).toBeGreaterThan(1);
    });

    it('handles empty code', () => {
      const result = validateCode('');
      expect(result.safe).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('sanitizeHtml', () => {
    it('returns empty string for empty input', () => {
      expect(sanitizeHtml('')).toBe('');
    });

    it('preserves safe HTML', () => {
      const html = '<div class="container"><p>Hello World</p></div>';
      const result = sanitizeHtml(html);
      expect(result).toContain('div');
      expect(result).toContain('Hello World');
    });

    it('removes script tags', () => {
      const html = '<div>Safe</div><script>alert("XSS")</script>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('script');
      expect(result).not.toContain('alert');
      expect(result).toContain('Safe');
    });

    it('removes iframe tags', () => {
      const html = '<iframe src="evil.html"></iframe>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('iframe');
    });

    it('removes event handlers', () => {
      const html = '<div onclick="evil()">Click</div>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('onclick');
      expect(result).toContain('Click');
    });

    it('removes onerror handlers', () => {
      const html = '<img onerror="alert(1)" src="x">';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('onerror');
    });

    it('removes form tags', () => {
      const html = '<form action="evil"><input></form>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('form');
    });

    it('preserves classes and ids', () => {
      const html = '<div id="main" class="container">Content</div>';
      const result = sanitizeHtml(html);
      expect(result).toContain('container');
      expect(result).toContain('main');
    });

    it('handles nested tags', () => {
      const html = '<div><span><b>Bold</b></span></div>';
      const result = sanitizeHtml(html);
      expect(result).toContain('Bold');
      expect(result).toContain('div');
      expect(result).toContain('span');
    });

    it('handles null/undefined gracefully', () => {
      expect(sanitizeHtml(null as unknown as string)).toBe('');
      expect(sanitizeHtml(undefined as unknown as string)).toBe('');
    });
  });

  describe('validateDescription', () => {
    it('returns valid for complete description', () => {
      const result = validateDescription({
        visualization: '5 blocchi colorati in una griglia',
        interaction: 'slider per cambiare il numero',
      });
      expect(result.valid).toBe(true);
      expect(result.suggestions).toBeUndefined();
    });

    it('suggests visual elements when missing', () => {
      const result = validateDescription({
        visualization: 'something abstract',
        interaction: 'slider per modificare',
      });
      expect(result.valid).toBe(false);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions?.some((s) => s.includes('elemento visivo'))).toBe(true);
    });

    it('suggests interaction type when missing', () => {
      const result = validateDescription({
        visualization: '10 blocchi in griglia',
        interaction: 'fare qualcosa',
      });
      expect(result.valid).toBe(false);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions?.some((s) => s.includes('interazione'))).toBe(true);
    });

    it('suggests quantities when missing', () => {
      const result = validateDescription({
        visualization: 'blocchi in griglia',
        interaction: 'click per selezionare',
      });
      expect(result.valid).toBe(false);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions?.some((s) => s.includes('quantità'))).toBe(true);
    });

    it('accepts numeric quantities', () => {
      const result = validateDescription({
        visualization: '10 blocchi colorati',
        interaction: 'click per cambiare colore',
      });
      expect(result.valid).toBe(true);
    });

    it('accepts word quantities (alcuni, molti)', () => {
      const result = validateDescription({
        visualization: 'alcuni cerchi animati',
        interaction: 'hover per espandere',
      });
      expect(result.valid).toBe(true);
    });

    it('recognizes various visual keywords', () => {
      const visualKeywords = ['blocchi', 'griglia', 'cerchi', 'timeline', 'mappa', 'grafico', 'particelle'];
      for (const keyword of visualKeywords) {
        const result = validateDescription({
          visualization: `5 ${keyword} colorati`,
          interaction: 'click per interagire',
        });
        expect(result.suggestions?.some((s) => s.includes('elemento visivo'))).toBeFalsy();
      }
    });

    it('recognizes various interaction keywords', () => {
      const interactionKeywords = ['slider', 'click', 'trascina', 'drag', 'hover', 'bottone'];
      for (const keyword of interactionKeywords) {
        const result = validateDescription({
          visualization: '10 blocchi',
          interaction: `usa ${keyword} per controllare`,
        });
        expect(result.suggestions?.some((s) => s.includes('tipo di interazione'))).toBeFalsy();
      }
    });

    it('is case insensitive', () => {
      const result = validateDescription({
        visualization: '5 BLOCCHI in GRIGLIA',
        interaction: 'CLICK per selezionare',
      });
      expect(result.valid).toBe(true);
    });
  });
});
