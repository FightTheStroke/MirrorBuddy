/**
 * Tool Persistence Utilities
 * Utility functions for tool management
 * Issue #22: Materials Archive - Tool Storage
 *
 * UPDATED: Now uses unified Material table instead of deprecated CreatedTool.
 * Part of Session Summary & Unified Archive feature.
 */

import { prisma } from '@/lib/db';
import {
  materialToSavedTool,
  type SaveToolParams,
  type SavedTool,
  type GetToolsFilter,
} from './tool-persistence-types';

// Re-export types for backwards compatibility
export {
  materialToSavedTool,
  type SaveToolParams,
  type SavedTool,
  type GetToolsFilter,
} from './tool-persistence-types';

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
