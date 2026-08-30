/**
 * HTML Sanitization Module
 *
 * Provides safe HTML sanitization for AI responses and user-generated content.
 *
 * SECURITY POLICY:
 * - ALWAYS use sanitize() before rendering HTML with dangerouslySetInnerHTML
 * - Allowed tags: p, strong, em, ul, ol, li, code, pre, br, a, h1-h6, table,
 *   thead, tbody, tr, th, td, blockquote, img
 * - Blocked tags: script, iframe, object, embed, form, input
 * - Blocked attributes: onclick, onerror, onload, etc.
 * - Blocked protocols: javascript:, data: (in links)
 *
 * NOTE:
 * - We intentionally avoid `isomorphic-dompurify` here because it pulls `jsdom`
 *   into the server bundle and can fail on Vercel runtime resolution.
 * - For SSR, we apply a conservative fallback sanitizer.
 *
 * @example
 * import { sanitize } from '@/lib/sanitize';
 *
 * const SafeComponent = ({ htmlContent }: { htmlContent: string }) => {
 *   return (
 *     <div dangerouslySetInnerHTML={{ __html: sanitize(htmlContent) }} />
 *   );
 * };
 */

import DOMPurify from 'dompurify';

const SANITIZE_OPTIONS = {
  ALLOWED_TAGS: [
    'p',
    'strong',
    'em',
    'ul',
    'ol',
    'li',
    'code',
    'pre',
    'br',
    'a',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'blockquote',
    'img',
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
  FORBID_ATTR: [
    'onclick',
    'onerror',
    'onload',
    'onmouseover',
    'onfocus',
    'onblur',
    'onchange',
    'onsubmit',
  ],
};

const DANGEROUS_PROTOCOLS = ['javascript', 'vbscript', 'data'];

/**
 * Removes an href/src attribute if its value resolves to a dangerous
 * protocol, tolerating the whitespace/control-character obfuscation
 * browsers themselves ignore (e.g. "java\tscript:") that a plain
 * `javascript:` substring check would miss (CodeQL js/bad-tag-filter).
 */
function stripDangerousUrlAttribute(
  _match: string,
  attr: string,
  quote: string,
  value: string,
): string {
  // Deliberately matches control chars to normalize evasion attempts like "java\tscript:".
  const normalized = value.replace(/[\s\u0000-\u001f]+/g, '').toLowerCase();
  const isDangerous = DANGEROUS_PROTOCOLS.some((protocol) => normalized.startsWith(`${protocol}:`));
  return isDangerous ? '' : ` ${attr}=${quote}${value}${quote}`;
}

/**
 * Conservative SSR fallback: strip executable tags and inline event handlers.
 *
 * Runs every removal to a fixed point (loop until no further change) rather
 * than a single pass, because a single `.replace()` only removes
 * non-overlapping matches once — a nested/overlapping construct such as
 * `<scr<script>ipt>` can still leave a live tag behind after one pass
 * (CodeQL js/incomplete-multi-character-sanitization).
 */
export function sanitizeFallback(html: string): string {
  let previous: string;
  let current = html;

  do {
    previous = current;
    current = current
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
      .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, '')
      .replace(/<embed[\s\S]*?>[\s\S]*?<\/embed>/gi, '')
      .replace(/<form[\s\S]*?>[\s\S]*?<\/form>/gi, '')
      .replace(/<input[\s\S]*?>/gi, '')
      .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
      .replace(/\s(href|src)\s*=\s*(['"])([\s\S]*?)\2/gi, stripDangerousUrlAttribute);
  } while (current !== previous);

  return current;
}

/**
 * Sanitizes HTML content to prevent XSS attacks while preserving safe formatting.
 *
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitize(html: string): string {
  if (!html) return '';

  // During SSR there is no browser DOM available. Avoid runtime crashes.
  if (typeof window === 'undefined') {
    return sanitizeFallback(html);
  }

  return DOMPurify.sanitize(html, SANITIZE_OPTIONS);
}
