/**
 * Tool Persistence CRUD Operations
 * Database operations for saving and retrieving created tools
 * Issue #22: Materials Archive - Tool Storage
 */

import { prisma } from '@/lib/db';
import { randomUUID } from 'crypto';
import {
  materialToSavedTool,
  type SaveToolParams,
  type SavedTool,
  type GetToolsFilter,
} from './tool-persistence-utils';

/**
 * Save a tool to the database (using Material table)
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
      status: 'active',
    },
  });

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
