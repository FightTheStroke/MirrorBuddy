/**
 * Mindmap Import Module
 * Multi-format import support for mindmaps
 */

export type { ImportFormat, ImportOptions, ImportResult } from './types';

import { logger } from '@/lib/logger';
import type { ImportOptions, ImportResult } from './types';
import { detectFormat } from './format-detection';
import {
  importFromJSON,
  importFromMarkdown,
  importFromFreeMind,
  importFromXMind,
  importFromText,
} from './importers';

/**
 * Import mindmap from file content
 */
export async function importMindmap(
  content: string | ArrayBuffer,
  filename: string,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const format = options.format || detectFormat(filename, content);

  logger.info('Importing mindmap', { format, filename });

  try {
    switch (format) {
      case 'json':
        return importFromJSON(content as string);
      case 'markdown':
        return importFromMarkdown(content as string);
      case 'freemind':
        return importFromFreeMind(content as string);
      case 'xmind':
        return importFromXMind(content);
      case 'text':
        return importFromText(content as string);
      default:
        return {
          success: false,
          error: `Unsupported format: ${format}`,
        };
    }
  } catch (error) {
    logger.error('Mindmap import failed', { error: String(error) });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Import failed',
    };
  }
}

/**
 * Import mindmap from File object (browser)
 */
export async function importMindmapFromFile(file: File): Promise<ImportResult> {
  const content = await file.text();
  return importMindmap(content, file.name);
}

export { validateMindmap } from './validation';
