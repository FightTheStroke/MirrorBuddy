/**
 * Summary Export Utilities
 *
 * Functions for exporting summaries to various formats
 * and converting to other tool types.
 *
 * Part of Issue #70: Real-time summary tool
 */

import { logger } from '@/lib/logger';
import type { SummaryData, MindmapNode, FlashcardItem } from '@/types/tools';

// ============================================================================
// PDF EXPORT
// ============================================================================

/**
 * Generate HTML content for PDF export
 */
export function generateSummaryHtml(data: SummaryData): string {
  const styles = `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 800px;
        margin: 0 auto;
        padding: 40px 20px;
        color: #1e293b;
        line-height: 1.6;
      }
      h1 {
        font-size: 28px;
        margin-bottom: 8px;
        color: #0f172a;
        border-bottom: 2px solid #3b82f6;
        padding-bottom: 8px;
      }
      .meta {
        font-size: 14px;
        color: #64748b;
        margin-bottom: 24px;
      }
      h2 {
        font-size: 20px;
        margin-top: 24px;
        margin-bottom: 12px;
        color: #1e40af;
      }
      p {
        margin-bottom: 16px;
      }
      ul {
        margin: 12px 0;
        padding-left: 24px;
      }
      li {
        margin-bottom: 8px;
      }
      li::marker {
        color: #3b82f6;
      }
      .section {
        margin-bottom: 24px;
        padding: 16px;
        background: #f8fafc;
        border-radius: 8px;
        border-left: 4px solid #3b82f6;
      }
      .footer {
        margin-top: 40px;
        padding-top: 16px;
        border-top: 1px solid #e2e8f0;
        font-size: 12px;
        color: #94a3b8;
        text-align: center;
      }
    </style>
  `;

  const sections = data.sections
    .map(
      (section) => `
      <div class="section">
        <h2>${escapeHtml(section.title)}</h2>
        ${section.content ? `<p>${escapeHtml(section.content)}</p>` : ''}
        ${
          section.keyPoints && section.keyPoints.length > 0
            ? `<ul>${section.keyPoints.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>`
            : ''
        }
      </div>
    `
    )
    .join('');

  const lengthLabel =
    data.length === 'short'
      ? 'Breve'
      : data.length === 'medium'
        ? 'Medio'
        : data.length === 'long'
          ? 'Lungo'
          : '';

  return `
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapeHtml(data.topic)}</title>
      ${styles}
    </head>
    <body>
      <h1>${escapeHtml(data.topic)}</h1>
      ${lengthLabel ? `<div class="meta">Riassunto ${lengthLabel}</div>` : ''}
      ${sections}
      <div class="footer">
        Generato con ConvergioEdu - ${new Date().toLocaleDateString('it-IT')}
      </div>
    </body>
    </html>
  `;
}

/**
 * Export summary to PDF using browser print
 */
export async function exportSummaryToPdf(data: SummaryData): Promise<void> {
  const html = generateSummaryHtml(data);

  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    logger.error('[SummaryExport] Could not open print window');
    throw new Error('Impossibile aprire la finestra di stampa');
  }

  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for content to load, then print
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };

  logger.info('[SummaryExport] PDF export initiated', { topic: data.topic });
}

// ============================================================================
// CONVERT TO MINDMAP
// ============================================================================

/**
 * Convert summary sections to mindmap nodes
 */
export function convertSummaryToMindmap(data: SummaryData): {
  topic: string;
  nodes: MindmapNode[];
} {
  const nodes: MindmapNode[] = [];
  let nodeId = 1;

  // Root node
  const rootId = `node-${nodeId++}`;
  nodes.push({
    id: rootId,
    label: data.topic,
    parentId: null,
  });

  // Create nodes for each section
  for (const section of data.sections) {
    const sectionId = `node-${nodeId++}`;
    nodes.push({
      id: sectionId,
      label: section.title,
      parentId: rootId,
    });

    // Add key points as child nodes
    if (section.keyPoints && section.keyPoints.length > 0) {
      for (const point of section.keyPoints) {
        nodes.push({
          id: `node-${nodeId++}`,
          label: point,
          parentId: sectionId,
        });
      }
    }
  }

  logger.info('[SummaryExport] Converted to mindmap', {
    topic: data.topic,
    nodesCount: nodes.length,
  });

  return {
    topic: data.topic,
    nodes,
  };
}

// ============================================================================
// GENERATE FLASHCARDS
// ============================================================================

/**
 * Generate flashcards from summary key points
 */
export function generateFlashcardsFromSummary(data: SummaryData): {
  topic: string;
  cards: FlashcardItem[];
} {
  const cards: FlashcardItem[] = [];

  for (const section of data.sections) {
    // Create a card for the section itself if it has content
    if (section.content) {
      cards.push({
        front: `Cosa sai su: ${section.title}?`,
        back: section.content,
      });
    }

    // Create cards for each key point
    if (section.keyPoints && section.keyPoints.length > 0) {
      for (const point of section.keyPoints) {
        // Create a question from the point
        cards.push({
          front: `${section.title}: Completa la frase...`,
          back: point,
        });
      }
    }
  }

  logger.info('[SummaryExport] Generated flashcards', {
    topic: data.topic,
    cardsCount: cards.length,
  });

  return {
    topic: data.topic,
    cards,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const div = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (div) {
    div.textContent = text;
    return div.innerHTML;
  }
  // Server-side fallback
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
