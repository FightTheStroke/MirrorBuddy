import type {
  MindmapNode,
  FlashcardItem,
  SummaryData,
  QuizData,
  TimelineData,
} from '@/types/tools';
import type { DiagramPrintData } from './types';
import { escapeHtml } from './helpers';

export function renderMindmap(nodes: MindmapNode[], parentId: string | null = null, level: number = 0): string {
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

export function renderFlashcards(cards: FlashcardItem[]): string {
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

export function renderSummary(data: SummaryData): string {
  const lengthLabels: Record<string, string> = {
    short: 'Breve',
    medium: 'Medio',
    long: 'Dettagliato',
  };

  let html = '';

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

export function renderQuiz(data: QuizData): string {
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

export function renderTimeline(data: TimelineData): string {
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

export function renderDiagram(data: DiagramPrintData): string {
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

export function renderGenericContent(content: unknown): string {
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

