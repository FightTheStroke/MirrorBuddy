/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTags, TAG_COLORS, getRandomTagColor, type TagData } from '../use-tags';

const createMockTag = (overrides: Partial<TagData> = {}): TagData => ({
  id: `tag-${Date.now()}-${Math.random()}`,
  name: 'Test Tag',
  color: '#3b82f6',
  materialCount: 0,
  createdAt: new Date(),
  ...overrides,
});

describe('useTags', () => {
  describe('initial state', () => {
    it('starts with empty tags', () => {
      const { result } = renderHook(() => useTags());

      expect(result.current.tags).toEqual([]);
      expect(result.current.tagItems).toEqual([]);
      expect(result.current.selectedTagIds).toEqual([]);
    });

    it('accepts initial tags', () => {
      const initialTags = [
        createMockTag({ id: 'tag-1', name: 'Tag 1' }),
        createMockTag({ id: 'tag-2', name: 'Tag 2' }),
      ];

      const { result } = renderHook(() => useTags({ initialTags }));

      expect(result.current.tags).toHaveLength(2);
    });
  });

  describe('tagItems conversion', () => {
    it('converts tags to TagItem format', () => {
      const initialTags = [
        createMockTag({ id: 'tag-1', name: 'Tag 1', color: '#ff0000', materialCount: 5 }),
      ];

      const { result } = renderHook(() => useTags({ initialTags }));

      expect(result.current.tagItems[0]).toEqual({
        id: 'tag-1',
        name: 'Tag 1',
        color: '#ff0000',
        count: 5,
      });
    });
  });

  describe('popularTags', () => {
    it('sorts tags by material count descending', () => {
      const initialTags = [
        createMockTag({ id: 'tag-1', name: 'Low', materialCount: 1 }),
        createMockTag({ id: 'tag-2', name: 'High', materialCount: 100 }),
        createMockTag({ id: 'tag-3', name: 'Medium', materialCount: 50 }),
      ];

      const { result } = renderHook(() => useTags({ initialTags }));

      expect(result.current.popularTags[0].name).toBe('High');
      expect(result.current.popularTags[1].name).toBe('Medium');
      expect(result.current.popularTags[2].name).toBe('Low');
    });
  });

  describe('getTag', () => {
    it('returns tag by ID', () => {
      const initialTags = [createMockTag({ id: 'tag-1', name: 'Test' })];

      const { result } = renderHook(() => useTags({ initialTags }));

      const tag = result.current.getTag('tag-1');
      expect(tag?.name).toBe('Test');
    });

    it('returns undefined for unknown ID', () => {
      const { result } = renderHook(() => useTags());

      const tag = result.current.getTag('unknown');
      expect(tag).toBeUndefined();
    });
  });

  describe('selection', () => {
    it('toggles tag selection on', () => {
      const { result } = renderHook(() => useTags());

      act(() => {
        result.current.toggleTag('tag-1');
      });

      expect(result.current.selectedTagIds).toContain('tag-1');
    });

    it('toggles tag selection off', () => {
      const { result } = renderHook(() => useTags());

      act(() => {
        result.current.toggleTag('tag-1');
      });

      act(() => {
        result.current.toggleTag('tag-1');
      });

      expect(result.current.selectedTagIds).not.toContain('tag-1');
    });

    it('selects multiple tags at once', () => {
      const { result } = renderHook(() => useTags());

      act(() => {
        result.current.selectTags(['tag-1', 'tag-2', 'tag-3']);
      });

      expect(result.current.selectedTagIds).toHaveLength(3);
    });

    it('clears selection', () => {
      const { result } = renderHook(() => useTags());

      act(() => {
        result.current.selectTags(['tag-1', 'tag-2']);
      });

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedTagIds).toHaveLength(0);
    });
  });

  describe('createTag', () => {
    it('creates a new tag with name', async () => {
      const { result } = renderHook(() => useTags());

      await act(async () => {
        await result.current.createTag('New Tag');
      });

      expect(result.current.tags).toHaveLength(1);
      expect(result.current.tags[0].name).toBe('New Tag');
    });

    it('creates tag with custom color', async () => {
      const { result } = renderHook(() => useTags());

      await act(async () => {
        await result.current.createTag('Colored Tag', '#ff0000');
      });

      expect(result.current.tags[0].color).toBe('#ff0000');
    });

    it('creates tag with random color if not specified', async () => {
      const { result } = renderHook(() => useTags());

      await act(async () => {
        await result.current.createTag('Random Color');
      });

      expect(TAG_COLORS).toContain(result.current.tags[0].color);
    });

    it('initializes materialCount to 0', async () => {
      const { result } = renderHook(() => useTags());

      await act(async () => {
        await result.current.createTag('New Tag');
      });

      expect(result.current.tags[0].materialCount).toBe(0);
    });

    it('calls onCreateTag callback', async () => {
      const onCreateTag = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useTags({ onCreateTag }));

      await act(async () => {
        await result.current.createTag('New Tag');
      });

      expect(onCreateTag).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Tag' })
      );
    });

    it('handles creation error', async () => {
      const error = new Error('Creation failed');
      const onCreateTag = vi.fn().mockRejectedValue(error);
      const { result } = renderHook(() => useTags({ onCreateTag }));

      await act(async () => {
        try {
          await result.current.createTag('New Tag');
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.tags).toHaveLength(0);
    });
  });

  describe('updateTag', () => {
    it('updates tag name', async () => {
      const initialTags = [createMockTag({ id: 'tag-1', name: 'Original' })];

      const { result } = renderHook(() => useTags({ initialTags }));

      await act(async () => {
        await result.current.updateTag('tag-1', { name: 'Updated' });
      });

      expect(result.current.tags[0].name).toBe('Updated');
    });

    it('updates tag color', async () => {
      const initialTags = [createMockTag({ id: 'tag-1', color: '#000000' })];

      const { result } = renderHook(() => useTags({ initialTags }));

      await act(async () => {
        await result.current.updateTag('tag-1', { color: '#ffffff' });
      });

      expect(result.current.tags[0].color).toBe('#ffffff');
    });

    it('calls onUpdateTag callback', async () => {
      const onUpdateTag = vi.fn().mockResolvedValue(undefined);
      const initialTags = [createMockTag({ id: 'tag-1' })];

      const { result } = renderHook(() => useTags({ initialTags, onUpdateTag }));

      await act(async () => {
        await result.current.updateTag('tag-1', { name: 'Updated' });
      });

      expect(onUpdateTag).toHaveBeenCalledWith('tag-1', { name: 'Updated' });
    });
  });

  describe('deleteTag', () => {
    it('removes tag', async () => {
      const initialTags = [createMockTag({ id: 'tag-1' })];

      const { result } = renderHook(() => useTags({ initialTags }));

      await act(async () => {
        await result.current.deleteTag('tag-1');
      });

      expect(result.current.tags).toHaveLength(0);
    });

    it('removes tag from selection when deleted', async () => {
      const initialTags = [createMockTag({ id: 'tag-1' })];

      const { result } = renderHook(() => useTags({ initialTags }));

      act(() => {
        result.current.toggleTag('tag-1');
      });

      await act(async () => {
        await result.current.deleteTag('tag-1');
      });

      expect(result.current.selectedTagIds).not.toContain('tag-1');
    });

    it('calls onDeleteTag callback', async () => {
      const onDeleteTag = vi.fn().mockResolvedValue(undefined);
      const initialTags = [createMockTag({ id: 'tag-1' })];

      const { result } = renderHook(() => useTags({ initialTags, onDeleteTag }));

      await act(async () => {
        await result.current.deleteTag('tag-1');
      });

      expect(onDeleteTag).toHaveBeenCalledWith('tag-1');
    });
  });

  describe('addTagsToMaterials', () => {
    it('increments material counts', async () => {
      const initialTags = [
        createMockTag({ id: 'tag-1', materialCount: 5 }),
        createMockTag({ id: 'tag-2', materialCount: 3 }),
      ];

      const { result } = renderHook(() => useTags({ initialTags }));

      await act(async () => {
        await result.current.addTagsToMaterials(['tag-1', 'tag-2'], ['mat-1', 'mat-2']);
      });

      expect(result.current.getTag('tag-1')?.materialCount).toBe(7);
      expect(result.current.getTag('tag-2')?.materialCount).toBe(5);
    });

    it('calls onAddTagsToMaterials callback', async () => {
      const onAddTagsToMaterials = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useTags({ onAddTagsToMaterials }));

      await act(async () => {
        await result.current.addTagsToMaterials(['tag-1'], ['mat-1', 'mat-2']);
      });

      expect(onAddTagsToMaterials).toHaveBeenCalledWith(
        ['tag-1'],
        ['mat-1', 'mat-2']
      );
    });
  });

  describe('removeTagsFromMaterials', () => {
    it('decrements material counts', async () => {
      const initialTags = [
        createMockTag({ id: 'tag-1', materialCount: 5 }),
      ];

      const { result } = renderHook(() => useTags({ initialTags }));

      await act(async () => {
        await result.current.removeTagsFromMaterials(['tag-1'], ['mat-1', 'mat-2']);
      });

      expect(result.current.getTag('tag-1')?.materialCount).toBe(3);
    });

    it('does not go below zero', async () => {
      const initialTags = [
        createMockTag({ id: 'tag-1', materialCount: 1 }),
      ];

      const { result } = renderHook(() => useTags({ initialTags }));

      await act(async () => {
        await result.current.removeTagsFromMaterials(['tag-1'], ['mat-1', 'mat-2', 'mat-3']);
      });

      expect(result.current.getTag('tag-1')?.materialCount).toBe(0);
    });

    it('calls onRemoveTagsFromMaterials callback', async () => {
      const onRemoveTagsFromMaterials = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useTags({ onRemoveTagsFromMaterials }));

      await act(async () => {
        await result.current.removeTagsFromMaterials(['tag-1'], ['mat-1']);
      });

      expect(onRemoveTagsFromMaterials).toHaveBeenCalledWith(
        ['tag-1'],
        ['mat-1']
      );
    });
  });

  describe('loading state', () => {
    it('sets loading during create', async () => {
      let resolvePromise: () => void;
      const onCreateTag = vi.fn().mockImplementation(
        () => new Promise<void>((resolve) => { resolvePromise = resolve; })
      );
      const { result } = renderHook(() => useTags({ onCreateTag }));

      let createPromise: Promise<void>;
      act(() => {
        createPromise = result.current.createTag('New');
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

describe('getRandomTagColor', () => {
  it('returns a color from TAG_COLORS', () => {
    const color = getRandomTagColor();
    expect(TAG_COLORS).toContain(color);
  });
});

describe('TAG_COLORS', () => {
  it('has 16 colors', () => {
    expect(TAG_COLORS).toHaveLength(16);
  });

  it('all colors are valid hex colors', () => {
    const hexRegex = /^#[0-9a-f]{6}$/i;
    for (const color of TAG_COLORS) {
      expect(color).toMatch(hexRegex);
    }
  });
});
