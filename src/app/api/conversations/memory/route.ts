// ============================================================================
// API ROUTE: Conversation Memory
// GET: Load previous conversation context for a user-maestro pair
// ADR: 0021-conversational-memory-injection.md
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { loadPreviousContext, formatRelativeDate } from '@/lib/conversation/memory-loader';
import { logger } from '@/lib/logger';

// Zod schema for query parameter validation
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
 * - Validates convergio-user-id cookie (auth)
 * - Validates maestroId query parameter (input validation)
 * - Uses Prisma for parameterized queries (SQL injection prevention)
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Auth check - verify user cookie
    const cookieStore = await cookies();
    const userId = cookieStore.get('convergio-user-id')?.value;

    if (!userId) {
      logger.warn('Memory API: Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Input validation with Zod
    const { searchParams } = new URL(request.url);
    const maestroId = searchParams.get('maestroId');

    const validation = MemoryQuerySchema.safeParse({ maestroId });
    if (!validation.success) {
      logger.warn('Memory API: Invalid input', {
        userId,
        errors: validation.error.issues
      });
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.issues.map(e => e.message)
        },
        { status: 400 }
      );
    }

    // 3. Load memory using the library function (uses Prisma parameterized queries)
    const memory = await loadPreviousContext(userId, validation.data.maestroId);

    // 4. Audit logging
    logger.info('Memory API: Context loaded', {
      userId,
      maestroId: validation.data.maestroId,
      hasSummary: !!memory.recentSummary,
      keyFactCount: memory.keyFacts.length,
      topicCount: memory.topics.length,
    });

    // 5. Return formatted response
    return NextResponse.json({
      ...memory,
      lastSessionFormatted: formatRelativeDate(memory.lastSessionDate),
    });
  } catch (error) {
    logger.error('Memory API: Unexpected error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to load conversation memory' },
      { status: 500 }
    );
  }
}
