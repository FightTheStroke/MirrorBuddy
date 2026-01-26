// ============================================================================
// API ROUTE: Publish tool events
// Called by AI/Maestri to broadcast tool creation updates
// Events are sent to all SSE-connected clients in the session
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/db";
import {
  broadcastToolEvent,
  getSessionClientCount,
  type ToolEvent,
  type ToolEventType,
  type ToolType,
} from "@/lib/realtime/tool-events";
import {
  validateAuth,
  validateSessionOwnership,
} from "@/lib/auth/session-auth";
import { requireCSRF } from "@/lib/security/csrf";
import {
  checkRateLimitAsync,
  getRateLimitIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

// Validate tool event type
const VALID_EVENT_TYPES: ToolEventType[] = [
  "tool:created",
  "tool:update",
  "tool:complete",
  "tool:error",
  "tool:cancelled",
];

// Validate tool type
const VALID_TOOL_TYPES: ToolType[] = [
  "mindmap",
  "flashcard",
  "quiz",
  "summary",
  "timeline",
  "diagram",
  "demo",
];

interface PublishEventRequest {
  sessionId: string;
  maestroId: string;
  type: ToolEventType;
  toolType: ToolType;
  toolId?: string;
  data: {
    title?: string;
    subject?: string;
    chunk?: string;
    progress?: number;
    content?: unknown;
    error?: string;
  };
}

/**
 * Publish a tool event to connected clients
 *
 * Body:
 * - sessionId: Session to broadcast to
 * - maestroId: Which Maestro is creating the tool
 * - type: Event type (tool:created, tool:update, etc.)
 * - toolType: Type of tool being created
 * - toolId: Optional. ID of the tool (generated if not provided)
 * - data: Event-specific data
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

    const body: PublishEventRequest = await request.json();
    const { sessionId, maestroId, type, toolType, toolId, data } = body;

    // Validate required fields
    if (!sessionId || !maestroId || !type || !toolType) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["sessionId", "maestroId", "type", "toolType"],
        },
        { status: 400 },
      );
    }

    // Validate event type
    if (!VALID_EVENT_TYPES.includes(type)) {
      return NextResponse.json(
        {
          error: "Invalid event type",
          validTypes: VALID_EVENT_TYPES,
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

    // Verify session ownership (authenticated or trial)
    const auth = await validateAuth();
    let userId: string | null = null;

    if (auth.authenticated && auth.userId) {
      userId = auth.userId;
      const ownsSession = await validateSessionOwnership(
        sessionId,
        auth.userId,
      );
      if (!ownsSession) {
        return NextResponse.json(
          { error: "Session access denied" },
          { status: 403 },
        );
      }
    } else {
      const cookieStore = await cookies();
      const visitorId = cookieStore.get("mirrorbuddy-visitor-id")?.value;

      if (!visitorId) {
        return NextResponse.json({ error: "Invalid session" }, { status: 401 });
      }

      const trialSession = await prisma.trialSession.findFirst({
        where: {
          id: sessionId,
          visitorId: visitorId,
        },
        select: { id: true },
      });

      if (!trialSession) {
        return NextResponse.json(
          { error: "Session access denied" },
          { status: 403 },
        );
      }
    }

    const rateLimitIdentifier = getRateLimitIdentifier(request, userId);
    const rateLimitResult = await checkRateLimitAsync(
      `tools:events:${rateLimitIdentifier}`,
      RATE_LIMITS.GENERAL,
    );
    if (!rateLimitResult.success) {
      logger.warn("Tool events rate limited", {
        identifier: rateLimitIdentifier,
      });
      return rateLimitResponse(rateLimitResult);
    }

    // Validate maestro ID format
    if (!/^[a-zA-Z0-9_-]{1,32}$/.test(maestroId)) {
      return NextResponse.json(
        { error: "Invalid maestroId format" },
        { status: 400 },
      );
    }

    // Validate progress range if provided
    if (data.progress !== undefined) {
      if (
        typeof data.progress !== "number" ||
        data.progress < 0 ||
        data.progress > 100
      ) {
        return NextResponse.json(
          { error: "Progress must be a number between 0 and 100" },
          { status: 400 },
        );
      }
    }

    // Check if there are connected clients
    const clientCount = getSessionClientCount(sessionId);
    if (clientCount === 0) {
      logger.warn("No SSE clients connected for session", { sessionId });
      // Still accept the event, just warn
    }

    // Build event
    const event: ToolEvent = {
      id: toolId || `tool_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      type,
      toolType,
      sessionId,
      maestroId,
      timestamp: Date.now(),
      data,
    };

    // Broadcast to all connected clients in session
    broadcastToolEvent(event);

    logger.info("Tool event published", {
      eventId: event.id,
      type,
      toolType,
      sessionId,
      maestroId,
      clientsReached: clientCount,
    });

    return NextResponse.json({
      success: true,
      eventId: event.id,
      clientsReached: clientCount,
    });
  } catch (error) {
    logger.error("Failed to publish tool event", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to publish event" },
      { status: 500 },
    );
  }
}

/**
 * Get event publishing info
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/tools/events",
    method: "POST",
    description: "Publish tool creation events to SSE clients",
    eventTypes: VALID_EVENT_TYPES,
    toolTypes: VALID_TOOL_TYPES,
    example: {
      sessionId: "session_abc123",
      maestroId: "archimede",
      type: "tool:created",
      toolType: "mindmap",
      data: {
        title: "La Rivoluzione Francese",
        subject: "storia",
      },
    },
  });
}
