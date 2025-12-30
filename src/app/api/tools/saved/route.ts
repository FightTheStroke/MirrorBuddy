/**
 * API Route: Saved Tools
 *
 * CRUD operations for user's saved tools.
 * Issue #22: Materials Archive - Tool Storage API
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  saveTool,
  getUserTools,
  getToolById,
  deleteTool,
  updateToolRating,
  toggleBookmark,
  incrementViewCount,
  getToolStats,
  type SaveToolParams,
  type GetToolsFilter,
} from '@/lib/tools/tool-persistence';
import type { ToolType } from '@/types/tools';

// Valid tool types for validation
const VALID_TOOL_TYPES: ToolType[] = [
  'mindmap',
  'quiz',
  'flashcard',
  'demo',
  'search',
  'diagram',
  'timeline',
  'summary',
  'formula',
  'chart',
  'webcam',
  'pdf',
];

/**
 * GET /api/tools/saved
 *
 * Get user's saved tools with optional filtering.
 *
 * Query params:
 * - userId: Required user ID
 * - type: Filter by tool type
 * - maestroId: Filter by maestro
 * - bookmarked: Filter bookmarked only
 * - limit: Max results (default 50)
 * - offset: Pagination offset
 * - stats: If 'true', return stats instead of tools
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // If stats=true, return statistics
    if (searchParams.get('stats') === 'true') {
      const stats = await getToolStats(userId);
      return NextResponse.json({ stats });
    }

    // Build filter
    const filter: GetToolsFilter = {};

    const type = searchParams.get('type');
    if (type && VALID_TOOL_TYPES.includes(type as ToolType)) {
      filter.type = type as ToolType;
    }

    const maestroId = searchParams.get('maestroId');
    if (maestroId) {
      filter.maestroId = maestroId;
    }

    const bookmarked = searchParams.get('bookmarked');
    if (bookmarked === 'true') {
      filter.isBookmarked = true;
    }

    const limit = searchParams.get('limit');
    if (limit) {
      filter.limit = Math.min(parseInt(limit, 10), 100);
    }

    const offset = searchParams.get('offset');
    if (offset) {
      filter.offset = parseInt(offset, 10);
    }

    const tools = await getUserTools(userId, filter);

    return NextResponse.json({
      tools,
      count: tools.length,
      filter,
    });
  } catch (error) {
    logger.error('Failed to get saved tools', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to get saved tools' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tools/saved
 *
 * Save a new tool.
 *
 * Body:
 * - userId: User ID
 * - type: Tool type
 * - title: Tool title
 * - topic: Optional topic
 * - content: Tool content data
 * - maestroId: Optional maestro ID
 * - conversationId: Optional conversation ID
 * - sessionId: Optional session ID
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, title, topic, content, maestroId, conversationId, sessionId } = body;

    // Validate required fields
    if (!userId || !type || !title || !content) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['userId', 'type', 'title', 'content'],
        },
        { status: 400 }
      );
    }

    // Validate tool type
    if (!VALID_TOOL_TYPES.includes(type as ToolType)) {
      return NextResponse.json(
        {
          error: 'Invalid tool type',
          validTypes: VALID_TOOL_TYPES,
        },
        { status: 400 }
      );
    }

    const params: SaveToolParams = {
      userId,
      type,
      title,
      topic,
      content,
      maestroId,
      conversationId,
      sessionId,
    };

    const tool = await saveTool(params);

    logger.info('Tool saved', {
      toolId: tool.id,
      userId,
      type,
      title,
    });

    return NextResponse.json(
      { success: true, tool },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Failed to save tool', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to save tool' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tools/saved
 *
 * Update a saved tool (rating, bookmark, view count).
 *
 * Body:
 * - userId: User ID
 * - toolId: Tool ID
 * - action: 'rate' | 'bookmark' | 'view'
 * - rating: Required if action is 'rate' (1-5)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, toolId, action, rating } = body;

    // Validate required fields
    if (!userId || !toolId || !action) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['userId', 'toolId', 'action'],
        },
        { status: 400 }
      );
    }

    // Validate action
    if (!['rate', 'bookmark', 'view'].includes(action)) {
      return NextResponse.json(
        {
          error: 'Invalid action',
          validActions: ['rate', 'bookmark', 'view'],
        },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'rate':
        if (typeof rating !== 'number' || rating < 1 || rating > 5) {
          return NextResponse.json(
            { error: 'Rating must be a number between 1 and 5' },
            { status: 400 }
          );
        }
        result = await updateToolRating(toolId, userId, rating);
        break;

      case 'bookmark':
        result = await toggleBookmark(toolId, userId);
        break;

      case 'view':
        await incrementViewCount(toolId, userId);
        result = await getToolById(toolId, userId);
        break;
    }

    if (!result) {
      return NextResponse.json(
        { error: 'Tool not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, tool: result });
  } catch (error) {
    logger.error('Failed to update tool', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to update tool' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tools/saved
 *
 * Delete a saved tool.
 *
 * Body:
 * - userId: User ID
 * - toolId: Tool ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, toolId } = body;

    if (!userId || !toolId) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['userId', 'toolId'],
        },
        { status: 400 }
      );
    }

    const deleted = await deleteTool(toolId, userId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Tool not found' },
        { status: 404 }
      );
    }

    logger.info('Tool deleted', { toolId, userId });

    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    logger.error('Failed to delete tool', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to delete tool' },
      { status: 500 }
    );
  }
}
