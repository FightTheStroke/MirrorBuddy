/**
 * Collection Types
 * Shared types for collection hooks to avoid circular dependencies
 */

export interface CollectionData {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  parentId?: string | null;
  materialCount: number;
  createdAt: Date;
  updatedAt: Date;
}
