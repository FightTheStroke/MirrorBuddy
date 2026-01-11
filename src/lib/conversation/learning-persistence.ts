/**
 * Learning Persistence Helper
 * Handles saving learnings to database
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { Learning } from './summary-types';

/**
 * Save learnings to database
 */
export async function saveLearnings(
  userId: string,
  maestroId: string,
  learnings: Learning[],
  userSchoolLevel?: string
): Promise<void> {
  if (learnings.length === 0) return;

  for (const learning of learnings) {
    // Check if similar learning already exists
    const existing = await prisma.learning.findFirst({
      where: {
        userId,
        category: learning.category,
        insight: learning.insight,
      },
    });

    if (existing) {
      // Update existing - increase confidence and occurrences
      await prisma.learning.update({
        where: { id: existing.id },
        data: {
          confidence: Math.min(1, existing.confidence + learning.confidence * 0.1),
          occurrences: existing.occurrences + 1,
        },
      });
    } else {
      // Create new learning
      await prisma.learning.create({
        data: {
          userId,
          maestroId,
          subject: userSchoolLevel,
          category: learning.category,
          insight: learning.insight,
          confidence: learning.confidence,
        },
      });
    }
  }

  logger.info('Learnings saved', { userId, count: learnings.length });
}
