/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCollections, type CollectionData } from '../use-collections';

const createMockCollection = (
  overrides: Partial<CollectionData> = {}
): CollectionData => ({
  id: `col-${Date.now()}-${Math.random()}`,
  name: 'Test Collection',
  materialCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('useCollections', () => {
  describe('initial state', () => {
    it('starts with empty collections', () => {
      const { result } = renderHook(() => useCollections());

      expect(result.current.collections).toEqual([]);
      expect(result.current.collectionTree).toEqual([]);
      expect(result.current.selectedCollectionId).toBeNull();
    });

    it('accepts initial collections', () => {
      const initialCollections = [
        createMockCollection({ id: 'col-1', name: 'Collection 1' }),
        createMockCollection({ id: 'col-2', name: 'Collection 2' }),
      ];

      const { result } = renderHook(() =>
        useCollections({ initialCollections })
      );

      expect(result.current.collections).toHaveLength(2);
    });
  });

  describe('tree building', () => {
    it('builds flat tree for root collections', () => {
      const initialCollections = [
        createMockCollection({ id: 'col-1', name: 'A Collection' }),
        createMockCollection({ id: 'col-2', name: 'B Collection' }),
      ];

      const { result } = renderHook(() =>
        useCollections({ initialCollections })
      );

      expect(result.current.collectionTree).toHaveLength(2);
      expect(result.current.collectionTree[0].name).toBe('A Collection');
      expect(result.current.collectionTree[1].name).toBe('B Collection');
    });

    it('builds nested tree with parent-child relationships', () => {
      const initialCollections = [
        createMockCollection({ id: 'parent', name: 'Parent' }),
        createMockCollection({ id: 'child-1', name: 'Child 1', parentId: 'parent' }),
        createMockCollection({ id: 'child-2', name: 'Child 2', parentId: 'parent' }),
      ];

      const { result } = renderHook(() =>
        useCollections({ initialCollections })
      );

      expect(result.current.collectionTree).toHaveLength(1);
      expect(result.current.collectionTree[0].id).toBe('parent');
      expect(result.current.collectionTree[0].children).toHaveLength(2);
    });

    it('sorts collections by name', () => {
      const initialCollections = [
        createMockCollection({ id: 'col-c', name: 'Charlie' }),
        createMockCollection({ id: 'col-a', name: 'Alpha' }),
        createMockCollection({ id: 'col-b', name: 'Bravo' }),
      ];

      const { result } = renderHook(() =>
        useCollections({ initialCollections })
      );

      expect(result.current.collectionTree[0].name).toBe('Alpha');
      expect(result.current.collectionTree[1].name).toBe('Bravo');
      expect(result.current.collectionTree[2].name).toBe('Charlie');
    });

    it('handles orphan children (missing parent)', () => {
      const initialCollections = [
        createMockCollection({ id: 'orphan', name: 'Orphan', parentId: 'missing-parent' }),
      ];

      const { result } = renderHook(() =>
        useCollections({ initialCollections })
      );

      expect(result.current.collectionTree).toHaveLength(1);
      expect(result.current.collectionTree[0].id).toBe('orphan');
    });
  });

  describe('selection', () => {
    it('selects a collection', () => {
      const { result } = renderHook(() => useCollections());

      act(() => {
        result.current.selectCollection('col-1');
      });

      expect(result.current.selectedCollectionId).toBe('col-1');
    });

    it('deselects with null', () => {
      const { result } = renderHook(() => useCollections());

      act(() => {
        result.current.selectCollection('col-1');
      });

      act(() => {
        result.current.selectCollection(null);
      });

      expect(result.current.selectedCollectionId).toBeNull();
    });
  });

  describe('getCollection', () => {
    it('returns collection by ID', () => {
      const initialCollections = [
        createMockCollection({ id: 'col-1', name: 'Test' }),
      ];

      const { result } = renderHook(() =>
        useCollections({ initialCollections })
      );

      const collection = result.current.getCollection('col-1');
      expect(collection?.name).toBe('Test');
    });

    it('returns undefined for unknown ID', () => {
      const { result } = renderHook(() => useCollections());

      const collection = result.current.getCollection('unknown');
      expect(collection).toBeUndefined();
    });
  });

  describe('getBreadcrumbs', () => {
    it('returns path to collection', () => {
      const initialCollections = [
        createMockCollection({ id: 'root', name: 'Root' }),
        createMockCollection({ id: 'child', name: 'Child', parentId: 'root' }),
        createMockCollection({ id: 'grandchild', name: 'Grandchild', parentId: 'child' }),
      ];

      const { result } = renderHook(() =>
        useCollections({ initialCollections })
      );

      const breadcrumbs = result.current.getBreadcrumbs('grandchild');
      expect(breadcrumbs).toHaveLength(3);
      expect(breadcrumbs[0].name).toBe('Root');
      expect(breadcrumbs[1].name).toBe('Child');
      expect(breadcrumbs[2].name).toBe('Grandchild');
    });

    it('returns single item for root collection', () => {
      const initialCollections = [
        createMockCollection({ id: 'root', name: 'Root' }),
      ];

      const { result } = renderHook(() =>
        useCollections({ initialCollections })
      );

      const breadcrumbs = result.current.getBreadcrumbs('root');
      expect(breadcrumbs).toHaveLength(1);
    });

    it('returns empty for unknown collection', () => {
      const { result } = renderHook(() => useCollections());

      const breadcrumbs = result.current.getBreadcrumbs('unknown');
      expect(breadcrumbs).toHaveLength(0);
    });
  });

  describe('createCollection', () => {
    it('creates a new collection', async () => {
      const { result } = renderHook(() => useCollections());

      await act(async () => {
        await result.current.createCollection('New Collection');
      });

      expect(result.current.collections).toHaveLength(1);
      expect(result.current.collections[0].name).toBe('New Collection');
    });

    it('creates collection with parent', async () => {
      const { result } = renderHook(() => useCollections());

      await act(async () => {
        await result.current.createCollection('Parent');
      });

      const parentId = result.current.collections[0].id;

      await act(async () => {
        await result.current.createCollection('Child', parentId);
      });

      expect(result.current.collections).toHaveLength(2);
      expect(result.current.collections[1].parentId).toBe(parentId);
    });

    it('calls onCreateCollection callback', async () => {
      const onCreateCollection = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useCollections({ onCreateCollection })
      );

      await act(async () => {
        await result.current.createCollection('New Collection');
      });

      expect(onCreateCollection).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Collection' })
      );
    });

    it('handles creation error', async () => {
      const error = new Error('Creation failed');
      const onCreateCollection = vi.fn().mockRejectedValue(error);
      const { result } = renderHook(() =>
        useCollections({ onCreateCollection })
      );

      await act(async () => {
        try {
          await result.current.createCollection('New Collection');
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.collections).toHaveLength(0);
    });
  });

  describe('updateCollection', () => {
    it('updates collection properties', async () => {
      const initialCollections = [
        createMockCollection({ id: 'col-1', name: 'Original' }),
      ];

      const { result } = renderHook(() =>
        useCollections({ initialCollections })
      );

      await act(async () => {
        await result.current.updateCollection('col-1', { name: 'Updated' });
      });

      expect(result.current.collections[0].name).toBe('Updated');
    });

    it('updates updatedAt timestamp', async () => {
      const oldDate = new Date('2020-01-01');
      const initialCollections = [
        createMockCollection({ id: 'col-1', updatedAt: oldDate }),
      ];

      const { result } = renderHook(() =>
        useCollections({ initialCollections })
      );

      await act(async () => {
        await result.current.updateCollection('col-1', { name: 'Updated' });
      });

      expect(result.current.collections[0].updatedAt.getTime()).toBeGreaterThan(
        oldDate.getTime()
      );
    });

    it('calls onUpdateCollection callback', async () => {
      const onUpdateCollection = vi.fn().mockResolvedValue(undefined);
      const initialCollections = [
        createMockCollection({ id: 'col-1', name: 'Original' }),
      ];

      const { result } = renderHook(() =>
        useCollections({ initialCollections, onUpdateCollection })
      );

      await act(async () => {
        await result.current.updateCollection('col-1', { name: 'Updated' });
      });

      expect(onUpdateCollection).toHaveBeenCalledWith('col-1', { name: 'Updated' });
    });
  });

  describe('deleteCollection', () => {
    it('removes collection', async () => {
      const initialCollections = [
        createMockCollection({ id: 'col-1', name: 'To Delete' }),
      ];

      const { result } = renderHook(() =>
        useCollections({ initialCollections })
      );

      await act(async () => {
        await result.current.deleteCollection('col-1');
      });

      expect(result.current.collections).toHaveLength(0);
    });

    it('reassigns children to parent', async () => {
      const initialCollections = [
        createMockCollection({ id: 'grandparent', name: 'Grandparent' }),
        createMockCollection({ id: 'parent', name: 'Parent', parentId: 'grandparent' }),
        createMockCollection({ id: 'child', name: 'Child', parentId: 'parent' }),
      ];

      const { result } = renderHook(() =>
        useCollections({ initialCollections })
      );

      await act(async () => {
        await result.current.deleteCollection('parent');
      });

      expect(result.current.collections).toHaveLength(2);
      const child = result.current.getCollection('child');
      expect(child?.parentId).toBe('grandparent');
    });

    it('clears selection when deleted collection is selected', async () => {
      const initialCollections = [
        createMockCollection({ id: 'col-1', name: 'Selected' }),
      ];

      const { result } = renderHook(() =>
        useCollections({ initialCollections })
      );

      act(() => {
        result.current.selectCollection('col-1');
      });

      await act(async () => {
        await result.current.deleteCollection('col-1');
      });

      expect(result.current.selectedCollectionId).toBeNull();
    });

    it('calls onDeleteCollection callback', async () => {
      const onDeleteCollection = vi.fn().mockResolvedValue(undefined);
      const initialCollections = [
        createMockCollection({ id: 'col-1', name: 'To Delete' }),
      ];

      const { result } = renderHook(() =>
        useCollections({ initialCollections, onDeleteCollection })
      );

      await act(async () => {
        await result.current.deleteCollection('col-1');
      });

      expect(onDeleteCollection).toHaveBeenCalledWith('col-1');
    });
  });

  describe('moveToCollection', () => {
    it('calls onMoveToCollection callback', async () => {
      const onMoveToCollection = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useCollections({ onMoveToCollection })
      );

      await act(async () => {
        await result.current.moveToCollection(['item-1', 'item-2'], 'col-1');
      });

      expect(onMoveToCollection).toHaveBeenCalledWith(
        ['item-1', 'item-2'],
        'col-1'
      );
    });

    it('handles move to null (root)', async () => {
      const onMoveToCollection = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useCollections({ onMoveToCollection })
      );

      await act(async () => {
        await result.current.moveToCollection(['item-1'], null);
      });

      expect(onMoveToCollection).toHaveBeenCalledWith(['item-1'], null);
    });
  });

  describe('loading state', () => {
    it('sets loading during create', async () => {
      let resolvePromise: () => void;
      const onCreateCollection = vi.fn().mockImplementation(
        () => new Promise<void>((resolve) => { resolvePromise = resolve; })
      );
      const { result } = renderHook(() =>
        useCollections({ onCreateCollection })
      );

      let createPromise: Promise<void>;
      act(() => {
        createPromise = result.current.createCollection('New');
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!();
        await createPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });
});
