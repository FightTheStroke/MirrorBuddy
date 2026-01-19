/**
 * API Route: End Conversation
 *
 * POST /api/conversations/[id]/end
 *
 * Closes a conversation, generates summary, evaluation, and parent note.
 * Part of Session Summary & Unified Archive feature.
 *
 * GDPR Compliance (ADR 0008):
 * - Parent notes are only saved if user has granted parentConsent
 * - Use generateAndSaveParentNote() which includes consent check
 * - No consent = note generation skipped, logged, conversation still ends normally
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session-auth";
import { requireCSRF } from "@/lib/security/csrf";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { endConversationWithSummary } from "@/lib/conversation/summary-generator";
import { inactivityMonitor } from "@/lib/conversation/inactivity-monitor";
import { generateMaestroEvaluation } from "@/lib/session/maestro-evaluation";
import { generateAndSaveParentNote } from "@/lib/session/parent-note-generator";
import { getMaestroById } from "@/data/maestri";
import type { MaestroFull } from "@/data/maestri";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * POST /api/conversations/[id]/end
 *
 * End a conversation and generate summary.
 *
 * Body:
 * - userId: Required for authorization
 * - reason: Optional reason for ending ('explicit' | 'timeout' | 'system')
 */
export async function POST(request: NextRequest, context: RouteParams) {
  try {
    if (!requireCSRF(request)) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 },
      );
    }

    // Security: Get userId from authenticated session only
    const { userId, errorResponse } = await requireAuthenticatedUser();
    if (errorResponse) return errorResponse;

    const { id: conversationId } = await context.params;
    const body = await request.json();
    const { reason = "explicit" } = body;

    // Verify conversation exists and belongs to user
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: userId!,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    if (!conversation.isActive) {
      return NextResponse.json(
        { error: "Conversation already closed" },
        { status: 400 },
      );
    }

    // Stop inactivity tracking
    inactivityMonitor.stopTracking(conversationId);

    // Generate summary
    const result = await endConversationWithSummary(conversationId);

    if (!result) {
      return NextResponse.json(
        { error: "Failed to generate summary" },
        { status: 500 },
      );
    }

    // Generate parent note (non-blocking - don't fail conversation end if this fails)
    try {
      // Fetch conversation with messages for evaluation
      const conversationWithMessages = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (
        conversationWithMessages &&
        conversationWithMessages.messages.length > 0
      ) {
        // Calculate session duration (in minutes)
        const startTime = conversationWithMessages.createdAt;
        const endTime = new Date();
        const durationMinutes = Math.max(
          1,
          Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)),
        );

        // Get maestro name
        const maestro: MaestroFull | undefined = getMaestroById(
          conversation.maestroId,
        );
        const maestroName = maestro?.name || "Maestro";

        // Determine subject from maestro or use default
        const subject = maestro?.subject || "Studio generale";

        // Generate maestro evaluation
        const messages = conversationWithMessages.messages.map(
          (m: (typeof conversationWithMessages.messages)[number]) => ({
            role: m.role,
            content: m.content,
          }),
        );

        const evaluation = await generateMaestroEvaluation(messages);

        // Generate and save parent note (with GDPR consent check - ADR 0008)
        // This will skip generation if user hasn't granted parent consent
        const parentNoteId = await generateAndSaveParentNote(
          {
            sessionId: conversationId,
            userId: userId!,
            maestroId: conversation.maestroId,
            maestroName,
            subject,
            duration: durationMinutes,
            topics: result.topics,
            summary: result.summary,
          },
          evaluation,
        );

        if (parentNoteId) {
          logger.info("Parent note generated and saved", {
            conversationId,
            userId,
            parentNoteId,
            duration: durationMinutes,
          });
        }
      }
    } catch (error) {
      // Log error but don't block conversation end
      logger.error("Failed to generate parent note (non-blocking)", {
        conversationId,
        error: String(error),
      });
    }

    logger.info("Conversation ended", {
      conversationId,
      userId,
      reason,
      summaryLength: result.summary.length,
      topicsCount: result.topics.length,
    });

    return NextResponse.json({
      success: true,
      conversationId,
      reason,
      summary: result.summary,
      topics: result.topics,
      learningsCount: result.learningsCount,
    });
  } catch (error) {
    logger.error("Failed to end conversation", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to end conversation" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/conversations/[id]/end
 *
 * Get the summary for a closed conversation.
 */
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    // Security: Get userId from authenticated session only
    const { userId, errorResponse } = await requireAuthenticatedUser();
    if (errorResponse) return errorResponse;

    const { id: conversationId } = await context.params;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: userId!,
      },
      select: {
        id: true,
        maestroId: true,
        isActive: true,
        summary: true,
        keyFacts: true,
        topics: true,
        updatedAt: true,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      conversationId: conversation.id,
      maestroId: conversation.maestroId,
      isActive: conversation.isActive,
      summary: conversation.summary,
      keyFacts: conversation.keyFacts
        ? JSON.parse(conversation.keyFacts)
        : null,
      topics: JSON.parse(conversation.topics),
      closedAt: conversation.isActive ? null : conversation.updatedAt,
    });
  } catch (error) {
    logger.error("Failed to get conversation summary", {
      error: String(error),
    });
    return NextResponse.json(
      { error: "Failed to get conversation summary" },
      { status: 500 },
    );
  }
}
