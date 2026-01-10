/**
 * Mindmap Export Module
 * Multi-format export support for mindmaps
 */

export type { MindmapNode, MindmapData, ExportFormat, ExportOptions, ExportResult } from './types';

import { logger } from '@/lib/logger';
import type { MindmapData, ExportOptions, ExportResult } from './types';
import { sanitizeFilename } from './helpers';
import {
  exportAsJSON,
  exportAsMarkdown,
  exportAsFreeMind,
  exportAsXMind,
} from './exporters';
import { exportAsSVG, exportAsPNG } from './svg-generator';
import { exportAsPDF } from './pdf-generator';

/**
 * Export mindmap to specified format
 */
export async function exportMindmap(
  mindmap: MindmapData,
  options: ExportOptions
): Promise<ExportResult> {
  const { format, filename, includeMetadata = true } = options;
  const baseFilename = filename || sanitizeFilename(mindmap.title || 'mindmap');

  logger.info('Exporting mindmap', { format, title: mindmap.title });

  switch (format) {
    case 'json':
      return exportAsJSON(mindmap, baseFilename, includeMetadata);
    case 'markdown':
      return exportAsMarkdown(mindmap, baseFilename);
    case 'svg':
      return exportAsSVG(mindmap, baseFilename);
    case 'png':
      return await exportAsPNG(mindmap, baseFilename);
    case 'pdf':
      return await exportAsPDF(mindmap, baseFilename);
    case 'freemind':
      return exportAsFreeMind(mindmap, baseFilename);
    case 'xmind':
      return await exportAsXMind(mindmap, baseFilename);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Trigger file download in browser
 */
export function downloadExport(result: ExportResult): void {
  if (typeof window === 'undefined') {
    throw new Error('Download requires browser environment');
  }

  const url = URL.createObjectURL(result.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = result.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  logger.info('Mindmap exported and downloaded', { filename: result.filename });
}
