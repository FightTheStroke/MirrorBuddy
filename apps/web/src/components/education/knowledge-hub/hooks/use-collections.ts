'use client';

/**
 * Knowledge Hub Collections Hook
 *
 * Manages collections/folders for organizing materials.
 * Provides CRUD operations and hierarchy management.
 */

import { useState, useCallback, useMemo } from 'react';
import type { Collection } from '../components/sidebar-navigation';
import { buildCollectionTree } from './collection-tree-builder';
import type { CollectionData } from './collection-types';

// Re-export for backward compatibility
export type { CollectionData } from './collection-types';

export interface UseCollectionsOptions {
  /** Initial collections data */
  initialCollections?: CollectionData[];
  /** Callback when collection is created */
  onCreateCollection?: (collection: CollectionData) => Promise<void>;
  /** Callback when collection is updated */
  onUpdateCollection?: (id: string, updates: Partial<CollectionData>) => Promise<void>;
  /** Callback when collection is deleted */
  onDeleteCollection?: (id: string) => Promise<void>;
  /** Callback when materials are moved to collection */
  onMoveToCollection?: (materialIds: string[], collectionId: string | null) => Promise<void>;
}

export interface UseCollectionsReturn {
  /** All collections as flat list */
  collections: CollectionData[];
  /** Collections as nested tree structure */
  collectionTree: Collection[];
  /** Currently selected collection ID */
  selectedCollectionId: string | null;
  /** Select a collection */
  selectCollection: (id: string | null) => void;
  /** Create a new collection */
  createCollection: (name: string, parentId?: string | null) => Promise<void>;
  /** Update a collection */
  updateCollection: (id: string, updates: Partial<CollectionData>) => Promise<void>;
  /** Delete a collection */
  deleteCollection: (id: string) => Promise<void>;
  /** Move materials to a collection */
  moveToCollection: (materialIds: string[], collectionId: string | null) => Promise<void>;
  /** Get collection by ID */
  getCollection: (id: string) => CollectionData | undefined;
  /** Get breadcrumb path for a collection */
  getBreadcrumbs: (id: string) => CollectionData[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
}

/**
 * Hook for managing material collections.
 */
export function useCollections(
  options: UseCollectionsOptions = {}
): UseCollectionsReturn {
  const {
    initialCollections = [],
    onCreateCollection,
    onUpdateCollection,
    onDeleteCollection,
    onMoveToCollection,
  } = options;

  const [collections, setCollections] = useState<CollectionData[]>(initialCollections);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Build tree structure
  const collectionTree = useMemo(() => {
    return buildCollectionTree(collections);
  }, [collections]);

  // Select collection
  const selectCollection = useCallback((id: string | null) => {
    setSelectedCollectionId(id);
  }, []);

  // Get collection by ID
  const getCollection = useCallback(
    (id: string): CollectionData | undefined => {
      return collections.find((c) => c.id === id);
    },
    [collections]
  );

  // Get breadcrumb path
  const getBreadcrumbs = useCallback(
    (id: string): CollectionData[] => {
      const breadcrumbs: CollectionData[] = [];
      let current = getCollection(id);

      while (current) {
        breadcrumbs.unshift(current);
        if (current.parentId) {
          current = getCollection(current.parentId);
        } else {
          break;
        }
      }

      return breadcrumbs;
    },
    [getCollection]
  );

  // Create collection
  const createCollection = useCallback(
    async (name: string, parentId?: string | null) => {
      setIsLoading(true);
      setError(null);

      try {
        const newCollection: CollectionData = {
          id: `col_${Date.now()}`,
          name,
          parentId: parentId ?? null,
          materialCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        if (onCreateCollection) {
          await onCreateCollection(newCollection);
        }

        setCollections((prev) => [...prev, newCollection]);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to create collection'));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [onCreateCollection]
  );

  // Update collection
  const updateCollection = useCallback(
    async (id: string, updates: Partial<CollectionData>) => {
      setIsLoading(true);
      setError(null);

      try {
        if (onUpdateCollection) {
          await onUpdateCollection(id, updates);
        }

        setCollections((prev) =>
          prev.map((c) =>
            c.id === id
              ? { ...c, ...updates, updatedAt: new Date() }
              : c
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update collection'));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [onUpdateCollection]
  );

  // Delete collection
  const deleteCollection = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setError(null);

      try {
        if (onDeleteCollection) {
          await onDeleteCollection(id);
        }

        // Remove collection and reassign children to parent
        setCollections((prev) => {
          const toDelete = prev.find((c) => c.id === id);
          if (!toDelete) return prev;

          return prev
            .filter((c) => c.id !== id)
            .map((c) =>
              c.parentId === id ? { ...c, parentId: toDelete.parentId } : c
            );
        });

        // Clear selection if deleted collection was selected
        if (selectedCollectionId === id) {
          setSelectedCollectionId(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to delete collection'));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [onDeleteCollection, selectedCollectionId]
  );

  // Move materials to collection
  const moveToCollection = useCallback(
    async (materialIds: string[], collectionId: string | null) => {
      setIsLoading(true);
      setError(null);

      try {
        if (onMoveToCollection) {
          await onMoveToCollection(materialIds, collectionId);
        }

        // Update material counts (this would be handled by the API in production)
        // For now, this is a no-op since we don't have material data here
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to move materials'));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [onMoveToCollection]
  );

  return {
    collections,
    collectionTree,
    selectedCollectionId,
    selectCollection,
    createCollection,
    updateCollection,
    deleteCollection,
    moveToCollection,
    getCollection,
    getBreadcrumbs,
    isLoading,
    error,
  };
}
