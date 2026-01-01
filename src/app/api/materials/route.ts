/**
 * API Route: Materials
 *
 * Persists tool outputs (mindmaps, quizzes, flashcards, etc.) to database.
 * Part of T-20: Persist tools to database + API.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { generateSearchableText } from '@/lib/search/searchable-text';
import type { ToolType } from '@/types/tools';

// Material types for storage (maps from ToolType actions to stored types)
type MaterialType =
  | 'mindmap'
  | 'quiz'
  | 'flashcard'
  | 'demo'
  | 'webcam'
  | 'pdf'
  | 'search'
  | 'diagram'
  | 'timeline'
  | 'summary'
  | 'formula'
  | 'chart';

// Valid material types
const VALID_MATERIAL_TYPES: MaterialType[] = [
  'mindmap',
  'quiz',
  'flashcard',
  'demo',
  'webcam',
  'pdf',
  'search',
  'diagram',
  'timeline',
  'summary',
  'formula',
  'chart',
];

interface CreateMaterialRequest {
  toolId: string;
  toolType: MaterialType;
  title: string;
  content: Record<string, unknown>;
  maestroId?: string;
  sessionId?: string;
  subject?: string;
  preview?: string;
}

interface UpdateMaterialRequest {
  title?: string;
  content?: Record<string, unknown>;
  status?: 'active' | 'archived' | 'deleted';
  // User interaction (Issue #37 - Archive features)
  userRating?: number;
  isBookmarked?: boolean;
}

/**
 * GET /api/materials
 * List materials for current user with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check - prefer cookie, fallback to query param for backwards compatibility
    const cookieStore = await cookies();
    const cookieUserId = cookieStore.get('convergio-user-id')?.value;

    const { searchParams } = new URL(request.url);
    const queryUserId = searchParams.get('userId');
    const userId = cookieUserId || queryUserId;

    const toolType = searchParams.get('toolType');
    const status = searchParams.get('status') || 'active';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const where: Record<string, unknown> = { userId, status };
    if (toolType && VALID_MATERIAL_TYPES.includes(toolType as MaterialType)) {
      where.toolType = toolType;
    }

    const [materials, total] = await Promise.all([
      prisma.material.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 100),
        skip: offset,
      }),
      prisma.material.count({ where }),
    ]);

    // Parse JSON content for each material
    const parsed = materials.map((m: { content: string; [key: string]: unknown }) => ({
      ...m,
      content: JSON.parse(m.content),
    }));

    return NextResponse.json({
      materials: parsed,
      total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Failed to fetch materials', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch materials' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/materials
 * Create a new material (persist tool output)
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check - prefer cookie, fallback to body for backwards compatibility
    const cookieStore = await cookies();
    const cookieUserId = cookieStore.get('convergio-user-id')?.value;

    const body: CreateMaterialRequest & { userId?: string } = await request.json();
    const userId = cookieUserId || body.userId;
    const { toolId, toolType, title, content, maestroId, sessionId, subject, preview } = body;

    // Validate required fields
    if (!userId || !toolId || !toolType || !title || !content) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['userId', 'toolId', 'toolType', 'title', 'content'],
        },
        { status: 400 }
      );
    }

    // Validate tool type
    if (!VALID_MATERIAL_TYPES.includes(toolType)) {
      return NextResponse.json(
        {
          error: 'Invalid tool type',
          validTypes: VALID_MATERIAL_TYPES,
        },
        { status: 400 }
      );
    }

    // Check for duplicate toolId (upsert behavior)
    const existing = await prisma.material.findUnique({
      where: { toolId },
    });

    // Generate searchable text for full-text search
    const searchableText = generateSearchableText(toolType as ToolType, content);

    if (existing) {
      // Update existing material
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

    // Create new material
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
      },
    });

    logger.info('Material created', { toolId, toolType, userId });

    return NextResponse.json({
      success: true,
      material: {
        ...material,
        content,
      },
      created: true,
    });
  } catch (error) {
    logger.error('Failed to create material', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to create material' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/materials
 * Update a material (title, content, or status)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body: UpdateMaterialRequest & { toolId: string } = await request.json();
    const { toolId, title, content, status, userRating, isBookmarked } = body;

    if (!toolId) {
      return NextResponse.json(
        { error: 'Missing toolId' },
        { status: 400 }
      );
    }

    const existing = await prisma.material.findUnique({
      where: { toolId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (title) updateData.title = title;
    if (content) {
      updateData.content = JSON.stringify(content);
      // Regenerate searchable text when content changes
      updateData.searchableText = generateSearchableText(
        existing.toolType as ToolType,
        content
      );
    }
    if (status) updateData.status = status;
    // User interaction fields (Issue #37)
    if (typeof userRating === 'number' && userRating >= 1 && userRating <= 5) {
      updateData.userRating = userRating;
    }
    if (typeof isBookmarked === 'boolean') {
      updateData.isBookmarked = isBookmarked;
    }

    const updated = await prisma.material.update({
      where: { toolId },
      data: updateData,
    });

    logger.info('Material patched', { toolId, fields: Object.keys(updateData) });

    return NextResponse.json({
      success: true,
      material: {
        ...updated,
        content: content || JSON.parse(updated.content),
      },
    });
  } catch (error) {
    logger.error('Failed to update material', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to update material' },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: 'Missing toolId parameter' },
        { status: 400 }
      );
    }

    const existing = await prisma.material.findUnique({
      where: { toolId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      );
    }

    // Soft delete
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
    return NextResponse.json(
      { error: 'Failed to delete material' },
      { status: 500 }
    );
  }
}
