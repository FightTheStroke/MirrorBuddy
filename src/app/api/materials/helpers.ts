/**
 * Materials API helpers
 */

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { isPostgreSQL } from '@/lib/db/database-utils';
import { generateSearchableText } from '@/lib/search/searchable-text';
import type { ToolType } from '@/types/tools';
import type { MaterialType } from './types';
import { VALID_MATERIAL_TYPES } from './constants';

/**
 * Build material list query response with proper type handling
 */
export async function getMaterialsList(
  userId: string,
  filters: {
    toolType?: string;
    status?: string;
    limit: number;
    offset: number;
    collectionId?: string;
    tagId?: string;
    search?: string;
    subject?: string;
  }
) {
  const { toolType, status = 'active', limit, offset, collectionId, tagId, search, subject } = filters;

  // PostgreSQL full-text search optimization
  if (search && isPostgreSQL()) {
    return getMaterialsPostgresSearch(userId, {
      toolType,
      status,
      limit,
      offset,
      collectionId,
      tagId,
      search,
      subject,
    });
  }

  // SQLite fallback or non-search queries
  return getMaterialsStandardQuery(userId, {
    toolType,
    status,
    limit,
    offset,
    collectionId,
    tagId,
    search,
    subject,
  });
}

/**
 * PostgreSQL full-text search for materials
 */
async function getMaterialsPostgresSearch(
  userId: string,
  filters: {
    toolType?: string;
    status: string;
    limit: number;
    offset: number;
    collectionId?: string;
    tagId?: string;
    search: string;
    subject?: string;
  }
) {
  const { toolType, status, limit, offset, collectionId, tagId, search, subject } = filters;
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

  // Fetch related data
  const materialIds = materials.map(m => m.id);
  const collectionIds = materials.map(m => m.collectionId).filter(Boolean) as string[];

  const collections = collectionIds.length > 0
    ? await prisma.collection.findMany({
        where: { id: { in: collectionIds } },
        select: { id: true, name: true, color: true },
      })
    : [];

  const materialTags = materialIds.length > 0
    ? await prisma.materialTag.findMany({
        where: { materialId: { in: materialIds } },
        include: { tag: { select: { id: true, name: true, color: true } } },
      })
    : [];

  const collectionMap = new Map(collections.map(c => [c.id, c]));
  const tagsMap = new Map<string, Array<{ id: string; name: string; color: string | null }>>();
  for (const mt of materialTags) {
    if (!tagsMap.has(mt.materialId)) {
      tagsMap.set(mt.materialId, []);
    }
    tagsMap.get(mt.materialId)?.push(mt.tag);
  }

  return {
    materials: materials.map((m) => ({
      ...m,
      content: JSON.parse(m.content),
      collection: m.collectionId ? collectionMap.get(m.collectionId) || null : null,
      tags: tagsMap.get(m.id) || [],
    })),
    total,
    limit,
    offset,
  };
}

/**
 * Standard Prisma ORM query for materials (SQLite or non-search queries)
 */
async function getMaterialsStandardQuery(
  userId: string,
  filters: {
    toolType?: string;
    status: string;
    limit: number;
    offset: number;
    collectionId?: string;
    tagId?: string;
    search?: string;
    subject?: string;
  }
) {
  const { toolType, status, limit, offset, collectionId, tagId, search, subject } = filters;

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

  return {
    materials: materials.map((m) => ({
      ...m,
      content: JSON.parse(m.content as string),
      tags: m.tags.map((mt) => mt.tag),
    })),
    total,
    limit,
    offset,
  };
}

/**
 * Update material fields
 */
export function buildUpdateData(
  existing: { toolType: string },
  updates: {
    title?: string;
    content?: unknown;
    status?: string;
    userRating?: number;
    isBookmarked?: boolean;
    collectionId?: string | null;
  }
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {};

  if (updates.title) updateData.title = updates.title;

  if (updates.content) {
    updateData.content = JSON.stringify(updates.content);
    updateData.searchableText = generateSearchableText(
      existing.toolType as ToolType,
      updates.content
    );
  }

  if (updates.status) updateData.status = updates.status;

  if (typeof updates.userRating === 'number' && updates.userRating >= 1 && updates.userRating <= 5) {
    updateData.userRating = updates.userRating;
  }

  if (typeof updates.isBookmarked === 'boolean') {
    updateData.isBookmarked = updates.isBookmarked;
  }

  if (updates.collectionId !== undefined) {
    updateData.collectionId = updates.collectionId;
  }

  return updateData;
}

/**
 * Update material tags in a transaction
 */
export async function updateMaterialTags(
  materialId: string,
  tagIds?: string[]
) {
  if (tagIds !== undefined) {
    await prisma.$transaction([
      prisma.materialTag.deleteMany({ where: { materialId } }),
      ...tagIds.map(tagId =>
        prisma.materialTag.create({ data: { materialId, tagId } })
      ),
    ]);
  }
}
