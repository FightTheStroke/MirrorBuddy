// ============================================================================
// API ROUTE: Single Parent-Professor Conversation (Issue #63)
// GET: Get conversation with all messages
// DELETE: Delete conversation
// ============================================================================

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAuth } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export const GET = pipe(
  withSentry("/api/parent-professor/:id"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;
  const { id } = await ctx.params;

  const conversation = await prisma.conversation.findFirst({
    where: {
      id,
      userId,
      isParentMode: true,
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    id: conversation.id,
    maestroId: conversation.maestroId,
    studentId: conversation.studentId,
    title: conversation.title,
    messageCount: conversation.messageCount,
    messages: conversation.messages.map(
      (m: (typeof conversation.messages)[number]) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      }),
    ),
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  });
});

export const DELETE = pipe(
  withSentry("/api/parent-professor/:id"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;
  const { id } = await ctx.params;

  // Verify ownership
  const conversation = await prisma.conversation.findFirst({
    where: {
      id,
      userId,
      isParentMode: true,
    },
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }

  // Delete conversation (messages cascade)
  await prisma.conversation.delete({
    where: { id },
  });

  logger.info("Parent conversation deleted", { conversationId: id, userId });

  return NextResponse.json({ success: true });
});
