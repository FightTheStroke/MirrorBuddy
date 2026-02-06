// ============================================================================
// API ROUTE: Conversation messages
// GET: Get messages for a conversation
// POST: Add new message
// ============================================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { ToolCall, ToolCallRef } from "@/types/tools";
import { pipe, withSentry, withAuth, withCSRF } from "@/lib/api/middlewares";
import { anonymizeConversationMessage } from "@/lib/privacy/anonymization-service";

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

export const GET = pipe(
  withSentry("/api/conversations/[id]/messages"),
  withAuth,
)(async (ctx) => {
  const { id: conversationId } = await ctx.params;
  const userId = ctx.userId!;

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

  const { searchParams } = new URL(ctx.req.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: limit,
    skip: offset,
  });

  return NextResponse.json(messages);
});

export const POST = pipe(
  withSentry("/api/conversations/[id]/messages"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const { id: conversationId } = await ctx.params;
  const userId = ctx.userId!;

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

  const data = await ctx.req.json();

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

  // Anonymize user messages before storage for privacy protection
  // Assistant messages are not anonymized to preserve response quality
  const contentToStore =
    data.role === "user"
      ? anonymizeConversationMessage(data.content)
      : data.content;

  // Create message and update conversation
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        role: data.role,
        content: contentToStore,
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
});
