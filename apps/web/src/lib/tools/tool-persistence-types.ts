/**
 * Tool Persistence Types
 * Extracted to break circular dependency between tool-persistence-crud and tool-persistence-utils
 */

import type { ToolType } from '@/types/tools';

/**
 * Parameters for saving a tool
 */
export interface SaveToolParams {
  userId: string;
  type: ToolType;
  title: string;
  topic?: string;
  content: Record<string, unknown>;
  maestroId?: string;
  conversationId?: string;
  sessionId?: string;
}

/**
 * Saved tool record
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
 * Filter options for retrieving tools
 */
export interface GetToolsFilter {
  type?: ToolType;
  maestroId?: string;
  isBookmarked?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Material record from database (for type conversion)
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
