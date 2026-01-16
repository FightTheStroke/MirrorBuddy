/**
 * Learning Persistence Helper
 * Handles saving learnings to database
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { Learning } from './summary-types';

/**
 * Save learnings to database
 * Uses $transaction for batch operations to avoid N+1 queries
 */
export async function saveLearnings(
  userId: string,
  maestroId: string,
  learnings: Learning[],
  userSchoolLevel?: string
): Promise<void> {
  if (learnings.length === 0) return;

  // Batch fetch existing learnings in a single query
  const existingLearnings = await prisma.learning.findMany({
    where: {
      userId,
      OR: learnings.map((l) => ({
        category: l.category,
        insight: l.insight,
      })),
    },
  });

  // Create a map for quick lookup
  const existingMap = new Map(
    existingLearnings.map((e) => [`${e.category}:${e.insight}`, e])
  );

  // Separate into updates and creates
  const updates: Array<{ id: string; confidence: number; occurrences: number }> = [];
  const creates: Array<{
    userId: string;
    maestroId: string;
    subject: string | undefined;
    category: string;
    insight: string;
    confidence: number;
  }> = [];

  for (const learning of learnings) {
    const key = `${learning.category}:${learning.insight}`;
    const existing = existingMap.get(key);

    if (existing) {
      updates.push({
        id: existing.id,
        confidence: Math.min(1, existing.confidence + learning.confidence * 0.1),
        occurrences: existing.occurrences + 1,
      });
    } else {
      creates.push({
        userId,
        maestroId,
        subject: userSchoolLevel,
        category: learning.category,
        insight: learning.insight,
        confidence: learning.confidence,
      });
    }
  }

  // Execute all operations in a single transaction
  await prisma.$transaction([
    // Batch updates
    ...updates.map((u) =>
      prisma.learning.update({
        where: { id: u.id },
        data: { confidence: u.confidence, occurrences: u.occurrences },
      })
    ),
    // Batch create
    ...(creates.length > 0
      ? [prisma.learning.createMany({ data: creates })]
      : []),
  ]);

  logger.info('Learnings saved', { userId, count: learnings.length });
}
