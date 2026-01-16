// ============================================================================
// TOOL PERSISTENCE STATISTICS & QUERIES
// Statistics and filtered query functions for tools
// ============================================================================

import { prisma } from '@/lib/db';
import type { ToolType } from '@/types/tools';
import { materialToSavedTool, type SavedTool } from './tool-persistence-helpers';

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
  const materials = await prisma.material.findMany({
    where: { userId, status: 'active' },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return materials.map(materialToSavedTool);
}

/**
 * Get bookmarked tools for a user
 */
export async function getBookmarkedTools(userId: string): Promise<SavedTool[]> {
  const materials = await prisma.material.findMany({
    where: { userId, status: 'active', isBookmarked: true },
    orderBy: { createdAt: 'desc' },
  });

  return materials.map(materialToSavedTool);
}

/**
 * Get tools by session ID
 */
export async function getToolsBySession(
  userId: string,
  sessionId: string
): Promise<SavedTool[]> {
  const materials = await prisma.material.findMany({
    where: {
      userId,
      sessionId,
      status: 'active',
    },
    orderBy: { createdAt: 'desc' },
  });

  return materials.map(materialToSavedTool);
}

/**
 * Link a tool to a session
 */
export async function linkToolToSession(
  idOrToolId: string,
  userId: string,
  sessionId: string
): Promise<SavedTool | null> {
  const material = await prisma.material.findFirst({
    where: {
      userId,
      OR: [{ id: idOrToolId }, { toolId: idOrToolId }],
    },
  });

  if (!material) return null;

  const updated = await prisma.material.update({
    where: { id: material.id },
    data: { sessionId },
  });

  return materialToSavedTool(updated);
}

/**
 * Increment view count for a tool
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
