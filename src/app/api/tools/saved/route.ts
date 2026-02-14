/**
 * API Route: Saved Tools
 *
 * CRUD operations for user's saved tools.
 * Issue #22: Materials Archive - Tool Storage API
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAuth } from "@/lib/api/middlewares";
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

export const revalidate = 0;
export const GET = pipe(
  withSentry("/api/tools/saved"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;
  const { searchParams } = new URL(ctx.req.url);

  if (searchParams.get("stats") === "true") {
    const stats = await getToolStats(userId);
    return NextResponse.json({ stats });
  }

  const filter = buildGetToolsFilter(searchParams);
  const tools = await getUserTools(userId, filter);

  return NextResponse.json({
    tools,
    count: tools.length,
    filter,
  });
});

/**
 * POST /api/tools/saved
 *
 * Save a new tool.
 * Security: userId is taken from authenticated session, not request body
 */
export const POST = pipe(
  withSentry("/api/tools/saved"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const body = await ctx.req.json();
  const validation = validateSaveToolInput(body);

  if (!validation.valid || !validation.data) {
    return NextResponse.json(
      { error: validation.error || "Invalid input" },
      { status: 400 },
    );
  }

  const params: SaveToolParams = {
    userId: userId, // Security: Use session userId, ignore body userId
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
});

/**
 * PATCH /api/tools/saved
 *
 * Update a saved tool (rating, bookmark, view count).
 * Security: userId is taken from authenticated session, not request body
 */
export const PATCH = pipe(
  withSentry("/api/tools/saved"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const body = await ctx.req.json();
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
      result = await updateToolRating(toolId, userId, rating ?? 0);
      break;

    case "bookmark":
      result = await toggleBookmark(toolId, userId);
      break;

    case "view":
      await incrementViewCount(toolId, userId);
      result = await getToolById(toolId, userId);
      break;
  }

  if (!result) {
    return NextResponse.json({ error: "Tool not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, tool: result });
});

/**
 * DELETE /api/tools/saved
 *
 * Delete a saved tool.
 * Security: userId is taken from authenticated session, not request body
 */
export const DELETE = pipe(
  withSentry("/api/tools/saved"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const body = await ctx.req.json();
  const validation = validateDeleteToolInput(body);

  if (!validation.valid || !validation.data) {
    return NextResponse.json(
      { error: validation.error || "Invalid input" },
      { status: 400 },
    );
  }

  const { toolId } = validation.data;
  const deleted = await deleteTool(toolId, userId);

  if (!deleted) {
    return NextResponse.json({ error: "Tool not found" }, { status: 404 });
  }

  logger.info("Tool deleted", { toolId, userId });
  return NextResponse.json({ success: true, deleted: true });
});
