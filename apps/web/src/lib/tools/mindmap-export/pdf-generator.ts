/**
 * PDF generator for mindmap export
 */

import type { MindmapData, ExportResult } from './types';
import { exportAsMarkdown } from './exporters';

/**
 * Export as PDF
 */
export async function exportAsPDF(mindmap: MindmapData, filename: string): Promise<ExportResult> {
  const markdown = exportAsMarkdown(mindmap, filename);
  const text = await markdown.blob.text();

  const pdfContent = createSimplePDF(mindmap.title, text);
  const blob = new Blob([pdfContent], { type: 'application/pdf' });

  return {
    blob,
    filename: `${filename}.pdf`,
    mimeType: 'application/pdf',
  };
}

/**
 * Create minimal PDF structure
 */
function createSimplePDF(title: string, content: string): string {
  const lines: string[] = [];

  lines.push('%PDF-1.4');
  lines.push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj');
  lines.push('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj');
  lines.push('3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj');

  const text = `BT /F1 12 Tf 50 750 Td (${title}) Tj 0 -20 Td (${content.substring(0, 500).replace(/\n/g, ') Tj 0 -15 Td (')}) Tj ET`;
  lines.push(`4 0 obj << /Length ${text.length} >> stream\n${text}\nendstream endobj`);

  lines.push('xref');
  lines.push('0 5');
  lines.push('0000000000 65535 f');
  lines.push('trailer << /Size 5 /Root 1 0 R >>');
  lines.push('startxref');
  lines.push('0');
  lines.push('%%EOF');

  return lines.join('\n');
}
