// ============================================================================
// API ROUTE: Single conversation
// GET: Get conversation with messages
// PUT: Update conversation (title, summary, etc.)
// DELETE: Delete conversation
// ============================================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pipe, withSentry, withAuth, withCSRF } from "@/lib/api/middlewares";

export const GET = pipe(
  withSentry("/api/conversations/[id]"),
  withAuth,
)(async (ctx) => {
  const { id } = await ctx.params;
  const userId = ctx.userId!;

  const conversation = await prisma.conversation.findFirst({
    where: { id, userId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 100, // Limit messages, use pagination for more
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
    ...conversation,
    topics: JSON.parse(conversation.topics || "[]"),
    keyFacts: conversation.keyFacts ? JSON.parse(conversation.keyFacts) : null,
  });
});

export const PUT = pipe(
  withSentry("/api/conversations/[id]"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const { id } = await ctx.params;
  const userId = ctx.userId!;

  // Verify ownership
  const existing = await prisma.conversation.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }

  const data = await ctx.req.json();
  const updateData: Record<string, unknown> = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.summary !== undefined) updateData.summary = data.summary;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.topics !== undefined) {
    updateData.topics = JSON.stringify(data.topics);
  }
  if (data.keyFacts !== undefined) {
    updateData.keyFacts = JSON.stringify(data.keyFacts);
  }

  const conversation = await prisma.conversation.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({
    ...conversation,
    topics: JSON.parse(conversation.topics || "[]"),
    keyFacts: conversation.keyFacts ? JSON.parse(conversation.keyFacts) : null,
  });
});

export const DELETE = pipe(
  withSentry("/api/conversations/[id]"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const { id } = await ctx.params;
  const userId = ctx.userId!;

  // Verify ownership
  const existing = await prisma.conversation.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }

  await prisma.conversation.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
});
