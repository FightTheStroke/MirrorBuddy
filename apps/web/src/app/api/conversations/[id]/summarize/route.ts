// ============================================================================
// API ROUTE: Conversation summarization
// POST: Trigger LLM summarization of old messages
// AI config managed via tierService in called functions (ADR 0073)
// ============================================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma, Learning } from "@prisma/client";
import {
  generateConversationSummary,
  extractKeyFacts,
  extractTopics,
  extractLearnings,
} from "@/lib/ai/server";
import { pipe, withSentry, withAuth, withCSRF } from "@/lib/api/middlewares";

// Minimum messages before summarization

export const revalidate = 0;
const MIN_MESSAGES_FOR_SUMMARY = 20;
// Keep last N messages after summarization
const MESSAGES_TO_KEEP = 10;

export const POST = pipe(
  withSentry("/api/conversations/[id]/summarize"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const { id } = await ctx.params;
  const userId = ctx.userId!;

  // Get conversation with all messages
  const conversation = await prisma.conversation.findFirst({
    where: { id, userId },
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

  // Check if summarization is needed
  if (conversation.messages.length < MIN_MESSAGES_FOR_SUMMARY) {
    return NextResponse.json({
      skipped: true,
      reason: `Only ${conversation.messages.length} messages, need at least ${MIN_MESSAGES_FOR_SUMMARY}`,
    });
  }

  // Split messages: to summarize vs to keep
  const toSummarize = conversation.messages.slice(0, -MESSAGES_TO_KEEP);
  const toKeep = conversation.messages.slice(-MESSAGES_TO_KEEP);

  // Format messages for LLM
  const formattedMessages = toSummarize.map(
    (m: (typeof toSummarize)[number]) => ({
      role: m.role,
      content: m.content,
    }),
  );

  // Generate summary and extract insights in parallel
  // Functions use tierService internally for AI config (ADR 0073)
  const [summary, keyFacts, topics, learnings] = await Promise.all([
    generateConversationSummary(formattedMessages, userId),
    extractKeyFacts(formattedMessages, userId),
    extractTopics(formattedMessages, userId),
    extractLearnings(
      formattedMessages,
      conversation.maestroId,
      undefined, // subject not yet implemented
      userId,
    ),
  ]);

  // Build combined summary
  const combinedSummary = conversation.summary
    ? `${conversation.summary}\n\n---\n\n${summary}`
    : summary;

  // Transaction: delete old messages, update conversation, save learnings
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Delete summarized messages
    await tx.message.deleteMany({
      where: {
        id: {
          in: toSummarize.map((m: (typeof toSummarize)[number]) => m.id),
        },
      },
    });

    // Update conversation with summary
    await tx.conversation.update({
      where: { id },
      data: {
        summary: combinedSummary,
        keyFacts: JSON.stringify(keyFacts),
        topics: JSON.stringify(topics),
        messageCount: toKeep.length,
      },
    });

    // Save extracted learnings using batch operations to avoid N+1
    if (learnings.length > 0) {
      const categories = [...new Set(learnings.map((l) => l.category))];
      const existingLearnings = await tx.learning.findMany({
        where: { userId, category: { in: categories } },
      });

      const existingMap = new Map(
        existingLearnings.map((e: Learning) => [
          `${e.category}:${e.insight.slice(0, 30)}`,
          e,
        ]),
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
            confidence: learning.confidence,
          });
        }
      }

      // Batch updates and creates
      await Promise.all(
        toUpdate.map((u) =>
          tx.learning.update({
            where: { id: u.id },
            data: { confidence: u.confidence, occurrences: u.occurrences },
          }),
        ),
      );

      if (toCreate.length > 0) {
        await tx.learning.createMany({ data: toCreate });
      }
    }
  });

  return NextResponse.json({
    summarized: toSummarize.length,
    kept: toKeep.length,
    topics,
    learningsExtracted: learnings.length,
  });
});
