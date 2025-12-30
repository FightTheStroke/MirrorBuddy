// ============================================================================
// TOOL PERSISTENCE
// Database operations for saving and retrieving created tools
// Issue #22: Materials Archive - Tool Storage
// ============================================================================

import { prisma } from '@/lib/db';
import type { ToolType } from '@/types/tools';

// ============================================================================
// TYPES
// ============================================================================

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

export interface SavedTool {
  id: string;
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

export interface GetToolsFilter {
  type?: ToolType;
  maestroId?: string;
  isBookmarked?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Save a tool to the database
 */
export async function saveTool(params: SaveToolParams): Promise<SavedTool> {
  const tool = await prisma.createdTool.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      topic: params.topic ?? null,
      content: JSON.stringify(params.content),
      maestroId: params.maestroId ?? null,
      conversationId: params.conversationId ?? null,
      sessionId: params.sessionId ?? null,
    },
  });

  return {
    ...tool,
    content: JSON.parse(tool.content) as Record<string, unknown>,
  };
}

/**
 * Get all tools for a user with optional filtering
 */
export async function getUserTools(
  userId: string,
  filter?: GetToolsFilter
): Promise<SavedTool[]> {
  const where: Record<string, unknown> = { userId };

  if (filter?.type) {
    where.type = filter.type;
  }
  if (filter?.maestroId) {
    where.maestroId = filter.maestroId;
  }
  if (filter?.isBookmarked !== undefined) {
    where.isBookmarked = filter.isBookmarked;
  }

  const tools = await prisma.createdTool.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: filter?.limit ?? 50,
    skip: filter?.offset ?? 0,
  });

  return tools.map((tool) => ({
    ...tool,
    content: JSON.parse(tool.content) as Record<string, unknown>,
  }));
}

/**
 * Get a single tool by ID
 */
export async function getToolById(
  toolId: string,
  userId: string
): Promise<SavedTool | null> {
  const tool = await prisma.createdTool.findFirst({
    where: { id: toolId, userId },
  });

  if (!tool) return null;

  return {
    ...tool,
    content: JSON.parse(tool.content) as Record<string, unknown>,
  };
}

/**
 * Delete a tool
 */
export async function deleteTool(toolId: string, userId: string): Promise<boolean> {
  const result = await prisma.createdTool.deleteMany({
    where: { id: toolId, userId },
  });
  return result.count > 0;
}

/**
 * Update a tool's rating (1-5 stars)
 */
export async function updateToolRating(
  toolId: string,
  userId: string,
  rating: number
): Promise<SavedTool | null> {
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  const tool = await prisma.createdTool.updateMany({
    where: { id: toolId, userId },
    data: { userRating: rating },
  });

  if (tool.count === 0) return null;

  return getToolById(toolId, userId);
}

/**
 * Toggle bookmark status
 */
export async function toggleBookmark(
  toolId: string,
  userId: string
): Promise<SavedTool | null> {
  const existing = await prisma.createdTool.findFirst({
    where: { id: toolId, userId },
  });

  if (!existing) return null;

  await prisma.createdTool.update({
    where: { id: toolId },
    data: { isBookmarked: !existing.isBookmarked },
  });

  return getToolById(toolId, userId);
}

/**
 * Increment view count
 */
export async function incrementViewCount(
  toolId: string,
  userId: string
): Promise<void> {
  await prisma.createdTool.updateMany({
    where: { id: toolId, userId },
    data: { viewCount: { increment: 1 } },
  });
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
  const tools = await prisma.createdTool.findMany({
    where: { userId },
    select: {
      type: true,
      isBookmarked: true,
      userRating: true,
    },
  });

  const byType: Record<string, number> = {};
  let bookmarked = 0;
  let ratingSum = 0;
  let ratingCount = 0;

  for (const tool of tools) {
    byType[tool.type] = (byType[tool.type] || 0) + 1;
    if (tool.isBookmarked) bookmarked++;
    if (tool.userRating !== null) {
      ratingSum += tool.userRating;
      ratingCount++;
    }
  }

  return {
    total: tools.length,
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
  return getUserTools(userId, { limit });
}

/**
 * Get bookmarked tools for a user
 */
export async function getBookmarkedTools(userId: string): Promise<SavedTool[]> {
  return getUserTools(userId, { isBookmarked: true });
}
