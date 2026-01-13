/**
 * Helper functions for mindmap export
 */

/**
 * Sanitize filename for safe file system usage
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 100);
}

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
