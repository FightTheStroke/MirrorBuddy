/**
 * Accessible Print Utility
 *
 * Generates printable content with user accessibility settings applied.
 * Supports all Zaino content types with WCAG 2.1 AA compliance.
 *
 * Features:
 * - Dyslexic fonts (OpenDyslexic)
 * - Customizable line/letter spacing
 * - High contrast mode
 * - Large text support
 * - Semantic HTML for screen readers
 * - Print-optimized layouts
 */

import { logger } from '@/lib/logger';
import type { AccessibilitySettings } from '@/lib/accessibility/accessibility-store';
import type {
  MindmapNode,
  FlashcardItem,
  SummaryData,
  QuizData,
  TimelineData,
} from '@/types/tools';

// Local interface for diagram rendering (mermaid code based)
interface DiagramPrintData {
  topic: string;
  diagramType?: string;
  mermaidCode?: string;
}

// ============================================================================
// TYPES
// ============================================================================

export type PrintableContentType =
  | 'mindmap'
  | 'flashcard'
  | 'summary'
  | 'quiz'
  | 'diagram'
  | 'timeline'
  | 'search'
  | 'demo'
  | 'formula'
  | 'chart';

export interface PrintOptions {
  title: string;
  contentType: PrintableContentType;
  content: unknown;
  accessibility: Partial<AccessibilitySettings>;
  showDate?: boolean;
  showWatermark?: boolean;
}

// ============================================================================
// ACCESSIBILITY STYLES
// ============================================================================

