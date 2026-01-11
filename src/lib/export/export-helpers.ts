/**
 * Material Export Helper Functions
 * Utilities for formatting and sanitizing exported content
 */

import type { ToolType } from '@/types/tools';

export function safeJsonParse(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 100);
}

export function formatToolType(type: ToolType): string {
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

export function formatDate(date: Date): string {
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateCompact(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatContentAsMarkdown(type: ToolType, content: unknown): string {
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
