/**
 * API Route: Create Tool
 *
 * Creates a new tool from voice commands and broadcasts events.
 * Part of I-02: Voice Tool Commands.
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAuth } from "@/lib/api/middlewares";
import { logger } from "@/lib/logger";
import {
  createToolState,
  updateToolState,
  completeToolState,
} from "@/lib/realtime/tool-state";
import { broadcastToolEvent, type ToolType } from "@/lib/realtime/tool-events";
import { validateSessionOwnership } from "@/lib/auth";
import { canAccessFullFeatures } from "@/lib/compliance/coppa-service";
import {
  checkRateLimitAsync,
  getRateLimitIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

// Valid tool types
const VALID_TOOL_TYPES: ToolType[] = [
  "mindmap",
  "flashcard",
  "quiz",
  "summary",
  "timeline",
  "diagram",
  "demo",
];

interface CreateToolRequest {
  sessionId: string;
  maestroId: string;
  toolType: ToolType;
  title: string;
  subject?: string;
  content: Record<string, unknown>;
}

/**
 * Create a new tool from voice command
 *
 * Body:
 * - sessionId: Current session ID
 * - maestroId: Maestro creating the tool
 * - toolType: Type of tool to create
 * - title: Tool title
 * - subject: Optional subject
 * - content: Tool content/arguments
 */
export const POST = pipe(
  withSentry("/api/tools/create"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  // Rate limiting
  const rateLimitIdentifier = getRateLimitIdentifier(ctx.req, userId);
  const rateLimitResult = await checkRateLimitAsync(
    `tools:create:${rateLimitIdentifier}`,
    RATE_LIMITS.GENERAL,
  );
  if (!rateLimitResult.success) {
    logger.warn("Tool create rate limited", {
      identifier: rateLimitIdentifier,
    });
    return rateLimitResponse(rateLimitResult);
  }

  // COPPA compliance check - under-13 users require parental consent
  const canAccess = await canAccessFullFeatures(userId);
  if (!canAccess) {
    return NextResponse.json(
      {
        error: "Parental consent required",
        code: "COPPA_CONSENT_REQUIRED",
        message:
          "Users under 13 require parental consent to create learning materials.",
      },
      { status: 403 },
    );
  }

  const body: CreateToolRequest = await ctx.req.json();
  const { sessionId, maestroId, toolType, title, subject, content } = body;

  // Validate required fields
  if (!sessionId || !maestroId || !toolType || !title) {
    return NextResponse.json(
      {
        error: "Missing required fields",
        required: ["sessionId", "maestroId", "toolType", "title"],
      },
      { status: 400 },
    );
  }

  // Validate tool type
  if (!VALID_TOOL_TYPES.includes(toolType)) {
    return NextResponse.json(
      {
        error: "Invalid tool type",
        validTypes: VALID_TOOL_TYPES,
      },
      { status: 400 },
    );
  }

  // Validate session ID format
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(sessionId)) {
    return NextResponse.json(
      { error: "Invalid sessionId format" },
      { status: 400 },
    );
  }

  // #83: Verify session ownership - user can only create tools in their own sessions
  const ownsSession = await validateSessionOwnership(sessionId, userId);
  if (!ownsSession) {
    return NextResponse.json(
      { error: "Session not found or access denied" },
      { status: 403 },
    );
  }

  // Generate tool ID
  const toolId = `voice-tool-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

  // Create tool state
  const toolState = createToolState({
    id: toolId,
    type: toolType,
    sessionId,
    maestroId,
    title,
    subject,
  });

  // Broadcast tool:created event
  broadcastToolEvent({
    id: toolId,
    type: "tool:created",
    toolType,
    sessionId,
    maestroId,
    timestamp: Date.now(),
    data: {
      title,
      subject,
    },
  });

  logger.info("Tool created from voice command", {
    toolId,
    toolType,
    sessionId,
    maestroId,
    title,
  });

  // If content is provided, update the tool state with it
  if (content && Object.keys(content).length > 0) {
    updateToolState(toolId, {
      content,
      progress: 50,
    });

    // Broadcast progress update
    broadcastToolEvent({
      id: toolId,
      type: "tool:update",
      toolType,
      sessionId,
      maestroId,
      timestamp: Date.now(),
      data: {
        progress: 50,
      },
    });
  }

  // Complete the tool (for voice commands, content is usually complete)
  // Cast through unknown since voice content may not exactly match ToolContent types
  completeToolState(
    toolId,
    content as unknown as Parameters<typeof completeToolState>[1],
  );

  // Broadcast completion
  broadcastToolEvent({
    id: toolId,
    type: "tool:complete",
    toolType,
    sessionId,
    maestroId,
    timestamp: Date.now(),
    data: {
      content,
    },
  });

  return NextResponse.json({
    success: true,
    toolId,
    toolType,
    status: toolState.status,
  });
});

/**
 * Get tool creation info
 */
export const GET = pipe(withSentry("/api/tools/create"))(async () => {
  return NextResponse.json({
    endpoint: "/api/tools/create",
    method: "POST",
    description: "Create a tool from voice command",
    toolTypes: VALID_TOOL_TYPES,
    example: {
      sessionId: "session_abc123",
      maestroId: "archimede",
      toolType: "mindmap",
      title: "I Teoremi di Pitagora",
      subject: "mathematics",
      content: {
        title: "I Teoremi di Pitagora",
        topic: "Teoremi fondamentali della geometria",
        nodes: [
          { id: "1", label: "Teorema di Pitagora", parentId: null },
          { id: "2", label: "a² + b² = c²", parentId: "1" },
        ],
      },
    },
  });
});
