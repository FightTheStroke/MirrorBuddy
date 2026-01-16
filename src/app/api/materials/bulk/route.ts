// ============================================================================
// API ROUTE: Bulk Material Operations
// POST: Perform bulk operations on multiple materials
// ADR: 0022-knowledge-hub-material-organization.md
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateAuth } from '@/lib/auth/session-auth';

// Zod schema for bulk operations
const BulkOperationSchema = z.object({
  materialIds: z.array(z.string().cuid()).min(1).max(100),
  operation: z.enum(['move', 'archive', 'delete', 'restore', 'addTags', 'removeTags', 'setTags']),
  // Optional parameters depending on operation
  collectionId: z.string().cuid().nullable().optional(), // For 'move'
  tagIds: z.array(z.string().cuid()).optional(), // For tag operations
});

/**
 * POST /api/materials/bulk
 *
 * Perform bulk operations on multiple materials.
 *
 * Operations:
 * - move: Move materials to a collection (collectionId required, null = root)
 * - archive: Set status to 'archived'
 * - delete: Set status to 'deleted'
 * - restore: Set status to 'active'
 * - addTags: Add tags to materials (tagIds required)
 * - removeTags: Remove tags from materials (tagIds required)
 * - setTags: Replace all tags (tagIds required)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    // 2. Validate input
    const body = await request.json();
    const validation = BulkOperationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.issues.map(e => e.message),
        },
        { status: 400 }
      );
    }

    const { materialIds, operation, collectionId, tagIds } = validation.data;

    // 3. Verify all materials belong to user
    const materials = await prisma.material.findMany({
      where: {
        id: { in: materialIds },
        userId,
      },
      select: { id: true },
    });

    if (materials.length !== materialIds.length) {
      return NextResponse.json(
        { error: 'Some materials not found or not owned by user' },
        { status: 404 }
      );
    }

    // 4. Execute operation
    let result: { affected: number; operation: string };

    switch (operation) {
      case 'move':
        // Verify collection belongs to user if not null
        if (collectionId !== null && collectionId !== undefined) {
          const collection = await prisma.collection.findFirst({
            where: { id: collectionId, userId },
          });
          if (!collection) {
            return NextResponse.json(
              { error: 'Collection not found' },
              { status: 404 }
            );
          }
        }

        await prisma.material.updateMany({
          where: { id: { in: materialIds } },
          data: { collectionId: collectionId ?? null },
        });
        result = { affected: materialIds.length, operation: 'moved' };
        break;

      case 'archive':
        await prisma.material.updateMany({
          where: { id: { in: materialIds } },
          data: { status: 'archived' },
        });
        result = { affected: materialIds.length, operation: 'archived' };
        break;

      case 'delete':
        await prisma.material.updateMany({
          where: { id: { in: materialIds } },
          data: { status: 'deleted' },
        });
        result = { affected: materialIds.length, operation: 'deleted' };
        break;

      case 'restore':
        await prisma.material.updateMany({
          where: { id: { in: materialIds } },
          data: { status: 'active' },
        });
        result = { affected: materialIds.length, operation: 'restored' };
        break;

      case 'addTags':
        if (!tagIds || tagIds.length === 0) {
          return NextResponse.json(
            { error: 'tagIds required for addTags operation' },
            { status: 400 }
          );
        }

        // Verify tags belong to user
        const addTags = await prisma.tag.findMany({
          where: { id: { in: tagIds }, userId },
        });
        if (addTags.length !== tagIds.length) {
          return NextResponse.json(
            { error: 'Some tags not found' },
            { status: 404 }
          );
        }

        // Create MaterialTag entries using transaction for batch insert
        const tagData = materialIds.flatMap(materialId =>
          tagIds.map(tagId => ({ materialId, tagId }))
        );
        // Use createMany with skipDuplicates via raw upsert pattern
        await prisma.$transaction(
          tagData.map((entry) =>
            prisma.materialTag.upsert({
              where: {
                materialId_tagId: { materialId: entry.materialId, tagId: entry.tagId },
              },
              update: {}, // No update needed - just skip if exists
              create: entry,
            })
          )
        );
        result = { affected: materialIds.length, operation: 'tags added' };
        break;

      case 'removeTags':
        if (!tagIds || tagIds.length === 0) {
          return NextResponse.json(
            { error: 'tagIds required for removeTags operation' },
            { status: 400 }
          );
        }

        await prisma.materialTag.deleteMany({
          where: {
            materialId: { in: materialIds },
            tagId: { in: tagIds },
          },
        });
        result = { affected: materialIds.length, operation: 'tags removed' };
        break;

      case 'setTags':
        if (!tagIds) {
          return NextResponse.json(
            { error: 'tagIds required for setTags operation' },
            { status: 400 }
          );
        }

        // Verify tags if any
        if (tagIds.length > 0) {
          const setTagsCheck = await prisma.tag.findMany({
            where: { id: { in: tagIds }, userId },
          });
          if (setTagsCheck.length !== tagIds.length) {
            return NextResponse.json(
              { error: 'Some tags not found' },
              { status: 404 }
            );
          }
        }

        // Delete all existing tags and create new ones
        await prisma.materialTag.deleteMany({
          where: { materialId: { in: materialIds } },
        });

        if (tagIds.length > 0) {
          await prisma.materialTag.createMany({
            data: materialIds.flatMap(materialId =>
              tagIds.map(tagId => ({ materialId, tagId }))
            ),
          });
        }
        result = { affected: materialIds.length, operation: 'tags replaced' };
        break;

      default:
        return NextResponse.json(
          { error: 'Unknown operation' },
          { status: 400 }
        );
    }

    logger.info('Bulk operation completed', {
      userId,
      operation,
      materialCount: materialIds.length,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Bulk operation error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}
