/**
 * Cross-Maestro Memory
 *
 * Enables sharing learned concepts across different maestros for Pro users.
 * When a student learns something with one maestro, other maestros can be aware of it.
 *
 * This feature is tier-gated (Pro only) and respects the crossMaestroEnabled flag
 * in tier-memory-config.ts.
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { tierService } from "@/lib/tier/tier-service";
import { getTierMemoryLimits } from "./tier-memory-config";
import { getMaestroById } from "@/data/maestri";
import type { TierName } from "@/types/tier-types";

/**
 * Represents learnings from a specific maestro
 */
export interface CrossMaestroLearning {
  maestroId: string;
  maestroName: string;
  subject: string;
  learnings: string[];
  date: Date;
}

/**
 * Options for loading cross-maestro learnings
 */
export interface LoadOptions {
  /** Maximum number of maestro sessions to return */
  limit?: number;
  /** Filter by specific subjects */
  subjects?: string[];
}

/**
 * Load learned concepts from other maestros for a Pro tier user.
 *
 * This function:
 * 1. Checks if user has Pro tier with crossMaestroEnabled
 * 2. Queries closed conversations from other maestros
 * 3. Extracts learnings from keyFacts
 * 4. Groups by maestro and subject
 * 5. Returns sorted by date (most recent first)
 *
 * @param userId User identifier
 * @param currentMaestroId Current maestro to exclude from results
 * @param options Optional filters (limit, subjects)
 * @returns Array of cross-maestro learnings, empty if not Pro tier
 *
 * @example
 * const learnings = await loadCrossMaestroLearnings(
 *   'user-123',
 *   'euclide-matematica',
 *   { limit: 5, subjects: ['physics', 'chemistry'] }
 * );
 */
export async function loadCrossMaestroLearnings(
  userId: string,
  currentMaestroId: string,
  options?: LoadOptions,
): Promise<CrossMaestroLearning[]> {
  try {
    // Get user's effective tier
    const tier = await tierService.getEffectiveTier(userId);
    const tierName = tier.code as TierName;

    // Check if cross-maestro memory is enabled for this tier
    const memoryLimits = getTierMemoryLimits(tierName);
    if (!memoryLimits.crossMaestroEnabled) {
      logger.debug("Cross-maestro memory disabled for tier", {
        userId,
        tierName,
      });
      return [];
    }

    // Build query to get conversations from other maestros
    const conversations = await prisma.conversation.findMany({
      where: {
        userId,
        isActive: false, // Only closed conversations
        maestroId: {
          not: currentMaestroId, // Exclude current maestro
        },
      },
      orderBy: {
        updatedAt: "desc", // Most recent first
      },
      take: options?.limit || 10, // Default limit
      select: {
        maestroId: true,
        keyFacts: true,
        updatedAt: true,
      },
    });

    if (conversations.length === 0) {
      logger.debug("No cross-maestro conversations found", {
        userId,
        currentMaestroId,
      });
      return [];
    }

    // Extract and group learnings by maestro
    const learningsByMaestro = new Map<string, CrossMaestroLearning>();

    for (const conv of conversations) {
      // Get maestro details to determine subject
      const maestro = getMaestroById(conv.maestroId);
      if (!maestro) {
        logger.warn("Maestro not found for conversation", {
          maestroId: conv.maestroId,
        });
        continue;
      }

      // Filter by subject if specified
      if (options?.subjects && !options.subjects.includes(maestro.subject)) {
        continue;
      }

      // Extract learnings from keyFacts
      const learnings = extractLearnings(conv.keyFacts);
      if (learnings.length === 0) {
        continue; // Skip conversations without learnings
      }

      // Add to map (group multiple conversations from same maestro)
      if (learningsByMaestro.has(conv.maestroId)) {
        const existing = learningsByMaestro.get(conv.maestroId)!;
        existing.learnings.push(...learnings);
        // Keep most recent date
        if (conv.updatedAt > existing.date) {
          existing.date = conv.updatedAt;
        }
      } else {
        learningsByMaestro.set(conv.maestroId, {
          maestroId: conv.maestroId,
          maestroName: maestro.displayName,
          subject: maestro.subject,
          learnings,
          date: conv.updatedAt,
        });
      }
    }

    // Convert to array and sort by date
    const result = Array.from(learningsByMaestro.values()).sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    );

    logger.info("Loaded cross-maestro learnings", {
      userId,
      currentMaestroId,
      maestroCount: result.length,
      totalLearnings: result.reduce((sum, m) => sum + m.learnings.length, 0),
    });

    return result;
  } catch (error) {
    logger.error(
      "Failed to load cross-maestro learnings",
      { userId, currentMaestroId },
      error,
    );
    return []; // Fail gracefully
  }
}

/**
 * Extract learnings from keyFacts JSON.
 * Handles the keyFacts structure: { decisions: [], preferences: [], learned: [] }
 *
 * @param keyFacts JSON string or null
 * @returns Array of learning strings
 */
function extractLearnings(keyFacts: string | null): string[] {
  if (!keyFacts) {
    return [];
  }

  try {
    const parsed = JSON.parse(keyFacts);

    // keyFacts has structure: { decisions, preferences, learned }
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.learned)) {
      return parsed.learned.filter(
        (item: unknown) => typeof item === "string" && item.trim().length > 0,
      );
    }

    return [];
  } catch (error) {
    logger.warn("Failed to parse keyFacts JSON", {
      keyFacts: keyFacts.substring(0, 100),
      error: String(error),
    });
    return [];
  }
}