function getAccessibilityStyles(settings: Partial<AccessibilitySettings>): string {
  const fontFamily = settings.dyslexiaFont
    ? "'OpenDyslexic', 'Comic Sans MS', Arial, sans-serif"
    : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  // Dyslexic users get extra large font (1.4x) in addition to any other settings
  const baseFontSize = settings.fontSize || 1;
  const dyslexiaMultiplier = settings.dyslexiaFont ? 1.4 : 1;
  const largeTextMultiplier = settings.largeText ? 1.2 : 1;
  const fontSize = `${baseFontSize * dyslexiaMultiplier * largeTextMultiplier * 16}px`;

  const lineHeight = settings.increasedLineHeight
    ? Math.max(settings.lineSpacing || 1.5, 1.8)
    : settings.lineSpacing || 1.5;

  const letterSpacing = settings.extraLetterSpacing ? '0.05em' : 'normal';

  const backgroundColor = settings.highContrast
    ? '#000000'
    : settings.customBackgroundColor || '#ffffff';

  const textColor = settings.highContrast
    ? '#ffff00'
    : settings.customTextColor || '#1e293b';

  return `
    @import url('https://fonts.cdnfonts.com/css/opendyslexic');

    @page {
      size: A4;
      margin: 2cm;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }

    * {
      box-sizing: border-box;
    }

    html {
      font-size: 16px;
    }

    body {
      font-family: ${fontFamily};
      font-size: ${fontSize};
      line-height: ${lineHeight};
      letter-spacing: ${letterSpacing};
      color: ${textColor};
      background-color: ${backgroundColor};
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      ${settings.dyslexiaFont ? 'text-transform: uppercase;' : ''}
    }

    /* Headings */
    h1 {
      font-size: 1.75em;
      margin-bottom: 0.5em;
      color: ${settings.highContrast ? '#ffffff' : '#0f172a'};
      border-bottom: 3px solid ${settings.highContrast ? '#ffff00' : '#3b82f6'};
      padding-bottom: 0.5em;
      page-break-after: avoid;
    }

    h2 {
      font-size: 1.4em;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      color: ${settings.highContrast ? '#00ffff' : '#1e40af'};
      page-break-after: avoid;
    }

    h3 {
      font-size: 1.2em;
      margin-top: 1em;
      margin-bottom: 0.5em;
      color: ${settings.highContrast ? '#00ff00' : '#334155'};
      page-break-after: avoid;
    }

    /* Paragraphs */
    p {
      margin-bottom: 1em;
      max-width: ${settings.dyslexiaFont ? '60ch' : '75ch'};
    }

    /* Lists */
    ul, ol {
      margin: 1em 0;
      padding-left: 2em;
    }

    li {
      margin-bottom: 0.5em;
    }

    li::marker {
      color: ${settings.highContrast ? '#ffff00' : '#3b82f6'};
    }

    /* Cards/Sections */
    .card {
      margin-bottom: 1.5em;
      padding: 1em;
      background: ${settings.highContrast ? '#1a1a1a' : '#f8fafc'};
      border-radius: 8px;
      border-left: 4px solid ${settings.highContrast ? '#ffff00' : '#3b82f6'};
      page-break-inside: avoid;
    }

    .card-title {
      font-weight: 600;
      margin-bottom: 0.5em;
      color: ${settings.highContrast ? '#ffffff' : '#1e293b'};
    }

    /* Flashcards */
    .flashcard {
      display: flex;
      flex-direction: column;
      margin-bottom: 1.5em;
      border: 2px solid ${settings.highContrast ? '#ffff00' : '#e2e8f0'};
      border-radius: 12px;
      overflow: hidden;
      page-break-inside: avoid;
    }

    .flashcard-front {
      padding: 1em;
      background: ${settings.highContrast ? '#1a1a1a' : '#f1f5f9'};
      font-weight: 600;
    }

    .flashcard-back {
      padding: 1em;
      background: ${settings.highContrast ? '#0d0d0d' : '#ffffff'};
      border-top: 1px dashed ${settings.highContrast ? '#666666' : '#cbd5e1'};
    }

    .flashcard-label {
      font-size: 0.75em;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: ${settings.highContrast ? '#00ffff' : '#64748b'};
      margin-bottom: 0.25em;
    }

    /* Quiz */
    .quiz-question {
      margin-bottom: 1.5em;
      padding: 1em;
      background: ${settings.highContrast ? '#1a1a1a' : '#ffffff'};
      border: 2px solid ${settings.highContrast ? '#ffff00' : '#e2e8f0'};
      border-radius: 8px;
      page-break-inside: avoid;
    }

    .quiz-question-number {
      font-weight: 700;
      color: ${settings.highContrast ? '#00ffff' : '#3b82f6'};
      margin-bottom: 0.5em;
    }

    .quiz-options {
      margin-top: 0.75em;
      padding-left: 1em;
    }

    .quiz-option {
      display: flex;
      align-items: flex-start;
      gap: 0.5em;
      margin-bottom: 0.5em;
      padding: 0.5em;
      border-radius: 4px;
    }

    .quiz-option.correct {
      background: ${settings.highContrast ? '#003300' : '#dcfce7'};
      border: 1px solid ${settings.highContrast ? '#00ff00' : '#22c55e'};
    }

    .quiz-option-marker {
      font-weight: 600;
      min-width: 1.5em;
    }

    /* Mindmap */
    .mindmap-node {
      margin-left: 1.5em;
      padding: 0.25em 0;
    }

    .mindmap-node.level-0 {
      margin-left: 0;
      font-weight: 700;
      font-size: 1.2em;
      color: ${settings.highContrast ? '#ffffff' : '#0f172a'};
    }

    .mindmap-node.level-1 {
      color: ${settings.highContrast ? '#00ffff' : '#1e40af'};
      font-weight: 600;
    }

    .mindmap-node.level-2 {
      color: ${settings.highContrast ? '#00ff00' : '#059669'};
    }

    .mindmap-node::before {
      content: '├─ ';
      color: ${settings.highContrast ? '#666666' : '#94a3b8'};
    }

    .mindmap-node.level-0::before {
      content: '';
    }

    /* Timeline */
    .timeline {
      border-left: 3px solid ${settings.highContrast ? '#ffff00' : '#3b82f6'};
      padding-left: 1.5em;
      margin-left: 0.5em;
    }

    .timeline-event {
      position: relative;
      margin-bottom: 1.5em;
      page-break-inside: avoid;
    }

    .timeline-event::before {
      content: '';
      position: absolute;
      left: -1.75em;
      top: 0.25em;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: ${settings.highContrast ? '#ffff00' : '#3b82f6'};
    }

    .timeline-date {
      font-weight: 600;
      color: ${settings.highContrast ? '#00ffff' : '#3b82f6'};
      margin-bottom: 0.25em;
    }

    .timeline-title {
      font-weight: 600;
      margin-bottom: 0.25em;
    }

    /* Summary */
    .summary-section {
      margin-bottom: 1.5em;
      page-break-inside: avoid;
    }

    .summary-key-points {
      background: ${settings.highContrast ? '#1a1a1a' : '#f0f9ff'};
      padding: 1em;
      border-radius: 8px;
      margin-top: 0.5em;
    }

    /* Meta info */
    .meta {
      font-size: 0.875em;
      color: ${settings.highContrast ? '#999999' : '#64748b'};
      margin-bottom: 1.5em;
    }

    /* Footer */
    .footer {
      margin-top: 2em;
      padding-top: 1em;
      border-top: 1px solid ${settings.highContrast ? '#333333' : '#e2e8f0'};
      font-size: 0.75em;
      color: ${settings.highContrast ? '#666666' : '#94a3b8'};
      text-align: center;
    }

    /* Accessibility indicator */
    .a11y-indicator {
      font-size: 0.75em;
      color: ${settings.highContrast ? '#00ffff' : '#6366f1'};
      margin-bottom: 1em;
      padding: 0.5em;
      background: ${settings.highContrast ? '#1a1a1a' : '#f5f3ff'};
      border-radius: 4px;
    }
  `;
}

