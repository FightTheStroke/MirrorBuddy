/**
 * Helper functions for mindmap export
 */

import { sanitizeFilename } from '@/lib/utils/sanitize';

export { sanitizeFilename };

/**
 * Escape XML special characters
 */
export function escapeXML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `id_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}
