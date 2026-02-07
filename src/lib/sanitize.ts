/**
 * HTML Sanitization Module
 *
 * Provides safe HTML sanitization for AI responses and user-generated content.
 * Uses isomorphic-dompurify for both client and server-side rendering (Next.js).
 *
 * SECURITY POLICY:
 * - ALWAYS use sanitize() before rendering HTML with dangerouslySetInnerHTML
 * - Allowed tags: p, strong, em, ul, ol, li, code, pre, br, a, h1-h6, table,
 *   thead, tbody, tr, th, td, blockquote, img
 * - Blocked tags: script, iframe, object, embed, form, input
 * - Blocked attributes: onclick, onerror, onload, etc.
 * - Blocked protocols: javascript:, data: (in links)
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

import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitizes HTML content to prevent XSS attacks while preserving safe formatting.
 *
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitize(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "strong",
      "em",
      "ul",
      "ol",
      "li",
      "code",
      "pre",
      "br",
      "a",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "blockquote",
      "img",
    ],
    ALLOWED_ATTR: [
      "href",
      "src",
      "alt",
      "title",
      "class",
      "id",
      "target",
      "rel",
    ],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input"],
    FORBID_ATTR: [
      "onclick",
      "onerror",
      "onload",
      "onmouseover",
      "onfocus",
      "onblur",
      "onchange",
      "onsubmit",
    ],
  });
}