// ============================================================================
// CONTENT RENDERERS
// ============================================================================

function renderMindmap(nodes: MindmapNode[], parentId: string | null = null, level: number = 0): string {
  const filtered = nodes.filter(n => n.parentId === parentId);
  if (filtered.length === 0) return '';

  let html = '';
  for (const node of filtered) {
    html += `<div class="mindmap-node level-${Math.min(level, 2)}" role="treeitem" aria-level="${level + 1}">
      ${escapeHtml(node.label)}
    </div>`;
    html += renderMindmap(nodes, node.id, level + 1);
  }
  return html;
}

function renderFlashcards(cards: FlashcardItem[]): string {
  return cards
    .map(
      (card, index) => `
    <article class="flashcard" aria-label="Flashcard ${index + 1}">
      <div class="flashcard-front">
        <div class="flashcard-label" aria-hidden="true">Domanda</div>
        ${escapeHtml(card.front)}
      </div>
      <div class="flashcard-back">
        <div class="flashcard-label" aria-hidden="true">Risposta</div>
        ${escapeHtml(card.back)}
      </div>
    </article>
  `
    )
    .join('');
}

function renderSummary(data: SummaryData): string {
  const lengthLabels: Record<string, string> = {
    short: 'Breve',
    medium: 'Medio',
    long: 'Dettagliato',
  };

  let html = '';

  // Show topic as subtitle
  if (data.topic) {
    html += `<h2>${escapeHtml(data.topic)}</h2>`;
  }

  if (data.length) {
    html += `<div class="meta">Tipo: Riassunto ${lengthLabels[data.length] || ''}</div>`;
  }

  for (const section of data.sections || []) {
    html += `<section class="summary-section">
      <h2>${escapeHtml(section.title)}</h2>
      ${section.content ? `<p>${escapeHtml(section.content)}</p>` : ''}
      ${
        section.keyPoints && section.keyPoints.length > 0
          ? `<div class="summary-key-points" role="list" aria-label="Punti chiave">
              <strong>Punti chiave:</strong>
              <ul>
                ${section.keyPoints.map(point => `<li role="listitem">${escapeHtml(point)}</li>`).join('')}
              </ul>
            </div>`
          : ''
      }
    </section>`;
  }

  return html;
}

