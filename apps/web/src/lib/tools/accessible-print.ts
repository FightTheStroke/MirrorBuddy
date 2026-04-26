/**
 * Accessible Print Utility
 *
 * Generates printable content with user accessibility settings applied.
 * Supports all Zaino content types with WCAG 2.1 AA compliance.
 */

import { logger } from '@/lib/logger';
import type { PrintOptions, PrintableContentType, DiagramPrintData } from './accessible-print/types';
import { getAccessibilityStyles } from './accessible-print/styles';
import {
  renderMindmap,
  renderFlashcards,
  renderSummary,
  renderQuiz,
  renderTimeline,
  renderDiagram,
  renderGenericContent,
} from './accessible-print/renderers';
import { escapeHtml, sanitizeFilename } from './accessible-print/helpers';
import type {
  MindmapNode,
  FlashcardItem,
  SummaryData,
  QuizData,
  TimelineData,
} from '@/types/tools';

function generateAccessibleHtml(options: PrintOptions): string {
  const {
    title,
    contentType,
    content,
    accessibility,
    showDate = true,
    showWatermark = true,
  } = options;

  const styles = getAccessibilityStyles(accessibility);

  let contentHtml = '';
  switch (contentType) {
    case 'mindmap':
      contentHtml = `<div role="tree" aria-label="Mappa mentale">${renderMindmap(content as MindmapNode[])}</div>`;
      break;
    case 'flashcard':
      contentHtml = renderFlashcards((content as { cards: FlashcardItem[] }).cards || (content as FlashcardItem[]));
      break;
    case 'summary':
      contentHtml = renderSummary(content as SummaryData);
      break;
    case 'quiz':
      contentHtml = renderQuiz(content as QuizData);
      break;
    case 'timeline':
      contentHtml = renderTimeline(content as TimelineData);
      break;
    case 'diagram':
      contentHtml = renderDiagram(content as DiagramPrintData);
      break;
    default:
      contentHtml = renderGenericContent(content);
  }

  const a11yFeatures: string[] = [];
  if (accessibility.dyslexiaFont) a11yFeatures.push('Font dislessia');
  if (accessibility.largeText) a11yFeatures.push('Testo grande');
  if (accessibility.highContrast) a11yFeatures.push('Alto contrasto');
  if (accessibility.increasedLineHeight) a11yFeatures.push('Interlinea aumentata');

  const contentTypeLabels: Record<PrintableContentType, string> = {
    mindmap: 'Mappa Mentale',
    flashcard: 'Flashcard',
    summary: 'Riassunto',
    quiz: 'Quiz',
    diagram: 'Diagramma',
    timeline: 'Linea Temporale',
    search: 'Ricerca',
    demo: 'Demo',
    formula: 'Formula',
    chart: 'Grafico',
  };

  return `
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapeHtml(title)} - MirrorBuddy</title>
      <style>${styles}</style>
    </head>
    <body>
      <main role="main">
        <header>
          <h1>${escapeHtml(title)}</h1>
          <div class="meta">
            ${contentTypeLabels[contentType] || contentType}
            ${showDate ? ` | ${new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
          </div>
          ${a11yFeatures.length > 0 ? `<div class="a11y-indicator" aria-label="Impostazioni accessibilità attive">Accessibilità: ${a11yFeatures.join(', ')}</div>` : ''}
        </header>

        <article>
          ${contentHtml}
        </article>

        ${
          showWatermark
            ? `
        <footer class="footer" aria-hidden="true">
          Generato con MirrorBuddy - ${new Date().toLocaleDateString('it-IT')}
        </footer>
        `
            : ''
        }
      </main>
    </body>
    </html>
  `;
}

export async function printAccessible(options: PrintOptions): Promise<void> {
  const html = generateAccessibleHtml(options);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    logger.error('[AccessiblePrint] Could not open print window');
    throw new Error('Impossibile aprire la finestra di stampa. Controlla le impostazioni popup del browser.');
  }

  printWindow.document.write(html);
  printWindow.document.close();

  await new Promise<void>((resolve) => {
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        resolve();
      }, 500);
    };
  });

  logger.info('[AccessiblePrint] Print initiated', {
    title: options.title,
    contentType: options.contentType,
    a11ySettings: {
      dyslexiaFont: options.accessibility.dyslexiaFont,
      largeText: options.accessibility.largeText,
      highContrast: options.accessibility.highContrast,
    },
  });
}

export function downloadAsHtml(options: PrintOptions): void {
  const html = generateAccessibleHtml(options);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(options.title)}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  logger.info('[AccessiblePrint] HTML downloaded', { filename: link.download });
}

export { generateAccessibleHtml };
export { getAccessibilityStyles } from './accessible-print/styles';
export type { PrintOptions, PrintableContentType } from './accessible-print/types';
