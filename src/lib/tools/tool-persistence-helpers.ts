// ============================================================================
// TOOL PERSISTENCE HELPERS
// Database record conversion and transformation utilities
// ============================================================================

import type { ToolType } from '@/types/tools';

/**
 * Material record from database
 */
export interface MaterialRecord {
  id: string;
  toolId: string;
  userId: string;
  toolType: string;
  title: string;
  topic: string | null;
  content: string;
  maestroId: string | null;
  conversationId: string | null;
  sessionId: string | null;
  userRating: number | null;
  isBookmarked: boolean;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * SavedTool interface (public API response)
 */
export interface SavedTool {
  id: string;
  toolId: string;
  userId: string;
  type: string;
  title: string;
  topic: string | null;
  content: Record<string, unknown>;
  maestroId: string | null;
  conversationId: string | null;
  sessionId: string | null;
  userRating: number | null;
  isBookmarked: boolean;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Convert Material record to SavedTool interface
 */
export function materialToSavedTool(material: MaterialRecord): SavedTool {
  return {
    id: material.id,
    toolId: material.toolId,
    userId: material.userId,
    type: material.toolType,
    title: material.title,
    topic: material.topic,
    content: JSON.parse(material.content) as Record<string, unknown>,
    maestroId: material.maestroId,
    conversationId: material.conversationId,
    sessionId: material.sessionId,
    userRating: material.userRating,
    isBookmarked: material.isBookmarked,
    viewCount: material.viewCount,
    createdAt: material.createdAt,
    updatedAt: material.updatedAt,
  };
}
