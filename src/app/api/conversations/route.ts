// ============================================================================
// API ROUTE: Conversations
// GET: List all conversations
// POST: Create new conversation
// ============================================================================

import { NextResponse } from "next/server";
import { prisma, isDatabaseNotInitialized } from "@/lib/db";
import { logger } from "@/lib/logger";
import { ConversationCreateSchema } from "@/lib/validation/schemas/conversations";
import type { Conversation, Message } from "@prisma/client";
import { pipe, withSentry, withAuth, withCSRF } from "@/lib/api/middlewares";

export const GET = pipe(
  withSentry("/api/conversations"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const { searchParams } = new URL(ctx.req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const maestroId = searchParams.get("maestroId");
  const activeOnly = searchParams.get("active") === "true";

  const where = {
    userId,
    ...(maestroId && { maestroId }),
    ...(activeOnly && { isActive: true }),
  };

  try {
    // Get total count for pagination
    const total = await prisma.conversation.count({ where });

    // Calculate offset
    const offset = (page - 1) * limit;

    const conversations = await prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: offset,
      take: limit,
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const items = conversations.map(
      (c: Conversation & { messages: Message[] }) => ({
        ...c,
        topics: JSON.parse(c.topics || "[]"),
        keyFacts: c.keyFacts ? JSON.parse(c.keyFacts) : null,
        lastMessage: c.messages[0]?.content?.slice(0, 100),
        messages: undefined, // Remove full messages from list
      }),
    );

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    logger.error("Conversations GET error", { error: String(error) });

    if (isDatabaseNotInitialized(error)) {
      return NextResponse.json(
        {
          error: "Database not initialized",
          message: "Run: npx prisma db push",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Failed to get conversations" },
      { status: 500 },
    );
  }
});

export const POST = pipe(
  withSentry("/api/conversations"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const body = await ctx.req.json();

  // #92: Validate with Zod before processing
  const validation = ConversationCreateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Invalid conversation data",
        details: validation.error.issues.map((i) => i.message),
      },
      { status: 400 },
    );
  }

  const data = validation.data;

  const conversation = await prisma.conversation.create({
    data: {
      userId,
      maestroId: data.maestroId,
      title: data.title,
    },
  });

  return NextResponse.json({
    ...conversation,
    topics: JSON.parse(conversation.topics || "[]"),
  });
});
