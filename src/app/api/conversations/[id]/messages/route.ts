// ============================================================================
// API ROUTE: Conversation messages
// GET: Get messages for a conversation
// POST: Add new message
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth/session-auth";
import { requireCSRF } from "@/lib/security/csrf";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { ToolCall, ToolCallRef } from "@/types/tools";

/**
 * Convert full ToolCall to lightweight ToolCallRef for DB storage.
 * Strips result.data to avoid duplicating Material content.
 */
function toToolCallRefForStorage(toolCall: ToolCall): ToolCallRef {
  return {
    id: toolCall.id,
    type: toolCall.type,
    name: toolCall.name,
    status: toolCall.status,
    error: toolCall.result?.error,
    materialId: toolCall.id, // toolId is used as materialId
  };
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await validateAuth();
    const { id: conversationId } = await params;

    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    // Verify conversation ownership
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: limit,
      skip: offset,
    });

    return NextResponse.json(messages);
  } catch (error) {
    logger.error("Messages GET error", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to get messages" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    if (!requireCSRF(request)) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 },
      );
    }

    const auth = await validateAuth();
    const { id: conversationId } = await params;

    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    // Verify conversation ownership
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const data = await request.json();

    if (!data.role || !data.content) {
      return NextResponse.json(
        { error: "role and content are required" },
        { status: 400 },
      );
    }

    // Convert full ToolCalls to lightweight ToolCallRefs for storage
    // This avoids duplicating content that's already in Material table
    let toolCallsForStorage: string | null = null;
    if (data.toolCalls && Array.isArray(data.toolCalls)) {
      const refs = data.toolCalls.map((tc: ToolCall) =>
        toToolCallRefForStorage(tc),
      );
      toolCallsForStorage = JSON.stringify(refs);
    }

    // Create message and update conversation
    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId,
          role: data.role,
          content: data.content,
          toolCalls: toolCallsForStorage,
          tokenCount: data.tokenCount,
        },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: {
          messageCount: { increment: 1 },
          lastMessageAt: new Date(),
          // Update title from first user message if not set
          ...(conversation.title === null &&
            data.role === "user" && {
              title: data.content.slice(0, 50),
            }),
        },
      }),
    ]);

    return NextResponse.json(message);
  } catch (error) {
    logger.error("Messages POST error", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 },
    );
  }
}
