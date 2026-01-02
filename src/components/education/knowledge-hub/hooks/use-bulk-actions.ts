'use client';

/**
 * Knowledge Hub Bulk Actions Hook
 *
 * Manages multi-select and bulk operations on materials.
 * Provides selection state and batch action handlers.
 */

import { useState, useCallback, useMemo } from 'react';

export interface UseBulkActionsOptions {
  /** Callback when materials are moved */
  onMove?: (materialIds: string[], collectionId: string | null) => Promise<void>;
  /** Callback when tags are added */
  onAddTags?: (materialIds: string[], tagIds: string[]) => Promise<void>;
  /** Callback when materials are archived */
  onArchive?: (materialIds: string[]) => Promise<void>;
  /** Callback when materials are restored */
  onRestore?: (materialIds: string[]) => Promise<void>;
  /** Callback when materials are deleted */
  onDelete?: (materialIds: string[]) => Promise<void>;
  /** Callback when materials are duplicated */
  onDuplicate?: (materialIds: string[]) => Promise<void>;
  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: string[]) => void;
}

export interface UseBulkActionsReturn {
  /** Set of selected material IDs */
  selectedIds: Set<string>;
  /** Number of selected materials */
  selectedCount: number;
  /** Whether any materials are selected */
  hasSelection: boolean;
  /** Toggle selection for a material */
  toggleSelection: (id: string) => void;
  /** Select a material */
  select: (id: string) => void;
  /** Deselect a material */
  deselect: (id: string) => void;
  /** Select multiple materials */
  selectMultiple: (ids: string[]) => void;
  /** Select all materials in a list */
  selectAll: (ids: string[]) => void;
  /** Clear all selections */
  clearSelection: () => void;
  /** Check if a material is selected */
  isSelected: (id: string) => boolean;
  /** Move selected materials to collection */
  moveToCollection: (collectionId: string | null) => Promise<void>;
  /** Add tags to selected materials */
  addTags: (tagIds: string[]) => Promise<void>;
  /** Archive selected materials */
  archive: () => Promise<void>;
  /** Restore selected materials */
  restore: () => Promise<void>;
  /** Delete selected materials */
  deleteMaterials: () => Promise<void>;
  /** Duplicate selected materials */
  duplicate: () => Promise<void>;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Last action performed */
  lastAction: string | null;
}

/**
 * Hook for managing bulk selection and actions on materials.
 */
export function useBulkActions(
  options: UseBulkActionsOptions = {}
): UseBulkActionsReturn {
  const {
    onMove,
    onAddTags,
    onArchive,
    onRestore,
    onDelete,
    onDuplicate,
    onSelectionChange,
  } = options;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const selectedCount = selectedIds.size;
  const hasSelection = selectedCount > 0;

  // Update selection and notify
  const updateSelection = useCallback(
    (newSelection: Set<string>) => {
      setSelectedIds(newSelection);
      onSelectionChange?.(Array.from(newSelection));
    },
    [onSelectionChange]
  );

  // Toggle selection
  const toggleSelection = useCallback(
    (id: string) => {
      const newSelection = new Set(selectedIds);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      updateSelection(newSelection);
    },
    [selectedIds, updateSelection]
  );

  // Select
  const select = useCallback(
    (id: string) => {
      if (!selectedIds.has(id)) {
        const newSelection = new Set(selectedIds);
        newSelection.add(id);
        updateSelection(newSelection);
      }
    },
    [selectedIds, updateSelection]
  );

  // Deselect
  const deselect = useCallback(
    (id: string) => {
      if (selectedIds.has(id)) {
        const newSelection = new Set(selectedIds);
        newSelection.delete(id);
        updateSelection(newSelection);
      }
    },
    [selectedIds, updateSelection]
  );

  // Select multiple
  const selectMultiple = useCallback(
    (ids: string[]) => {
      const newSelection = new Set(selectedIds);
      for (const id of ids) {
        newSelection.add(id);
      }
      updateSelection(newSelection);
    },
    [selectedIds, updateSelection]
  );

  // Select all
  const selectAll = useCallback(
    (ids: string[]) => {
      updateSelection(new Set(ids));
    },
    [updateSelection]
  );

  // Clear selection
  const clearSelection = useCallback(() => {
    updateSelection(new Set());
  }, [updateSelection]);

  // Check if selected
  const isSelected = useCallback(
    (id: string): boolean => {
      return selectedIds.has(id);
    },
    [selectedIds]
  );

  // Execute bulk action with error handling
  const executeAction = useCallback(
    async (actionName: string, action: () => Promise<void>) => {
      setIsLoading(true);
      setError(null);
      setLastAction(actionName);

      try {
        await action();
        clearSelection();
      } catch (err) {
        setError(err instanceof Error ? err : new Error(`Failed to ${actionName}`));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearSelection]
  );

  // Move to collection
  const moveToCollection = useCallback(
    async (collectionId: string | null) => {
      if (!onMove) return;
      await executeAction('move', () => onMove(Array.from(selectedIds), collectionId));
    },
    [onMove, selectedIds, executeAction]
  );

  // Add tags
  const addTags = useCallback(
    async (tagIds: string[]) => {
      if (!onAddTags) return;
      await executeAction('add tags', () => onAddTags(Array.from(selectedIds), tagIds));
    },
    [onAddTags, selectedIds, executeAction]
  );

  // Archive
  const archive = useCallback(async () => {
    if (!onArchive) return;
    await executeAction('archive', () => onArchive(Array.from(selectedIds)));
  }, [onArchive, selectedIds, executeAction]);

  // Restore
  const restore = useCallback(async () => {
    if (!onRestore) return;
    await executeAction('restore', () => onRestore(Array.from(selectedIds)));
  }, [onRestore, selectedIds, executeAction]);

  // Delete
  const deleteMaterials = useCallback(async () => {
    if (!onDelete) return;
    await executeAction('delete', () => onDelete(Array.from(selectedIds)));
  }, [onDelete, selectedIds, executeAction]);

  // Duplicate
  const duplicate = useCallback(async () => {
    if (!onDuplicate) return;
    await executeAction('duplicate', () => onDuplicate(Array.from(selectedIds)));
  }, [onDuplicate, selectedIds, executeAction]);

  return {
    selectedIds,
    selectedCount,
    hasSelection,
    toggleSelection,
    select,
    deselect,
    selectMultiple,
    selectAll,
    clearSelection,
    isSelected,
    moveToCollection,
    addTags,
    archive,
    restore,
    deleteMaterials,
    duplicate,
    isLoading,
    error,
    lastAction,
  };
}
