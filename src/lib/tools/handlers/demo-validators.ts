// ============================================================================
// DEMO VALIDATORS
// Validation and sanitization utilities for demo generation
// ============================================================================

import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { DANGEROUS_JS_PATTERNS } from './demo-handler/constants';

// Create DOMPurify instance for server-side sanitization
const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Configure DOMPurify to be strict about XSS prevention
export const PURIFY_CONFIG = {
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  ALLOW_DATA_ATTR: false,
  USE_PROFILES: { html: true },
};

/**
 * Validate JavaScript code for dangerous patterns.
 * This is a BLOCKLIST check, not HTML sanitization.
 * HTML sanitization is handled separately by DOMPurify.
 * lgtm[js/bad-tag-filter]
 */
export function validateCode(code: string): { safe: boolean; violations: string[] } {
  const violations: string[] = [];
  for (const { pattern, description } of DANGEROUS_JS_PATTERNS) {
    // Reset regex state for global patterns
    pattern.lastIndex = 0;
    if (pattern.test(code)) {
      violations.push(description);
    }
  }
  return { safe: violations.length === 0, violations };
}

/**
 * Sanitize HTML using DOMPurify - battle-tested XSS prevention library.
 * DOMPurify properly handles all edge cases including:
 * - Script injection, event handlers, javascript: URLs
 * - Unicode/multi-byte character obfuscation attacks
 * - Nested tags, malformed HTML, and encoding tricks
 * See: https://github.com/cure53/DOMPurify
 * lgtm[js/incomplete-multi-character-sanitization]
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return purify.sanitize(html, PURIFY_CONFIG);
}

/**
 * Validate and enhance the maestro's description
 * Returns suggestions if description is too vague
 */
export function validateDescription(description: {
  visualization: string;
  interaction: string;
}): { valid: boolean; suggestions?: string[] } {
  const suggestions: string[] = [];

  // Check for visual elements
  const visualKeywords = ['blocchi', 'griglia', 'cerchi', 'timeline', 'mappa', 'grafico', 'particelle',
    'forme', 'elementi', 'punti', 'linea', 'barra', 'torta', 'albero', 'diagramma'];
  const hasVisual = visualKeywords.some(k => description.visualization.toLowerCase().includes(k));
  if (!hasVisual) {
    suggestions.push('Specifica il tipo di elemento visivo: blocchi, griglia, timeline, mappa, grafico, particelle');
  }

  // Check for interaction type
  const interactionKeywords = ['slider', 'click', 'trascina', 'drag', 'hover', 'input', 'bottone',
    'seleziona', 'cambia', 'muovi', 'scrolla', 'naviga'];
  const hasInteraction = interactionKeywords.some(k => description.interaction.toLowerCase().includes(k));
  if (!hasInteraction) {
    suggestions.push('Specifica il tipo di interazione: slider, click, drag & drop, hover, bottoni');
  }

  // Check for quantities (helps generate better demos)
  const hasNumbers = /\d+/.test(description.visualization) ||
    ['alcuni', 'pochi', 'molti', 'tanti'].some(w => description.visualization.toLowerCase().includes(w));
  if (!hasNumbers) {
    suggestions.push('Indica quantità specifiche: "5 blocchi", "3 righe", "una dozzina di particelle"');
  }

  return {
    valid: suggestions.length === 0,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };
}
