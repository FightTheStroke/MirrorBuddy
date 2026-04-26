/**
 * Sanitize filename for safe file system usage
 * Replaces invalid filesystem characters and limits length
 *
 * @param name - The filename to sanitize
 * @param maxLength - Maximum filename length (default: 100)
 * @returns Sanitized filename safe for filesystem operations
 */
export function sanitizeFilename(name: string, maxLength = 100): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, maxLength);
}
