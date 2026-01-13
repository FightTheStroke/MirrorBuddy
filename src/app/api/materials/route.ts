/**
 * API Route: Materials
 * Persists tool outputs (mindmaps, quizzes, flashcards, etc.) to database.
 * Part of T-20: Persist tools to database + API.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { generateSearchableText } from '@/lib/search/searchable-text';
import { isPostgreSQL } from '@/lib/db/database-utils';
import { Prisma } from '@prisma/client';
import type { ToolType } from '@/types/tools';
import { CreateMaterialRequest, UpdateMaterialRequest, MaterialType } from './types';
import { VALID_MATERIAL_TYPES } from './constants';

/**
 * GET /api/materials
 * List materials for current user with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const cookieUserId = cookieStore.get('mirrorbuddy-user-id')?.value;

    const { searchParams } = new URL(request.url);
    const queryUserId = searchParams.get('userId');
    const userId = cookieUserId || queryUserId;

    const toolType = searchParams.get('toolType');
    const status = searchParams.get('status') || 'active';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const collectionId = searchParams.get('collectionId');
    const tagId = searchParams.get('tagId');
    const search = searchParams.get('search');
    const subject = searchParams.get('subject');

    // PostgreSQL full-text search optimization
    if (search && isPostgreSQL()) {
      // Build WHERE conditions for raw SQL query
      const conditions: Prisma.Sql[] = [
        Prisma.sql`m."userId" = ${userId}`,
        Prisma.sql`m.status = ${status}`,
        Prisma.sql`m."searchableTextVector" @@ websearch_to_tsquery('english', ${search})`,
      ];

      if (toolType && VALID_MATERIAL_TYPES.includes(toolType as MaterialType)) {
        conditions.push(Prisma.sql`m."toolType" = ${toolType}`);
      }
      if (collectionId) {
        conditions.push(Prisma.sql`m."collectionId" = ${collectionId}`);
      }
      if (subject) {
        conditions.push(Prisma.sql`m.subject = ${subject}`);
      }

      const whereClause = Prisma.join(conditions, ' AND ');

      // Execute full-text search query with ranking
      const materials = await prisma.$queryRaw<Array<{
        id: string;
        userId: string;
        toolId: string;
        toolType: string;
        title: string;
        content: string;
        searchableText: string | null;
        maestroId: string | null;
        sessionId: string | null;
        subject: string | null;
        preview: string | null;
        status: string;
        userRating: number | null;
        isBookmarked: boolean;
        viewCount: number;
        collectionId: string | null;
        createdAt: Date;
        updatedAt: Date;
        rank: number;
      }>>`
        SELECT
          m.*,
          ts_rank(m."searchableTextVector", websearch_to_tsquery('english', ${search})) as rank
        FROM "Material" m
        WHERE ${whereClause}
        ${tagId ? Prisma.sql`AND EXISTS (
          SELECT 1 FROM "MaterialTag" mt
          WHERE mt."materialId" = m.id AND mt."tagId" = ${tagId}
        )` : Prisma.empty}
        ORDER BY rank DESC, m."createdAt" DESC
        LIMIT ${Math.min(limit, 100)}
        OFFSET ${offset}
      `;

      // Get count for pagination
      const countResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM "Material" m
        WHERE ${whereClause}
        ${tagId ? Prisma.sql`AND EXISTS (
          SELECT 1 FROM "MaterialTag" mt
          WHERE mt."materialId" = m.id AND mt."tagId" = ${tagId}
        )` : Prisma.empty}
      `;
      const total = Number(countResult[0]?.count || 0);

      // Fetch collections and tags for the materials
      const materialIds = materials.map(m => m.id);
      const collections = await prisma.collection.findMany({
        where: { id: { in: materials.map(m => m.collectionId).filter(Boolean) as string[] } },
        select: { id: true, name: true, color: true },
      });
      const materialTags = await prisma.materialTag.findMany({
        where: { materialId: { in: materialIds } },
        include: { tag: { select: { id: true, name: true, color: true } } },
      });

      // Build collection and tag maps
      const collectionMap = new Map(collections.map(c => [c.id, c]));
      const tagsMap = new Map<string, Array<{ id: string; name: string; color: string }>>();
      for (const mt of materialTags) {
        if (!tagsMap.has(mt.materialId)) {
          tagsMap.set(mt.materialId, []);
        }
        tagsMap.get(mt.materialId)?.push(mt.tag);
      }

      // Parse and format results
      const parsed = materials.map((m) => ({
        ...m,
        content: JSON.parse(m.content),
        collection: m.collectionId ? collectionMap.get(m.collectionId) || null : null,
        tags: tagsMap.get(m.id) || [],
      }));

      return NextResponse.json({
        materials: parsed,
        total,
        limit,
        offset,
      });
    }

    // SQLite fallback or non-search queries - use standard Prisma ORM
    const where: Record<string, unknown> = { userId, status };
    if (toolType && VALID_MATERIAL_TYPES.includes(toolType as MaterialType)) {
      where.toolType = toolType;
    }
    if (collectionId) {
      where.collectionId = collectionId;
    }
    if (tagId) {
      where.tags = { some: { tagId } };
    }
    if (subject) {
      where.subject = subject;
    }
    if (search) {
      // SQLite fallback - case-insensitive LIKE search
      where.OR = [
        { searchableText: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [materials, total] = await Promise.all([
      prisma.material.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 100),
        skip: offset,
        include: {
          collection: { select: { id: true, name: true, color: true } },
          tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
        },
      }),
      prisma.material.count({ where }),
    ]);

    const parsed = materials.map((m) => ({
      ...m,
      content: JSON.parse(m.content as string),
      tags: m.tags.map((mt) => mt.tag),
    }));

    return NextResponse.json({
      materials: parsed,
      total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Failed to fetch materials', { error: String(error) });
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
  }
}

/**
 * POST /api/materials
 * Create a new material (persist tool output)
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const cookieUserId = cookieStore.get('mirrorbuddy-user-id')?.value;

    const body: CreateMaterialRequest & { userId?: string } = await request.json();
    const userId = cookieUserId || body.userId;
    const { toolId, toolType, title, content, maestroId, sessionId, subject, preview, collectionId, tagIds } = body;

    if (!userId || !toolId || !toolType || !title || !content) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['userId', 'toolId', 'toolType', 'title', 'content'],
        },
        { status: 400 }
      );
    }

    if (!VALID_MATERIAL_TYPES.includes(toolType)) {
      return NextResponse.json(
        {
          error: 'Invalid tool type',
          validTypes: VALID_MATERIAL_TYPES,
        },
        { status: 400 }
      );
    }

    const existing = await prisma.material.findUnique({
      where: { toolId },
    });

    const searchableText = generateSearchableText(toolType as ToolType, content);

    if (existing) {
      const updated = await prisma.material.update({
        where: { toolId },
        data: {
          title,
          content: JSON.stringify(content),
          searchableText,
          preview,
          updatedAt: new Date(),
        },
      });

      logger.info('Material updated', { toolId, toolType });

      return NextResponse.json({
        success: true,
        material: {
          ...updated,
          content,
        },
        updated: true,
      });
    }

    const material = await prisma.material.create({
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
            tags: {
              create: tagIds.map(tagId => ({ tagId })),
            },
          }),
      },
      include: {
        collection: { select: { id: true, name: true, color: true } },
        tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
      },
    });

    logger.info('Material created', { toolId, toolType, userId, collectionId, tagCount: tagIds?.length });

    return NextResponse.json({
      success: true,
      material: {
        ...material,
        content,
        tags: material.tags.map(mt => mt.tag),
      },
      created: true,
    });
  } catch (error) {
    logger.error('Failed to create material', { error: String(error) });
    return NextResponse.json({ error: 'Failed to create material' }, { status: 500 });
  }
}

/**
 * PATCH /api/materials
 * Update a material (title, content, or status)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body: UpdateMaterialRequest & { toolId: string } = await request.json();
    const { toolId, title, content, status, userRating, isBookmarked, collectionId, tagIds } = body;

    if (!toolId) {
      return NextResponse.json({ error: 'Missing toolId' }, { status: 400 });
    }

    const existing = await prisma.material.findUnique({
      where: { toolId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (title) updateData.title = title;
    if (content) {
      updateData.content = JSON.stringify(content);
      updateData.searchableText = generateSearchableText(
        existing.toolType as ToolType,
        content
      );
    }
    if (status) updateData.status = status;
    if (typeof userRating === 'number' && userRating >= 1 && userRating <= 5) {
      updateData.userRating = userRating;
    }
    if (typeof isBookmarked === 'boolean') {
      updateData.isBookmarked = isBookmarked;
    }
    if (collectionId !== undefined) {
      updateData.collectionId = collectionId;
    }

    if (tagIds !== undefined) {
      await prisma.$transaction([
        prisma.materialTag.deleteMany({ where: { materialId: existing.id } }),
        ...tagIds.map(tagId =>
          prisma.materialTag.create({ data: { materialId: existing.id, tagId } })
        ),
      ]);
    }

    const updated = await prisma.material.update({
      where: { toolId },
      data: updateData,
      include: {
        collection: { select: { id: true, name: true, color: true } },
        tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
      },
    });

    logger.info('Material patched', { toolId, fields: Object.keys(updateData), tagCount: tagIds?.length });

    return NextResponse.json({
      success: true,
      material: {
        ...updated,
        tags: updated.tags.map(mt => mt.tag),
        content: content || JSON.parse(updated.content),
      },
    });
  } catch (error) {
    logger.error('Failed to update material', { error: String(error) });
    return NextResponse.json({ error: 'Failed to update material' }, { status: 500 });
  }
}

/**
 * DELETE /api/materials
 * Soft-delete a material (sets status to 'deleted')
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const toolId = searchParams.get('toolId');

    if (!toolId) {
      return NextResponse.json({ error: 'Missing toolId parameter' }, { status: 400 });
    }

    const existing = await prisma.material.findUnique({
      where: { toolId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    await prisma.material.update({
      where: { toolId },
      data: { status: 'deleted' },
    });

    logger.info('Material deleted', { toolId });

    return NextResponse.json({
      success: true,
      toolId,
    });
  } catch (error) {
    logger.error('Failed to delete material', { error: String(error) });
    return NextResponse.json({ error: 'Failed to delete material' }, { status: 500 });
  }
}
