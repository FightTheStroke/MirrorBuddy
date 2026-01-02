'use client';

/**
 * Knowledge Hub Tags Hook
 *
 * Manages tags for categorizing and filtering materials.
 * Provides CRUD operations and multi-select functionality.
 */

import { useState, useCallback, useMemo } from 'react';
import type { TagItem } from '../components/sidebar-navigation';

export interface TagData {
  id: string;
  name: string;
  color?: string;
  materialCount: number;
  createdAt: Date;
}

export interface UseTagsOptions {
  /** Initial tags data */
  initialTags?: TagData[];
  /** Callback when tag is created */
  onCreateTag?: (tag: TagData) => Promise<void>;
  /** Callback when tag is updated */
  onUpdateTag?: (id: string, updates: Partial<TagData>) => Promise<void>;
  /** Callback when tag is deleted */
  onDeleteTag?: (id: string) => Promise<void>;
  /** Callback when tags are added to materials */
  onAddTagsToMaterials?: (tagIds: string[], materialIds: string[]) => Promise<void>;
  /** Callback when tags are removed from materials */
  onRemoveTagsFromMaterials?: (tagIds: string[], materialIds: string[]) => Promise<void>;
}

export interface UseTagsReturn {
  /** All tags */
  tags: TagData[];
  /** Tags as TagItem for sidebar */
  tagItems: TagItem[];
  /** Selected tag IDs for filtering */
  selectedTagIds: string[];
  /** Toggle tag selection */
  toggleTag: (id: string) => void;
  /** Select multiple tags */
  selectTags: (ids: string[]) => void;
  /** Clear tag selection */
  clearSelection: () => void;
  /** Create a new tag */
  createTag: (name: string, color?: string) => Promise<void>;
  /** Update a tag */
  updateTag: (id: string, updates: Partial<TagData>) => Promise<void>;
  /** Delete a tag */
  deleteTag: (id: string) => Promise<void>;
  /** Add tags to materials */
  addTagsToMaterials: (tagIds: string[], materialIds: string[]) => Promise<void>;
  /** Remove tags from materials */
  removeTagsFromMaterials: (tagIds: string[], materialIds: string[]) => Promise<void>;
  /** Get tag by ID */
  getTag: (id: string) => TagData | undefined;
  /** Get popular tags (sorted by usage) */
  popularTags: TagData[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
}

// Predefined tag colors
export const TAG_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
];

/**
 * Get a random tag color.
 */
export function getRandomTagColor(): string {
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
}

/**
 * Hook for managing material tags.
 */
export function useTags(options: UseTagsOptions = {}): UseTagsReturn {
  const {
    initialTags = [],
    onCreateTag,
    onUpdateTag,
    onDeleteTag,
    onAddTagsToMaterials,
    onRemoveTagsFromMaterials,
  } = options;

  const [tags, setTags] = useState<TagData[]>(initialTags);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Convert to TagItem format for sidebar
  const tagItems = useMemo<TagItem[]>(() => {
    return tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      count: tag.materialCount,
    }));
  }, [tags]);

  // Get popular tags (sorted by usage count)
  const popularTags = useMemo(() => {
    return [...tags].sort((a, b) => b.materialCount - a.materialCount);
  }, [tags]);

  // Get tag by ID
  const getTag = useCallback(
    (id: string): TagData | undefined => {
      return tags.find((t) => t.id === id);
    },
    [tags]
  );

  // Toggle tag selection
  const toggleTag = useCallback((id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }, []);

  // Select multiple tags
  const selectTags = useCallback((ids: string[]) => {
    setSelectedTagIds(ids);
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedTagIds([]);
  }, []);

  // Create tag
  const createTag = useCallback(
    async (name: string, color?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const newTag: TagData = {
          id: `tag_${Date.now()}`,
          name,
          color: color || getRandomTagColor(),
          materialCount: 0,
          createdAt: new Date(),
        };

        if (onCreateTag) {
          await onCreateTag(newTag);
        }

        setTags((prev) => [...prev, newTag]);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to create tag'));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [onCreateTag]
  );

  // Update tag
  const updateTag = useCallback(
    async (id: string, updates: Partial<TagData>) => {
      setIsLoading(true);
      setError(null);

      try {
        if (onUpdateTag) {
          await onUpdateTag(id, updates);
        }

        setTags((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
        );
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update tag'));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [onUpdateTag]
  );

  // Delete tag
  const deleteTag = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setError(null);

      try {
        if (onDeleteTag) {
          await onDeleteTag(id);
        }

        setTags((prev) => prev.filter((t) => t.id !== id));
        setSelectedTagIds((prev) => prev.filter((t) => t !== id));
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to delete tag'));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [onDeleteTag]
  );

  // Add tags to materials
  const addTagsToMaterials = useCallback(
    async (tagIds: string[], materialIds: string[]) => {
      setIsLoading(true);
      setError(null);

      try {
        if (onAddTagsToMaterials) {
          await onAddTagsToMaterials(tagIds, materialIds);
        }

        // Update material counts
        setTags((prev) =>
          prev.map((t) =>
            tagIds.includes(t.id)
              ? { ...t, materialCount: t.materialCount + materialIds.length }
              : t
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to add tags'));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [onAddTagsToMaterials]
  );

  // Remove tags from materials
  const removeTagsFromMaterials = useCallback(
    async (tagIds: string[], materialIds: string[]) => {
      setIsLoading(true);
      setError(null);

      try {
        if (onRemoveTagsFromMaterials) {
          await onRemoveTagsFromMaterials(tagIds, materialIds);
        }

        // Update material counts
        setTags((prev) =>
          prev.map((t) =>
            tagIds.includes(t.id)
              ? { ...t, materialCount: Math.max(0, t.materialCount - materialIds.length) }
              : t
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to remove tags'));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [onRemoveTagsFromMaterials]
  );

  return {
    tags,
    tagItems,
    selectedTagIds,
    toggleTag,
    selectTags,
    clearSelection,
    createTag,
    updateTag,
    deleteTag,
    addTagsToMaterials,
    removeTagsFromMaterials,
    getTag,
    popularTags,
    isLoading,
    error,
  };
}
