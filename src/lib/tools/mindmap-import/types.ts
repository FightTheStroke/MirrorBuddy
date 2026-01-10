/**
 * Type definitions for mindmap import functionality
 */

import type { MindmapData, MindmapNode } from '../mindmap-export';

export type ImportFormat = 'json' | 'markdown' | 'freemind' | 'xmind' | 'text';

export interface ImportOptions {
  format?: ImportFormat;
}

export interface ImportResult {
  success: boolean;
  mindmap?: MindmapData;
  error?: string;
  warnings?: string[];
}
