// ============================================================================
// TOOL PERSISTENCE - MAIN CRUD OPERATIONS
// Database operations for saving and retrieving created tools
// Issue #22: Materials Archive - Tool Storage
//
// UPDATED: Now uses unified Material table instead of deprecated CreatedTool.
// Part of Session Summary & Unified Archive feature.
//
// Split into: tool-persistence-helpers.ts | tool-persistence-stats.ts
// ============================================================================

import { prisma } from '@/lib/db';
import type { ToolType } from '@/types/tools';
import { randomUUID } from 'crypto';
import { generateMaterialEmbeddingAsync } from './tool-embedding';
import { materialToSavedTool, type SavedTool } from './tool-persistence-helpers';
import {
  getToolStats,
  getRecentTools,
  getBookmarkedTools,
  getToolsBySession,
  linkToolToSession,
  incrementViewCount,
} from './tool-persistence-stats';

// Re-export for backward compatibility
export type { SavedTool } from './tool-persistence-helpers';
export {
  materialToSavedTool,
  type MaterialRecord,
} from './tool-persistence-helpers';
export {
  getToolStats,
  getRecentTools,
  getBookmarkedTools,
  getToolsBySession,
  linkToolToSession,
  incrementViewCount,
} from './tool-persistence-stats';

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
  /** Optional source toolId for auto-linking derived materials (Wave 3) */
  sourceToolId?: string;
  /** Optional message ID for linking tool to the message that created it */
  messageId?: string;
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
 * Save a tool to the database (using Material table)
 * If sourceToolId is provided, creates a "derived_from" edge (Wave 3)
 */
export async function saveTool(params: SaveToolParams): Promise<SavedTool> {
  const toolId = `tool-${randomUUID()}`;

  const material = await prisma.material.create({
    data: {
      userId: params.userId,
      toolId,
      toolType: params.type,
      title: params.title,
      topic: params.topic ?? null,
      content: JSON.stringify(params.content),
      maestroId: params.maestroId ?? null,
      conversationId: params.conversationId ?? null,
      sessionId: params.sessionId ?? null,
      messageId: params.messageId ?? null,
      status: 'active',
    },
  });

  // Wave 3: Auto-link if derived from another material
  if (params.sourceToolId) {
    try {
      const sourceMaterial = await prisma.material.findUnique({
        where: { toolId: params.sourceToolId },
        select: { id: true },
      });

      if (sourceMaterial) {
        await prisma.materialEdge.create({
          data: {
            fromId: sourceMaterial.id,
            toId: material.id,
            relationType: 'derived_from',
            weight: 1.0,
          },
        });
      }
    } catch {
      // Non-blocking: log but don't fail the save
      console.warn('Failed to create derived_from edge', {
        sourceToolId: params.sourceToolId,
        newToolId: toolId,
      });
    }
  }

  // Wave 4: Generate embedding async (non-blocking)
  generateMaterialEmbeddingAsync(material.id, params.userId, params.content, params.type);

  return materialToSavedTool(material);
}

/**
 * Get all tools for a user with optional filtering
 */
export async function getUserTools(
  userId: string,
  filter?: GetToolsFilter
): Promise<SavedTool[]> {
  const where: Record<string, unknown> = {
    userId,
    status: 'active', // Only return active materials
  };

  if (filter?.type) {
    where.toolType = filter.type;
  }
  if (filter?.maestroId) {
    where.maestroId = filter.maestroId;
  }
  if (filter?.isBookmarked !== undefined) {
    where.isBookmarked = filter.isBookmarked;
  }

  const materials = await prisma.material.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: filter?.limit ?? 50,
    skip: filter?.offset ?? 0,
  });

  return materials.map(materialToSavedTool);
}

/**
 * Get a single tool by ID (supports both id and toolId)
 */
export async function getToolById(
  idOrToolId: string,
  userId: string
): Promise<SavedTool | null> {
  // Try to find by toolId first, then by id
  const material = await prisma.material.findFirst({
    where: {
      userId,
      status: 'active',
      OR: [{ id: idOrToolId }, { toolId: idOrToolId }],
    },
  });

  if (!material) return null;

  return materialToSavedTool(material);
}

/**
 * Delete a tool (soft delete by setting status to 'deleted')
 */
export async function deleteTool(idOrToolId: string, userId: string): Promise<boolean> {
  const material = await prisma.material.findFirst({
    where: {
      userId,
      OR: [{ id: idOrToolId }, { toolId: idOrToolId }],
    },
  });

  if (!material) return false;

  await prisma.material.update({
    where: { id: material.id },
    data: { status: 'deleted' },
  });

  return true;
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

  return getToolById(idOrToolId, userId);
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

  return getToolById(idOrToolId, userId);
}