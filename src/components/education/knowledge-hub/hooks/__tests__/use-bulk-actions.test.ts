/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBulkActions } from '../use-bulk-actions';

describe('useBulkActions', () => {
  describe('selection state', () => {
    it('starts with empty selection', () => {
      const { result } = renderHook(() => useBulkActions());

      expect(result.current.selectedIds.size).toBe(0);
      expect(result.current.selectedCount).toBe(0);
      expect(result.current.hasSelection).toBe(false);
    });

    it('toggles selection on', () => {
      const { result } = renderHook(() => useBulkActions());

      act(() => {
        result.current.toggleSelection('item-1');
      });

      expect(result.current.selectedIds.has('item-1')).toBe(true);
      expect(result.current.selectedCount).toBe(1);
      expect(result.current.hasSelection).toBe(true);
    });

    it('toggles selection off', () => {
      const { result } = renderHook(() => useBulkActions());

      act(() => {
        result.current.toggleSelection('item-1');
      });

      act(() => {
        result.current.toggleSelection('item-1');
      });

      expect(result.current.selectedIds.has('item-1')).toBe(false);
      expect(result.current.selectedCount).toBe(0);
    });

    it('selects a single item', () => {
      const { result } = renderHook(() => useBulkActions());

      act(() => {
        result.current.select('item-1');
      });

      expect(result.current.isSelected('item-1')).toBe(true);
    });

    it('does not duplicate selection', () => {
      const { result } = renderHook(() => useBulkActions());

      act(() => {
        result.current.select('item-1');
        result.current.select('item-1');
      });

      expect(result.current.selectedCount).toBe(1);
    });

    it('deselects an item', () => {
      const { result } = renderHook(() => useBulkActions());

      act(() => {
        result.current.select('item-1');
      });

      act(() => {
        result.current.deselect('item-1');
      });

      expect(result.current.isSelected('item-1')).toBe(false);
    });

    it('handles deselect of non-selected item', () => {
      const { result } = renderHook(() => useBulkActions());

      act(() => {
        result.current.deselect('item-1');
      });

      expect(result.current.selectedCount).toBe(0);
    });

    it('selects multiple items', () => {
      const { result } = renderHook(() => useBulkActions());

      act(() => {
        result.current.selectMultiple(['item-1', 'item-2', 'item-3']);
      });

      expect(result.current.selectedCount).toBe(3);
      expect(result.current.isSelected('item-1')).toBe(true);
      expect(result.current.isSelected('item-2')).toBe(true);
      expect(result.current.isSelected('item-3')).toBe(true);
    });

    it('adds to existing selection with selectMultiple', () => {
      const { result } = renderHook(() => useBulkActions());

      act(() => {
        result.current.select('item-1');
      });

      act(() => {
        result.current.selectMultiple(['item-2', 'item-3']);
      });

      expect(result.current.selectedCount).toBe(3);
    });

    it('selects all items (replaces selection)', () => {
      const { result } = renderHook(() => useBulkActions());

      act(() => {
        result.current.select('item-1');
      });

      act(() => {
        result.current.selectAll(['item-2', 'item-3']);
      });

      expect(result.current.selectedCount).toBe(2);
      expect(result.current.isSelected('item-1')).toBe(false);
      expect(result.current.isSelected('item-2')).toBe(true);
      expect(result.current.isSelected('item-3')).toBe(true);
    });

    it('clears selection', () => {
      const { result } = renderHook(() => useBulkActions());

      act(() => {
        result.current.selectMultiple(['item-1', 'item-2', 'item-3']);
      });

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedCount).toBe(0);
      expect(result.current.hasSelection).toBe(false);
    });
  });

  describe('selection callbacks', () => {
    it('calls onSelectionChange when selection changes', () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useBulkActions({ onSelectionChange })
      );

      act(() => {
        result.current.select('item-1');
      });

      expect(onSelectionChange).toHaveBeenCalledWith(['item-1']);
    });

    it('calls onSelectionChange with all selected items', () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useBulkActions({ onSelectionChange })
      );

      act(() => {
        result.current.selectMultiple(['item-1', 'item-2']);
      });

      expect(onSelectionChange).toHaveBeenCalledWith(
        expect.arrayContaining(['item-1', 'item-2'])
      );
    });
  });

  describe('bulk actions', () => {
    it('moves items to collection', async () => {
      const onMove = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useBulkActions({ onMove }));

      act(() => {
        result.current.selectMultiple(['item-1', 'item-2']);
      });

      await act(async () => {
        await result.current.moveToCollection('collection-1');
      });

      expect(onMove).toHaveBeenCalledWith(['item-1', 'item-2'], 'collection-1');
      expect(result.current.selectedCount).toBe(0); // Clears after action
    });

    it('adds tags to items', async () => {
      const onAddTags = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useBulkActions({ onAddTags }));

      act(() => {
        result.current.selectMultiple(['item-1', 'item-2']);
      });

      await act(async () => {
        await result.current.addTags(['tag-1', 'tag-2']);
      });

      expect(onAddTags).toHaveBeenCalledWith(
        ['item-1', 'item-2'],
        ['tag-1', 'tag-2']
      );
    });

    it('archives items', async () => {
      const onArchive = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useBulkActions({ onArchive }));

      act(() => {
        result.current.selectMultiple(['item-1', 'item-2']);
      });

      await act(async () => {
        await result.current.archive();
      });

      expect(onArchive).toHaveBeenCalledWith(['item-1', 'item-2']);
    });

    it('restores items', async () => {
      const onRestore = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useBulkActions({ onRestore }));

      act(() => {
        result.current.selectMultiple(['item-1', 'item-2']);
      });

      await act(async () => {
        await result.current.restore();
      });

      expect(onRestore).toHaveBeenCalledWith(['item-1', 'item-2']);
    });

    it('deletes items', async () => {
      const onDelete = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useBulkActions({ onDelete }));

      act(() => {
        result.current.selectMultiple(['item-1', 'item-2']);
      });

      await act(async () => {
        await result.current.deleteMaterials();
      });

      expect(onDelete).toHaveBeenCalledWith(['item-1', 'item-2']);
    });

    it('duplicates items', async () => {
      const onDuplicate = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useBulkActions({ onDuplicate }));

      act(() => {
        result.current.selectMultiple(['item-1', 'item-2']);
      });

      await act(async () => {
        await result.current.duplicate();
      });

      expect(onDuplicate).toHaveBeenCalledWith(['item-1', 'item-2']);
    });

    it('does nothing if callback not provided', async () => {
      const { result } = renderHook(() => useBulkActions());

      act(() => {
        result.current.select('item-1');
      });

      await act(async () => {
        await result.current.moveToCollection('collection-1');
      });

      expect(result.current.selectedCount).toBe(1); // Not cleared
    });
  });

  describe('loading state', () => {
    it('sets loading during action', async () => {
      let resolvePromise: () => void;
      const onArchive = vi.fn().mockImplementation(
        () => new Promise<void>((resolve) => { resolvePromise = resolve; })
      );
      const { result } = renderHook(() => useBulkActions({ onArchive }));

      act(() => {
        result.current.select('item-1');
      });

      let actionPromise: Promise<void>;
      act(() => {
        actionPromise = result.current.archive();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!();
        await actionPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('tracks last action', async () => {
      const onArchive = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useBulkActions({ onArchive }));

      act(() => {
        result.current.select('item-1');
      });

      await act(async () => {
        await result.current.archive();
      });

      expect(result.current.lastAction).toBe('archive');
    });
  });

  describe('error handling', () => {
    it('sets error on action failure', async () => {
      const error = new Error('Failed to archive');
      const onArchive = vi.fn().mockRejectedValue(error);
      const { result } = renderHook(() => useBulkActions({ onArchive }));

      act(() => {
        result.current.select('item-1');
      });

      await act(async () => {
        try {
          await result.current.archive();
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.selectedCount).toBe(1); // Not cleared on error
    });

    it('wraps non-Error in Error', async () => {
      const onArchive = vi.fn().mockRejectedValue('string error');
      const { result } = renderHook(() => useBulkActions({ onArchive }));

      act(() => {
        result.current.select('item-1');
      });

      await act(async () => {
        try {
          await result.current.archive();
        } catch {
          // Expected
        }
      });

      expect(result.current.error?.message).toBe('Failed to archive');
    });

    it('clears error on next action', async () => {
      const onArchive = vi.fn()
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce(undefined);
      const { result } = renderHook(() => useBulkActions({ onArchive }));

      act(() => {
        result.current.select('item-1');
      });

      await act(async () => {
        try {
          await result.current.archive();
        } catch {
          // Expected
        }
      });

      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.select('item-2');
      });

      await act(async () => {
        await result.current.archive();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
