/**
 * Material Export Utilities
 *
 * Exports materials in various formats (JSON, Markdown, PDF).
 * Supports bulk export and download.
 *
 * ADR: 0022-knowledge-hub-architecture.md
 */

import type { ToolType } from '@/types/tools';

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

// ============================================================================
// HELPERS
// ============================================================================

function safeJsonParse(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 100);
}

function formatToolType(type: ToolType): string {
  const labels: Partial<Record<ToolType, string>> = {
    mindmap: 'Mappa Mentale',
    quiz: 'Quiz',
    flashcard: 'Flashcard',
    summary: 'Riassunto',
    demo: 'Demo Interattiva',
    diagram: 'Diagramma',
    timeline: 'Timeline',
    formula: 'Formula',
    chart: 'Grafico',
    webcam: 'Immagine',
    pdf: 'PDF',
    homework: 'Compiti',
    search: 'Ricerca',
  };
  return labels[type] || type;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateCompact(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatContentAsMarkdown(type: ToolType, content: unknown): string {
  if (!content || typeof content !== 'object') {
    return String(content || '');
  }

  const obj = content as Record<string, unknown>;

  switch (type) {
    case 'mindmap':
      return obj.markdown ? String(obj.markdown) : JSON.stringify(content, null, 2);

    case 'quiz':
      if (!Array.isArray(obj.questions)) return JSON.stringify(content, null, 2);
      return obj.questions
        .map((q: unknown, i: number) => {
          const question = q as Record<string, unknown>;
          const lines = [`## Domanda ${i + 1}`, '', String(question.question)];
          if (Array.isArray(question.options)) {
            lines.push('', ...question.options.map((o, j) => `${j + 1}. ${o}`));
          }
          if (question.explanation) {
            lines.push('', `> ${question.explanation}`);
          }
          return lines.join('\n');
        })
        .join('\n\n');

    case 'flashcard':
      if (!Array.isArray(obj.cards)) return JSON.stringify(content, null, 2);
      return obj.cards
        .map((c: unknown, i: number) => {
          const card = c as Record<string, unknown>;
          return `## Card ${i + 1}\n\n**Domanda**: ${card.front}\n\n**Risposta**: ${card.back}`;
        })
        .join('\n\n---\n\n');

    case 'summary':
      return String(obj.text || obj.content || obj.summary || JSON.stringify(content));

    default:
      return JSON.stringify(content, null, 2);
  }
}
