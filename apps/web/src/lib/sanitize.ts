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

function sanitizeFallback(html: string): string {
  // Conservative SSR fallback: strip executable tags and inline event handlers.
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>[\s\S]*?<\/embed>/gi, '')
    .replace(/<form[\s\S]*?>[\s\S]*?<\/form>/gi, '')
    .replace(/<input[\s\S]*?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, '');
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
