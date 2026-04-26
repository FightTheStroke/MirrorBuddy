/**
 * Format detection for mindmap imports
 */

import type { ImportFormat } from './types';

/**
 * Detect format from filename and content
 */
export function detectFormat(
  filename: string,
  content: string | ArrayBuffer
): ImportFormat {
  const ext = filename.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'json':
      return 'json';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'mm':
      return 'freemind';
    case 'xmind':
      return 'xmind';
    case 'txt':
      return 'text';
    default:
      // Try to detect from content
      if (typeof content === 'string') {
        if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
          return 'json';
        }
        if (content.includes('<?xml') && content.includes('<map')) {
          return 'freemind';
        }
        if (content.startsWith('#') || content.includes('\n- ')) {
          return 'markdown';
        }
      }
      return 'text';
  }
}
