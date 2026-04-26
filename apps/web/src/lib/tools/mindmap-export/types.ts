/**
 * Type definitions for mindmap export
 */

export interface MindmapNode {
  id: string;
  text: string;
  children?: MindmapNode[];
  color?: string;
  collapsed?: boolean;
}

export interface MindmapData {
  title: string;
  topic?: string;
  root: MindmapNode;
  createdAt?: string;
  updatedAt?: string;
}

export type ExportFormat =
  | 'json'
  | 'markdown'
  | 'svg'
  | 'png'
  | 'pdf'
  | 'freemind'
  | 'xmind';

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeMetadata?: boolean;
}

export interface ExportResult {
  blob: Blob;
  filename: string;
  mimeType: string;
}
