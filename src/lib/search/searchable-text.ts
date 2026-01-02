/**
 * Searchable Text Utilities
 *
 * Generates searchable text from material content and provides
 * fuzzy search functionality using Fuse.js.
 *
 * ADR: 0022-knowledge-hub-architecture.md
 */

import Fuse, { type IFuseOptions, type FuseResult } from 'fuse.js';
import type { ToolType } from '@/types/tools';

// ============================================================================
// TYPES
// ============================================================================

export interface SearchableMaterial {
  id: string;
  title: string;
  toolType: ToolType;
  subject?: string | null;
  maestroId?: string | null;
  searchableText?: string | null;
  createdAt: Date;
}

// Re-export FuseResult for convenience
export type { FuseResult } from 'fuse.js';

// ============================================================================
// SEARCHABLE TEXT GENERATION
// ============================================================================

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
    // If parsing fails, return empty string
    return '';
  }
}

function extractMindmapText(data: unknown): string {
  const parts: string[] = [];
  const obj = data as Record<string, unknown>;

  if (obj.title) parts.push(String(obj.title));
  if (obj.topic) parts.push(String(obj.topic));

  // Extract node labels
  if (Array.isArray(obj.nodes)) {
    for (const node of obj.nodes) {
      if (node && typeof node === 'object' && 'label' in node) {
        parts.push(String(node.label));
      }
    }
  }

  // Extract markdown content
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
 * Uses O(n) character iteration instead of regex backtracking
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

  // Extract text from HTML using safe non-regex stripping
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
    // Skip non-text fields
    if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;

    if (typeof value === 'string') {
      parts.push(value);
    }
  }

  return parts.join(' ').trim();
}

// ============================================================================
// FUSE.JS SEARCH
// ============================================================================

const DEFAULT_FUSE_OPTIONS: IFuseOptions<SearchableMaterial> = {
  keys: [
    { name: 'title', weight: 2 },
    { name: 'searchableText', weight: 1 },
    { name: 'subject', weight: 0.5 },
    { name: 'maestroId', weight: 0.3 },
  ],
  threshold: 0.3,
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 2,
  ignoreLocation: true,
};

/**
 * Create a Fuse.js search instance for materials.
 */
export function createMaterialSearch(
  materials: SearchableMaterial[],
  options?: Partial<IFuseOptions<SearchableMaterial>>
): Fuse<SearchableMaterial> {
  return new Fuse(materials, { ...DEFAULT_FUSE_OPTIONS, ...options });
}

/**
 * Search materials using Fuse.js fuzzy search.
 */
export function searchMaterials(
  fuse: Fuse<SearchableMaterial>,
  query: string,
  limit = 20
): FuseResult<SearchableMaterial>[] {
  if (!query.trim()) return [];

  return fuse.search(query, { limit });
}

/**
 * Highlight matched text in a string.
 * Returns an array of segments with isMatch flag.
 */
export function highlightMatches(
  text: string,
  indices: readonly [number, number][]
): Array<{ text: string; isMatch: boolean }> {
  if (!indices || indices.length === 0) {
    return [{ text, isMatch: false }];
  }

  const segments: Array<{ text: string; isMatch: boolean }> = [];
  let lastEnd = 0;

  for (const [start, end] of indices) {
    if (start > lastEnd) {
      segments.push({ text: text.slice(lastEnd, start), isMatch: false });
    }
    segments.push({ text: text.slice(start, end + 1), isMatch: true });
    lastEnd = end + 1;
  }

  if (lastEnd < text.length) {
    segments.push({ text: text.slice(lastEnd), isMatch: false });
  }

  return segments;
}
