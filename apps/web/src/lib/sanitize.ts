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
import sanitizeHtml from 'sanitize-html';

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

/**
 * Conservative SSR fallback: sanitizes with the same allowlist as the
 * DOMPurify path above, using `sanitize-html` (a real HTML5 parser via
 * `htmlparser2`, not a hand-rolled regex). A regex-based tag/attribute
 * stripper — even looped to a fixed point — kept tripping CodeQL's
 * js/incomplete-multi-character-sanitization and js/bad-tag-filter rules,
 * because the tool has no way to prove the loop actually converges; a real
 * parser removes that whole class of finding instead of trying to out-regex
 * it. `sanitize-html` is pure JS (htmlparser2-based, no native bindings), so
 * it's safe to run in the Vercel Node runtime without the jsdom bundling
 * issues that rule out `isomorphic-dompurify` here.
 */
export function sanitizeFallback(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: SANITIZE_OPTIONS.ALLOWED_TAGS,
    allowedAttributes: {
      '*': SANITIZE_OPTIONS.ALLOWED_ATTR,
    },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
  });
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
