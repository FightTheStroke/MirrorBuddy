import { sanitizeFilename } from '@/lib/utils/sanitize';

export { sanitizeFilename };

/**
 * Escape HTML special characters
 * Uses explicit replacement for consistent behavior across environments
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
