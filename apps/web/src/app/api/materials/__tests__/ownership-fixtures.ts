/**
 * Synthetic two-user fixture for the materials ownership regressions.
 * No real account, production identifier or production database is used.
 */

import type { DbState, MaterialRow } from './prisma-boundary-mock';

export const ALICE = 'user-alice';
export const MALLORY = 'user-mallory';

function materialFor(owner: string, slug: string, title: string): MaterialRow {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: `mat-${slug}`,
    userId: owner,
    toolId: `tool-${slug}`,
    toolType: 'mindmap',
    title,
    content: JSON.stringify({ nodes: [slug] }),
    mindmapRevision: null,
    mindmapSourceSession: null,
    mindmapReceipts: [],
    searchableText: title,
    preview: null,
    status: 'active',
    userRating: null,
    isBookmarked: false,
    collectionId: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Two synthetic users, each owning one material, one collection and one tag. */
export function seedState(): DbState {
  return {
    materials: [
      materialFor(ALICE, 'alice-1', 'Alice study map'),
      materialFor(MALLORY, 'mallory-1', 'Mallory study map'),
    ],
    collections: [
      { id: 'col-alice', userId: ALICE, name: 'Alice folder', color: null },
      {
        id: 'col-mallory',
        userId: MALLORY,
        name: 'Mallory folder',
        color: null,
      },
    ],
    tags: [
      { id: 'tag-alice', userId: ALICE, name: 'Alice tag', color: null },
      { id: 'tag-mallory', userId: MALLORY, name: 'Mallory tag', color: null },
    ],
    materialTags: [{ id: 'mt-alice-1', materialId: 'mat-alice-1', tagId: 'tag-alice' }],
  };
}
