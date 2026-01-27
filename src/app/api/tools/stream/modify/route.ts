// ============================================================================
// API ROUTE: Mindmap Modification via SSE Broadcast
// Receives voice commands for mindmap modifications and broadcasts to clients
// Part of Phase 7: Voice Commands for Mindmaps
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";
import {
  broadcastToolEvent,
  type MindmapModifyCommand,
  type SummaryModifyCommand,
  type StudentSummaryModifyCommand,
} from "@/lib/realtime/tool-events";
import { nanoid } from "nanoid";
import { requireCSRF } from "@/lib/security/csrf";
import { prisma } from "@/lib/db";
import {
  validateAuth,
  validateSessionOwnership,
} from "@/lib/auth/session-auth";
import {
  checkRateLimitAsync,
  getRateLimitIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { VISITOR_COOKIE_NAME } from "@/lib/auth/cookie-constants";

interface ModifyRequest {
  sessionId: string;
  toolType?: "mindmap" | "summary" | "student_summary";
  command: string;
  args: Record<string, unknown>;
}

const VALID_COMMANDS: MindmapModifyCommand[] = [
  "mindmap_add_node",
  "mindmap_connect_nodes",
  "mindmap_expand_node",
  "mindmap_delete_node",
  "mindmap_focus_node",
  "mindmap_set_color",
];
const SUMMARY_COMMANDS: SummaryModifyCommand[] = [
  "summary_set_title",
  "summary_add_section",
  "summary_update_section",
  "summary_delete_section",
  "summary_add_point",
  "summary_delete_point",
  "summary_finalize",
];
const STUDENT_SUMMARY_COMMANDS: StudentSummaryModifyCommand[] = [
  "student_summary_add_comment",
  "student_summary_remove_comment",
  "student_summary_update_content",
  "student_summary_request_content",
  "student_summary_save",
  "student_summary_complete",
];

const isValidCommand = <T extends string>(
  command: string | undefined,
  validCommands: readonly T[],
): command is T => Boolean(command && validCommands.includes(command as T));

export async function POST(request: NextRequest) {
  try {
    // F-02: CSRF check - prevent cross-site request forgery
    if (!requireCSRF(request)) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 },
      );
    }

    const body: ModifyRequest = await request.json();
    const { sessionId, command, args } = body;
    const toolType = body.toolType ?? "mindmap";

    // Validate required fields
    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 },
      );
    }

    // Validate session ID format (prevent injection)
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(sessionId)) {
      return NextResponse.json(
        { error: "Invalid sessionId format" },
        { status: 400 },
      );
    }

    const validCommands =
      toolType === "mindmap"
        ? VALID_COMMANDS
        : toolType === "summary"
          ? SUMMARY_COMMANDS
          : STUDENT_SUMMARY_COMMANDS;
    if (!isValidCommand(command, validCommands)) {
      return NextResponse.json(
        {
          error: "Invalid command",
          validCommands,
        },
        { status: 400 },
      );
    }
    const typedCommand = command;

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
          { error: "Session not found or access denied" },
          { status: 403 },
        );
      }
    } else {
      const cookieStore = await cookies();
      const visitorId = cookieStore.get(VISITOR_COOKIE_NAME)?.value;
      if (!visitorId) {
        return NextResponse.json({ error: "Invalid session" }, { status: 401 });
      }

      const trialSession = await prisma.trialSession.findFirst({
        where: {
          id: sessionId,
          visitorId,
        },
        select: { id: true },
      });

      if (!trialSession) {
        return NextResponse.json(
          { error: "Session not found or access denied" },
          { status: 403 },
        );
      }
    }

    const rateLimitIdentifier = getRateLimitIdentifier(request, userId);
    const rateLimitResult = await checkRateLimitAsync(
      `tools:modify:${rateLimitIdentifier}`,
      RATE_LIMITS.GENERAL,
    );
    if (!rateLimitResult.success) {
      logger.warn("Tool modification rate limited", {
        identifier: rateLimitIdentifier,
      });
      return rateLimitResponse(rateLimitResult);
    }

    const eventType =
      toolType === "mindmap"
        ? "mindmap:modify"
        : toolType === "summary"
          ? "summary:modify"
          : "student_summary:modify";
    const eventToolType = toolType === "mindmap" ? "mindmap" : "summary";

    // Broadcast the modification event
    broadcastToolEvent({
      id: nanoid(),
      type: eventType,
      toolType: eventToolType,
      sessionId,
      maestroId: "voice", // Voice commands don't have a specific maestro
      timestamp: Date.now(),
      data: {
        command: typedCommand,
        args,
      },
    });

    logger.info("Tool modification broadcast", {
      sessionId,
      command,
      args,
      toolType,
    });

    return NextResponse.json({
      success: true,
      message: "Modification broadcast",
    });
  } catch (error) {
    logger.error("Failed to process mindmap modification", {
      error: String(error),
    });

    return NextResponse.json(
      { error: "Failed to process modification", message: String(error) },
      { status: 500 },
    );
  }
}
