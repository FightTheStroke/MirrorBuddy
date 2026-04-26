/**
 * Tag types and constants for Knowledge Hub materials management.
 */

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
