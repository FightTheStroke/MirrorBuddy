/**
 * Collection tree building utility
 * Converts flat collections list to nested tree structure
 */

import type { Collection } from '../components/sidebar-navigation';
import type { CollectionData } from './use-collections';

/**
 * Build nested tree structure from flat collections list.
 */
export function buildCollectionTree(collections: CollectionData[]): Collection[] {
  const collectionsMap = new Map<string, Collection>();
  const rootCollections: Collection[] = [];

  // First pass: create all collection nodes
  for (const col of collections) {
    collectionsMap.set(col.id, {
      id: col.id,
      name: col.name,
      icon: col.icon,
      color: col.color,
      count: col.materialCount,
      parentId: col.parentId,
      children: [],
    });
  }

  // Second pass: build tree structure
  for (const col of collections) {
    const node = collectionsMap.get(col.id)!;
    if (col.parentId && collectionsMap.has(col.parentId)) {
      const parent = collectionsMap.get(col.parentId)!;
      parent.children = parent.children || [];
      parent.children.push(node);
    } else {
      rootCollections.push(node);
    }
  }

  // Sort by name
  const sortByName = (a: Collection, b: Collection) => a.name.localeCompare(b.name);
  rootCollections.sort(sortByName);
  for (const col of collectionsMap.values()) {
    if (col.children && col.children.length > 0) {
      col.children.sort(sortByName);
    }
  }

  return rootCollections;
}
