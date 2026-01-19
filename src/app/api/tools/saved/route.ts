/**
 * API Route: Saved Tools
 *
 * CRUD operations for user's saved tools.
 * Issue #22: Materials Archive - Tool Storage API
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  saveTool,
  getUserTools,
  getToolById,
  deleteTool,
} from "@/lib/tools/tool-persistence-crud";
import {
  updateToolRating,
  toggleBookmark,
  incrementViewCount,
  getToolStats,
  type SaveToolParams,
} from "@/lib/tools/tool-persistence-utils";
import {
  buildGetToolsFilter,
  validateSaveToolInput,
  validatePatchToolInput,
  validateDeleteToolInput,
} from "./helpers";
import { requireCSRF } from "@/lib/security/csrf";
import { requireAuthenticatedUser } from "@/lib/auth/session-auth";

/**
 * GET /api/tools/saved
 *
 * Get user's saved tools with optional filtering.
 * Security: userId is taken from authenticated session, not query params
 *
 * Query params:
 * - type: Filter by tool type
 * - maestroId: Filter by maestro
 * - bookmarked: Filter bookmarked only
 * - limit: Max results (default 50)
 * - offset: Pagination offset
 * - stats: If 'true', return stats instead of tools
 */
export async function GET(request: NextRequest) {
  try {
    // Security: Get userId from authenticated session only
    const { userId, errorResponse } = await requireAuthenticatedUser();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);

    if (searchParams.get("stats") === "true") {
      const stats = await getToolStats(userId!);
      return NextResponse.json({ stats });
    }

    const filter = buildGetToolsFilter(searchParams);
    const tools = await getUserTools(userId!, filter);

    return NextResponse.json({
      tools,
      count: tools.length,
      filter,
    });
  } catch (error) {
    logger.error("Failed to get saved tools", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to get saved tools" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/tools/saved
 *
 * Save a new tool.
 * Security: userId is taken from authenticated session, not request body
 */
export async function POST(request: NextRequest) {
  try {
    // F-02: CSRF check - prevent cross-site request forgery
    if (!requireCSRF(request)) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 },
      );
    }

    // Security: Get userId from authenticated session only
    const { userId, errorResponse } = await requireAuthenticatedUser();
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const validation = validateSaveToolInput(body);

    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { error: validation.error || "Invalid input" },
        { status: 400 },
      );
    }

    const params: SaveToolParams = {
      userId: userId!, // Security: Use session userId, ignore body userId
      type: validation.data.type,
      title: validation.data.title,
      topic: validation.data.topic,
      content: validation.data.content as Record<string, unknown>,
      maestroId: validation.data.maestroId,
      conversationId: validation.data.conversationId,
      sessionId: validation.data.sessionId,
    };

    const tool = await saveTool(params);

    logger.info("Tool saved", {
      toolId: tool.id,
      userId: userId,
      type: validation.data?.type,
      title: validation.data?.title,
    });

    return NextResponse.json({ success: true, tool }, { status: 201 });
  } catch (error) {
    logger.error("Failed to save tool", { error: String(error) });
    return NextResponse.json({ error: "Failed to save tool" }, { status: 500 });
  }
}

/**
 * PATCH /api/tools/saved
 *
 * Update a saved tool (rating, bookmark, view count).
 * Security: userId is taken from authenticated session, not request body
 */
export async function PATCH(request: NextRequest) {
  try {
    // F-02: CSRF check - prevent cross-site request forgery
    if (!requireCSRF(request)) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 },
      );
    }

    // Security: Get userId from authenticated session only
    const { userId, errorResponse } = await requireAuthenticatedUser();
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const validation = validatePatchToolInput(body);

    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { error: validation.error || "Invalid input" },
        { status: 400 },
      );
    }

    const { toolId, action, rating } = validation.data;
    let result;

    switch (action) {
      case "rate":
        result = await updateToolRating(toolId, userId!, rating ?? 0);
        break;

      case "bookmark":
        result = await toggleBookmark(toolId, userId!);
        break;

      case "view":
        await incrementViewCount(toolId, userId!);
        result = await getToolById(toolId, userId!);
        break;
    }

    if (!result) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, tool: result });
  } catch (error) {
    logger.error("Failed to update tool", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to update tool" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/tools/saved
 *
 * Delete a saved tool.
 * Security: userId is taken from authenticated session, not request body
 */
export async function DELETE(request: NextRequest) {
  try {
    // F-02: CSRF check - prevent cross-site request forgery
    if (!requireCSRF(request)) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 },
      );
    }

    // Security: Get userId from authenticated session only
    const { userId, errorResponse } = await requireAuthenticatedUser();
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const validation = validateDeleteToolInput(body);

    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { error: validation.error || "Invalid input" },
        { status: 400 },
      );
    }

    const { toolId } = validation.data;
    const deleted = await deleteTool(toolId, userId!);

    if (!deleted) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    logger.info("Tool deleted", { toolId, userId });
    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    logger.error("Failed to delete tool", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to delete tool" },
      { status: 500 },
    );
  }
}
