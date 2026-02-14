// ============================================================================
// API ROUTE: Conversation Memory
// GET: Load previous conversation context for a user-maestro pair
// ADR: 0021-conversational-memory-injection.md
// ============================================================================

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  loadPreviousContext,
  formatRelativeDate,
} from "@/lib/conversation/memory-loader";
import { logger } from "@/lib/logger";
import { pipe, withSentry, withAuth } from "@/lib/api/middlewares";

// Zod schema for query parameter validation

export const revalidate = 0;
const MemoryQuerySchema = z.object({
  maestroId: z.string().min(1).max(100),
});

/**
 * GET /api/conversations/memory?maestroId=xxx
 *
 * Returns conversation memory for the current user and specified maestro.
 * Used by the frontend to inject context into new conversations.
 *
 * Security:
 * - Validates mirrorbuddy-user-id cookie (auth)
 * - Validates maestroId query parameter (input validation)
 * - Uses Prisma for parameterized queries (SQL injection prevention)
 */
export const GET = pipe(
  withSentry("/api/conversations/memory"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  // Input validation with Zod
  const { searchParams } = new URL(ctx.req.url);
  const maestroId = searchParams.get("maestroId");

  const validation = MemoryQuerySchema.safeParse({ maestroId });
  if (!validation.success) {
    logger.warn("Memory API: Invalid input", {
      userId,
      errors: validation.error.issues,
    });
    return NextResponse.json(
      {
        error: "Invalid request",
        details: validation.error.issues.map((e) => e.message),
      },
      { status: 400 },
    );
  }

  // Load memory using the library function (uses Prisma parameterized queries)
  const memory = await loadPreviousContext(userId, validation.data.maestroId);

  // Audit logging
  logger.info("Memory API: Context loaded", {
    userId,
    maestroId: validation.data.maestroId,
    hasSummary: !!memory.recentSummary,
    keyFactCount: memory.keyFacts.length,
    topicCount: memory.topics.length,
  });

  // Return formatted response
  return NextResponse.json({
    ...memory,
    lastSessionFormatted: formatRelativeDate(memory.lastSessionDate),
  });
});