function renderQuiz(data: QuizData): string {
  const questions = data.questions || [];
  const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];

  return questions
    .map(
      (q, qIndex) => `
    <article class="quiz-question" role="group" aria-labelledby="q${qIndex}">
      <div class="quiz-question-number" id="q${qIndex}">Domanda ${qIndex + 1}</div>
      <p>${escapeHtml(q.question)}</p>
      <div class="quiz-options" role="list">
        ${q.options
          .map(
            (opt, oIndex) => `
          <div class="quiz-option ${oIndex === q.correctIndex ? 'correct' : ''}" role="listitem">
            <span class="quiz-option-marker">${optionLabels[oIndex]}.</span>
            <span>${escapeHtml(opt)}</span>
            ${oIndex === q.correctIndex ? ' <strong>(Corretta)</strong>' : ''}
          </div>
        `
          )
          .join('')}
      </div>
      ${q.explanation ? `<p><em>Spiegazione: ${escapeHtml(q.explanation)}</em></p>` : ''}
    </article>
  `
    )
    .join('');
}

function renderTimeline(data: TimelineData): string {
  const events = data.events || [];

  return `
    <div class="timeline" role="list" aria-label="Linea temporale">
      ${events
        .map(
          event => `
        <article class="timeline-event" role="listitem">
          <div class="timeline-date">${escapeHtml(event.date || '')}</div>
          <div class="timeline-title">${escapeHtml(event.title)}</div>
          ${event.description ? `<p>${escapeHtml(event.description)}</p>` : ''}
        </article>
      `
        )
        .join('')}
    </div>
  `;
}

function renderDiagram(data: DiagramPrintData): string {
  // For diagrams, render as mermaid code in preformatted block
  // since visual diagrams don't print well and need browser rendering
  const diagramTypeLabels: Record<string, string> = {
    flowchart: 'Diagramma di flusso',
    sequence: 'Diagramma di sequenza',
    class: 'Diagramma delle classi',
    er: 'Diagramma entità-relazioni',
  };

  return `
    <div class="card">
      <div class="card-title">${diagramTypeLabels[data.diagramType || 'flowchart'] || 'Diagramma'}: ${escapeHtml(data.topic)}</div>
      ${
        data.mermaidCode
          ? `<pre style="white-space: pre-wrap; word-wrap: break-word; font-family: monospace; font-size: 0.875em; padding: 1em; background: #f1f5f9; border-radius: 4px; overflow-x: auto;">${escapeHtml(data.mermaidCode)}</pre>
             <p style="font-size: 0.875em; color: #64748b; margin-top: 0.5em;"><em>Nota: Questo è il codice Mermaid del diagramma. Per visualizzarlo graficamente, apri il materiale nell'app.</em></p>`
          : '<p>Nessun codice diagramma disponibile.</p>'
      }
    </div>
  `;
}

function renderGenericContent(content: unknown): string {
  if (typeof content === 'string') {
    return `<div class="card"><p>${escapeHtml(content)}</p></div>`;
  }

  if (Array.isArray(content)) {
    return `<ul>${content.map(item => `<li>${escapeHtml(String(item))}</li>`).join('')}</ul>`;
  }

  if (typeof content === 'object' && content !== null) {
    return `<pre style="white-space: pre-wrap; word-wrap: break-word;">${escapeHtml(JSON.stringify(content, null, 2))}</pre>`;
  }

  return `<p>${escapeHtml(String(content))}</p>`;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

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

  // Render content based on type
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

  // Build accessibility indicator
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

/**
 * Print content with accessibility settings
 */
export async function printAccessible(options: PrintOptions): Promise<void> {
  const html = generateAccessibleHtml(options);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    logger.error('[AccessiblePrint] Could not open print window');
    throw new Error('Impossibile aprire la finestra di stampa. Controlla le impostazioni popup del browser.');
  }

  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for fonts and content to load
  await new Promise<void>((resolve) => {
    printWindow.onload = () => {
      // Additional delay for web fonts
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

/**
 * Download content as HTML file (alternative to print)
 */
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

// ============================================================================
// HELPERS
// ============================================================================

function escapeHtml(text: string): string {
  const div = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (div) {
    div.textContent = text;
    return div.innerHTML;
  }
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 100);
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  generateAccessibleHtml,
  getAccessibilityStyles,
};
