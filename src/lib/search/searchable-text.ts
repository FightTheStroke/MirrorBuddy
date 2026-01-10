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
import { generateSearchableText } from './text-generators';

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

// Re-export generator
export { generateSearchableText };

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
