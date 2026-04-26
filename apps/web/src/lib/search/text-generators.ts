/**
 * Searchable Text Generators
 * Extracts and generates searchable text from various material types
 */

import type { ToolType } from '@/types/tools';

/**
 * Generate searchable text from material content.
 * Extracts relevant text based on tool type.
 */
export function generateSearchableText(
  toolType: ToolType,
  content: unknown
): string {
  if (!content) return '';

  try {
    const data = typeof content === 'string' ? JSON.parse(content) : content;

    switch (toolType) {
      case 'mindmap':
        return extractMindmapText(data);
      case 'quiz':
        return extractQuizText(data);
      case 'flashcard':
        return extractFlashcardText(data);
      case 'summary':
        return extractSummaryText(data);
      case 'demo':
        return extractDemoText(data);
      case 'homework':
        return extractHomeworkText(data);
      default:
        return extractGenericText(data);
    }
  } catch {
    return '';
  }
}

function extractMindmapText(data: unknown): string {
  const parts: string[] = [];
  const obj = data as Record<string, unknown>;

  if (obj.title) parts.push(String(obj.title));
  if (obj.topic) parts.push(String(obj.topic));

  if (Array.isArray(obj.nodes)) {
    for (const node of obj.nodes) {
      if (node && typeof node === 'object' && 'label' in node) {
        parts.push(String(node.label));
      }
    }
  }

  if (obj.markdown && typeof obj.markdown === 'string') {
    parts.push(obj.markdown);
  }

  return parts.join(' ').trim();
}

function extractQuizText(data: unknown): string {
  const parts: string[] = [];
  const obj = data as Record<string, unknown>;

  if (obj.topic) parts.push(String(obj.topic));

  if (Array.isArray(obj.questions)) {
    for (const q of obj.questions) {
      if (q && typeof q === 'object') {
        if ('question' in q) parts.push(String(q.question));
        if ('options' in q && Array.isArray(q.options)) {
          parts.push(...q.options.map(String));
        }
        if ('explanation' in q) parts.push(String(q.explanation));
      }
    }
  }

  return parts.join(' ').trim();
}

function extractFlashcardText(data: unknown): string {
  const parts: string[] = [];
  const obj = data as Record<string, unknown>;

  if (obj.topic) parts.push(String(obj.topic));

  if (Array.isArray(obj.cards)) {
    for (const card of obj.cards) {
      if (card && typeof card === 'object') {
        if ('front' in card) parts.push(String(card.front));
        if ('back' in card) parts.push(String(card.back));
        if ('hint' in card) parts.push(String(card.hint));
      }
    }
  }

  return parts.join(' ').trim();
}

function extractSummaryText(data: unknown): string {
  const obj = data as Record<string, unknown>;

  if (obj.text && typeof obj.text === 'string') {
    return obj.text;
  }
  if (obj.content && typeof obj.content === 'string') {
    return obj.content;
  }
  if (obj.summary && typeof obj.summary === 'string') {
    return obj.summary;
  }

  return extractGenericText(data);
}

/**
 * Strip HTML tags safely without regex (prevents ReDoS)
 */
function stripHtmlTags(html: string): string {
  let result = '';
  let inTag = false;
  for (const char of html) {
    if (char === '<') {
      inTag = true;
    } else if (char === '>') {
      inTag = false;
      result += ' ';
    } else if (!inTag) {
      result += char;
    }
  }
  return result;
}

function extractDemoText(data: unknown): string {
  const parts: string[] = [];
  const obj = data as Record<string, unknown>;

  if (obj.title) parts.push(String(obj.title));
  if (obj.description) parts.push(String(obj.description));

  if (obj.html && typeof obj.html === 'string') {
    parts.push(stripHtmlTags(obj.html));
  }

  return parts.join(' ').trim();
}

function extractHomeworkText(data: unknown): string {
  const parts: string[] = [];
  const obj = data as Record<string, unknown>;

  if (obj.assignment) parts.push(String(obj.assignment));

  if (Array.isArray(obj.steps)) {
    for (const step of obj.steps) {
      if (step && typeof step === 'object' && 'text' in step) {
        parts.push(String(step.text));
      }
    }
  }

  return parts.join(' ').trim();
}

function extractGenericText(data: unknown): string {
  if (typeof data === 'string') return data;
  if (typeof data !== 'object' || data === null) return '';

  const parts: string[] = [];
  const obj = data as Record<string, unknown>;

  for (const [key, value] of Object.entries(obj)) {
    if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;

    if (typeof value === 'string') {
      parts.push(value);
    }
  }

  return parts.join(' ').trim();
}
