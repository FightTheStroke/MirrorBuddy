/**
 * Owner scoping for the materials collection route (security finding S1).
 *
 * The collection route previously selected materials by `toolId` alone, so an
 * authenticated caller could update, retag or soft-delete another student's
 * material. Every mutation here carries `userId` inside the same statement:
 * Prisma's extended `whereUnique` compiles `{ toolId, userId }` into one
 * `WHERE "toolId" = $1 AND "userId" = $2`, so there is no check-then-write
 * window. This reuses the existing authentication (`withAuth`) and CSRF
 * (`withCSRF`) middlewares rather than introducing a third mechanism.
 */

import { NextResponse } from 'next/server';
import type { Prisma, Material } from '@prisma/client';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { generateSearchableText } from '@/lib/search/searchable-text';
import type { ToolType } from '@/types/tools';
import type { CreateMaterialRequest } from './types';

export const MATERIAL_NOT_FOUND = 'Material not found';

/** Relations returned to the client by the collection route. */
export const MATERIAL_RELATIONS = {
  collection: { select: { id: true, name: true, color: true } },
  tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
} satisfies Prisma.MaterialInclude;

export type MaterialWithRelations = Prisma.MaterialGetPayload<{
  include: typeof MATERIAL_RELATIONS;
}>;

function hasPrismaCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === code;
}

/** True when a write failed because no row matched the owner-scoped filter. */
export const isRecordNotFound = (error: unknown) => hasPrismaCode(error, 'P2025');

/** True when a create collided with the global `toolId` unique constraint. */
export const isUniqueConflict = (error: unknown) => hasPrismaCode(error, 'P2002');

/** Owner-scoped read. Returns null both for missing and for other-owner rows. */
export async function findOwnedMaterial(toolId: string, userId: string): Promise<Material | null> {
  return prisma.material.findFirst({ where: { toolId, userId } });
}

export async function findOwnedMaterialWithRelations(
  toolId: string,
  userId: string,
): Promise<MaterialWithRelations | null> {
  return prisma.material.findFirst({
    where: { toolId, userId },
    include: MATERIAL_RELATIONS,
  });
}

/**
 * Atomic owner-scoped update. Resolves to null when no owned row matched,
 * which the caller reports as 404 so material ids stay non-enumerable.
 */
export async function updateOwnedMaterial(
  toolId: string,
  userId: string,
  data: Record<string, unknown>,
): Promise<Material | null> {
  try {
    return await prisma.material.update({
      where: { toolId, userId },
      data: data as Prisma.MaterialUpdateInput,
    });
  } catch (error) {
    if (isRecordNotFound(error)) return null;
    throw error;
  }
}

export async function updateOwnedMaterialWithRelations(
  toolId: string,
  userId: string,
  data: Record<string, unknown>,
): Promise<MaterialWithRelations | null> {
  try {
    return await prisma.material.update({
      where: { toolId, userId },
      data: data as Prisma.MaterialUpdateInput,
      include: MATERIAL_RELATIONS,
    });
  } catch (error) {
    if (isRecordNotFound(error)) return null;
    throw error;
  }
}

/**
 * Validate that a collection and tags referenced by a mutation belong to the
 * caller. Mirrors the wording already used by `/api/materials/bulk`.
 */
export async function validateRelatedOwnership(
  userId: string,
  related: { collectionId?: string | null; tagIds?: string[] },
): Promise<NextResponse | null> {
  const { collectionId, tagIds } = related;

  if (collectionId) {
    const collection = await prisma.collection.findFirst({
      where: { id: collectionId, userId },
      select: { id: true },
    });
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }
  }

  if (tagIds && tagIds.length > 0) {
    const ownedTags = await prisma.tag.findMany({
      where: { id: { in: tagIds }, userId },
      select: { id: true },
    });
    const uniqueRequested = new Set(tagIds).size;
    if (ownedTags.length !== uniqueRequested) {
      return NextResponse.json({ error: 'Some tags not found' }, { status: 404 });
    }
  }

  return null;
}

export const materialNotFound = () =>
  NextResponse.json({ error: MATERIAL_NOT_FOUND }, { status: 404 });

/**
 * POST persistence for the collection route: update the caller's own material
 * when the `toolId` already belongs to them, otherwise create a new one with
 * owner-validated collection and tags.
 */
export async function saveOwnedMaterial(
  userId: string,
  body: CreateMaterialRequest,
): Promise<NextResponse> {
  const {
    toolId,
    toolType,
    title,
    content,
    maestroId,
    sessionId,
    subject,
    preview,
    collectionId,
    tagIds,
  } = body;

  const searchableText = generateSearchableText(toolType as ToolType, content);
  const existing = await findOwnedMaterial(toolId, userId);

  if (existing) {
    const updated = await updateOwnedMaterial(toolId, userId, {
      title,
      content: JSON.stringify(content),
      searchableText,
      preview,
      updatedAt: new Date(),
    });

    if (!updated) return materialNotFound();

    logger.info('Material updated', { toolId, toolType });
    return NextResponse.json({
      success: true,
      material: { ...updated, content },
      updated: true,
    });
  }

  const relatedError = await validateRelatedOwnership(userId, {
    collectionId,
    tagIds,
  });
  if (relatedError) return relatedError;

  let material: MaterialWithRelations;
  try {
    material = await prisma.material.create({
      data: {
        userId,
        toolId,
        toolType,
        title,
        content: JSON.stringify(content),
        searchableText,
        maestroId,
        sessionId,
        subject,
        preview,
        collectionId,
        ...(tagIds &&
          tagIds.length > 0 && {
            tags: { create: tagIds.map((tagId) => ({ tagId })) },
          }),
      },
      include: MATERIAL_RELATIONS,
    });
  } catch (error) {
    // toolId is globally unique, so a collision means the identifier is already
    // held by another owner. Report the clash without disclosing anything else.
    if (isUniqueConflict(error)) {
      return NextResponse.json({ error: 'Material identifier already in use' }, { status: 409 });
    }
    throw error;
  }

  logger.info('Material created', {
    toolId,
    toolType,
    userId,
    collectionId,
    tagCount: tagIds?.length,
  });

  return NextResponse.json({
    success: true,
    material: {
      ...material,
      content,
      tags: material.tags.map((mt) => mt.tag),
    },
    created: true,
  });
}
