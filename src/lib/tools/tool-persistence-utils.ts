/**
 * Tool Persistence Utilities
 * Types, conversion helpers, and utility functions for tool management
 * Issue #22: Materials Archive - Tool Storage
 *
 * UPDATED: Now uses unified Material table instead of deprecated CreatedTool.
 * Part of Session Summary & Unified Archive feature.
 */

import { prisma } from '@/lib/db';
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
 * Convert Material record to SavedTool interface
 */
export function materialToSavedTool(material: {
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
}): SavedTool {
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

/**
 * Update a tool's rating (1-5 stars)
 */
export async function updateToolRating(
  idOrToolId: string,
  userId: string,
  rating: number
): Promise<SavedTool | null> {
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  const material = await prisma.material.findFirst({
    where: {
      userId,
      OR: [{ id: idOrToolId }, { toolId: idOrToolId }],
    },
  });

  if (!material) return null;

  await prisma.material.update({
    where: { id: material.id },
    data: { userRating: rating },
  });

  // Re-fetch to get updated data
  const updated = await prisma.material.findFirst({
    where: {
      userId,
      OR: [{ id: idOrToolId }, { toolId: idOrToolId }],
    },
  });

  return updated ? materialToSavedTool(updated) : null;
}

/**
 * Toggle bookmark status
 */
export async function toggleBookmark(
  idOrToolId: string,
  userId: string
): Promise<SavedTool | null> {
  const material = await prisma.material.findFirst({
    where: {
      userId,
      OR: [{ id: idOrToolId }, { toolId: idOrToolId }],
    },
  });

  if (!material) return null;

  await prisma.material.update({
    where: { id: material.id },
    data: { isBookmarked: !material.isBookmarked },
  });

  // Re-fetch to get updated data
  const updated = await prisma.material.findFirst({
    where: {
      userId,
      OR: [{ id: idOrToolId }, { toolId: idOrToolId }],
    },
  });

  return updated ? materialToSavedTool(updated) : null;
}

/**
 * Increment view count
 */
export async function incrementViewCount(
  idOrToolId: string,
  userId: string
): Promise<void> {
  const material = await prisma.material.findFirst({
    where: {
      userId,
      OR: [{ id: idOrToolId }, { toolId: idOrToolId }],
    },
  });

  if (material) {
    await prisma.material.update({
      where: { id: material.id },
      data: { viewCount: { increment: 1 } },
    });
  }
}

/**
 * Get tool statistics for a user
 */
export async function getToolStats(userId: string): Promise<{
  total: number;
  byType: Record<string, number>;
  bookmarked: number;
  avgRating: number | null;
}> {
  const materials = await prisma.material.findMany({
    where: { userId, status: 'active' },
    select: {
      toolType: true,
      isBookmarked: true,
      userRating: true,
    },
  });

  const byType: Record<string, number> = {};
  let bookmarked = 0;
  let ratingSum = 0;
  let ratingCount = 0;

  for (const material of materials) {
    byType[material.toolType] = (byType[material.toolType] || 0) + 1;
    if (material.isBookmarked) bookmarked++;
    if (material.userRating !== null) {
      ratingSum += material.userRating;
      ratingCount++;
    }
  }

  return {
    total: materials.length,
    byType,
    bookmarked,
    avgRating: ratingCount > 0 ? ratingSum / ratingCount : null,
  };
}

/**
 * Get recent tools for a user
 */
export async function getRecentTools(
  userId: string,
  limit: number = 5
): Promise<SavedTool[]> {
  // Import here to avoid circular dependency
  const { getUserTools } = await import('./tool-persistence-crud');
  return getUserTools(userId, { limit });
}

/**
 * Get bookmarked tools for a user
 */
export async function getBookmarkedTools(userId: string): Promise<SavedTool[]> {
  // Import here to avoid circular dependency
  const { getUserTools } = await import('./tool-persistence-crud');
  return getUserTools(userId, { isBookmarked: true });
}
