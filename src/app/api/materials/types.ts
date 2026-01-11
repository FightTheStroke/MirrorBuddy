/**
 * Materials API types
 */

// Material types for storage (maps from ToolType actions to stored types)
export type MaterialType =
  | 'mindmap'
  | 'quiz'
  | 'flashcard'
  | 'demo'
  | 'webcam'
  | 'pdf'
  | 'search'
  | 'diagram'
  | 'timeline'
  | 'summary'
  | 'formula'
  | 'chart';

export interface CreateMaterialRequest {
  toolId: string;
  toolType: MaterialType;
  title: string;
  content: Record<string, unknown>;
  maestroId?: string;
  sessionId?: string;
  subject?: string;
  preview?: string;
  collectionId?: string;
  tagIds?: string[];
}

export interface UpdateMaterialRequest {
  title?: string;
  content?: Record<string, unknown>;
  status?: 'active' | 'archived' | 'deleted';
  // User interaction (Issue #37 - Archive features)
  userRating?: number;
  isBookmarked?: boolean;
  // Collection and tags
  collectionId?: string | null;
  tagIds?: string[];
}
