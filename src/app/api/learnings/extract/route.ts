// ============================================================================
// API ROUTE: Extract learnings from conversation
// POST: Analyze recent messages and extract student insights
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { extractLearnings } from "@/lib/ai/summarize";
import type { Message, Prisma } from "@prisma/client";
import { validateAuth } from "@/lib/auth/session-auth";
import { requireCSRF } from "@/lib/security/csrf";

export async function POST(request: NextRequest) {
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    const data = await request.json();

    if (!data.conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 },
      );
    }

    // Get conversation with recent messages
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: data.conversationId,
        userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 20, // Analyze last 20 messages
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    if (conversation.messages.length < 4) {
      return NextResponse.json({
        skipped: true,
        reason: "Not enough messages to extract learnings",
      });
    }

    // Format messages (reverse to chronological order)
    const formattedMessages = conversation.messages
      .reverse()
      .map((m: Message) => ({
        role: m.role,
        content: m.content,
      }));

    // Extract learnings
    const learnings = await extractLearnings(
      formattedMessages,
      conversation.maestroId,
      data.subject,
    );

    if (learnings.length === 0) {
      return NextResponse.json({
        extracted: 0,
        message: "No clear learnings identified from this conversation",
      });
    }

    // Save learnings using batch operations to avoid N+1 queries
    // 1. Batch find existing learnings by category
    const categories = [...new Set(learnings.map((l) => l.category))];
    const existingLearnings = await prisma.learning.findMany({
      where: {
        userId,
        category: { in: categories },
      },
    });

    // 2. Match existing learnings by insight prefix
    const existingMap = new Map(
      existingLearnings.map(
        (e: {
          id: string;
          category: string;
          insight: string;
          confidence: number;
          occurrences: number;
        }) => [`${e.category}:${e.insight.slice(0, 30)}`, e],
      ),
    );

    const toUpdate: Array<{
      id: string;
      confidence: number;
      occurrences: number;
    }> = [];
    const toCreate: Array<{
      userId: string;
      category: string;
      insight: string;
      maestroId: string;
      subject: string;
      confidence: number;
    }> = [];

    for (const learning of learnings) {
      const key = `${learning.category}:${learning.insight.slice(0, 30)}`;
      const existing = existingMap.get(key);

      if (existing) {
        toUpdate.push({
          id: existing.id,
          confidence: Math.min(1, existing.confidence + 0.1),
          occurrences: existing.occurrences + 1,
        });
      } else {
        toCreate.push({
          userId,
          category: learning.category,
          insight: learning.insight,
          maestroId: conversation.maestroId,
          subject: data.subject,
          confidence: learning.confidence,
        });
      }
    }

    // 3. Batch updates and creates in a transaction
    const results = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const updateResults = await Promise.all(
          toUpdate.map((u) =>
            tx.learning.update({
              where: { id: u.id },
              data: { confidence: u.confidence, occurrences: u.occurrences },
            }),
          ),
        );

        const createResults =
          toCreate.length > 0
            ? await tx.learning.createManyAndReturn({ data: toCreate })
            : [];

        return [
          ...updateResults.map((r: Prisma.LearningGetPayload<object>) => ({
            ...r,
            reinforced: true,
          })),
          ...createResults.map((r: Prisma.LearningGetPayload<object>) => ({
            ...r,
            reinforced: false,
          })),
        ];
      },
    );

    return NextResponse.json({
      extracted: results.length,
      learnings: results,
    });
  } catch (error) {
    logger.error("Learnings extract POST error", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to extract learnings" },
      { status: 500 },
    );
  }
}
