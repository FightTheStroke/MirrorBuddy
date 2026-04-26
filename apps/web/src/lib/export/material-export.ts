/**
 * Material Export Utilities
 *
 * Exports materials in various formats (JSON, Markdown, PDF).
 * Supports bulk export and download.
 *
 * ADR: 0022-knowledge-hub-architecture.md
 */

import type { ToolType } from '@/types/tools';
import {
  safeJsonParse,
  sanitizeFilename,
  formatToolType,
  formatDate,
  formatDateCompact,
  formatContentAsMarkdown,
} from './export-helpers';

// ============================================================================
// TYPES
// ============================================================================

export type ExportFormat = 'json' | 'markdown' | 'pdf';

export interface ExportableMaterial {
  id: string;
  title: string;
  toolType: ToolType;
  content: string; // JSON string
  subject?: string | null;
  maestroId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportResult {
  blob: Blob;
  filename: string;
  mimeType: string;
}

export interface BulkExportResult {
  blob: Blob;
  filename: string;
  mimeType: string;
  materialCount: number;
}

// ============================================================================
// SINGLE MATERIAL EXPORT
// ============================================================================

/**
 * Export a single material to the specified format.
 */
export async function exportMaterial(
  material: ExportableMaterial,
  format: ExportFormat
): Promise<ExportResult> {
  switch (format) {
    case 'json':
      return exportAsJson(material);
    case 'markdown':
      return exportAsMarkdown(material);
    case 'pdf':
      return exportAsPdf(material);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

function exportAsJson(material: ExportableMaterial): ExportResult {
  const data = {
    id: material.id,
    title: material.title,
    type: material.toolType,
    subject: material.subject,
    maestroId: material.maestroId,
    content: safeJsonParse(material.content),
    exportedAt: new Date().toISOString(),
    createdAt: material.createdAt.toISOString(),
    updatedAt: material.updatedAt.toISOString(),
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const filename = sanitizeFilename(`${material.title}.json`);

  return { blob, filename, mimeType: 'application/json' };
}

function exportAsMarkdown(material: ExportableMaterial): ExportResult {
  const content = safeJsonParse(material.content);
  const lines: string[] = [];

  // Header
  lines.push(`# ${material.title}`);
  lines.push('');
  lines.push(`**Tipo**: ${formatToolType(material.toolType)}`);
  if (material.subject) {
    lines.push(`**Materia**: ${material.subject}`);
  }
  lines.push(`**Creato**: ${formatDate(material.createdAt)}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Content based on type
  lines.push(formatContentAsMarkdown(material.toolType, content));

  const markdown = lines.join('\n');
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const filename = sanitizeFilename(`${material.title}.md`);

  return { blob, filename, mimeType: 'text/markdown' };
}

async function exportAsPdf(material: ExportableMaterial): Promise<ExportResult> {
  // For now, export as markdown and note that PDF requires browser
  // In production, use a library like pdfmake or jspdf
  const markdown = exportAsMarkdown(material);

  // Create a simple HTML wrapper for printing
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${material.title}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    h1 { color: #333; }
    pre { background: #f5f5f5; padding: 16px; overflow-x: auto; }
    code { font-family: monospace; }
  </style>
</head>
<body>
  <h1>${material.title}</h1>
  <p><strong>Tipo</strong>: ${formatToolType(material.toolType)}</p>
  ${material.subject ? `<p><strong>Materia</strong>: ${material.subject}</p>` : ''}
  <p><strong>Creato</strong>: ${formatDate(material.createdAt)}</p>
  <hr>
  <pre>${await markdown.blob.text()}</pre>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const filename = sanitizeFilename(`${material.title}.html`);

  return { blob, filename, mimeType: 'text/html' };
}

// ============================================================================
// BULK EXPORT
// ============================================================================

/**
 * Export multiple materials as a single ZIP or JSON file.
 */
export async function exportMaterialsBulk(
  materials: ExportableMaterial[],
  format: ExportFormat = 'json'
): Promise<BulkExportResult> {
  if (materials.length === 0) {
    throw new Error('No materials to export');
  }

  if (materials.length === 1) {
    const result = await exportMaterial(materials[0], format);
    return { ...result, materialCount: 1 };
  }

  // For bulk export, use JSON format with all materials
  const data = {
    exportedAt: new Date().toISOString(),
    count: materials.length,
    materials: materials.map((m) => ({
      id: m.id,
      title: m.title,
      type: m.toolType,
      subject: m.subject,
      maestroId: m.maestroId,
      content: safeJsonParse(m.content),
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    })),
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const filename = `mirrorbuddy-export-${formatDateCompact(new Date())}.json`;

  return {
    blob,
    filename,
    mimeType: 'application/json',
    materialCount: materials.length,
  };
}

// ============================================================================
// DOWNLOAD HELPERS
// ============================================================================

/**
 * Trigger a browser download for an export result.
 */
export function downloadExport(result: ExportResult | BulkExportResult): void {
  const url = URL.createObjectURL(result.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = result.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

