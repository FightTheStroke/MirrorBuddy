/**
 * Trial Data Migration Service
 *
 * Migrates trial session data to a newly created user account.
 * Includes: settings, profile preferences, conversations, and maestro assignments.
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface MigrationResult {
  success: boolean;
  migratedItems: {
    conversations: number;
    settings: boolean;
    profile: boolean;
  };
  error?: string;
}

/**
 * Migrate trial session data to new user account
 *
 * @param userId - The newly created user ID
 * @param trialSessionId - The trial session to migrate from
 */
export async function migrateTrialData(
  userId: string,
  trialSessionId: string,
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migratedItems: {
      conversations: 0,
      settings: false,
      profile: false,
    },
  };

  try {
    // Get trial session
    const trialSession = await prisma.trialSession.findUnique({
      where: { id: trialSessionId },
    });

    if (!trialSession) {
      return { ...result, error: "Trial session not found" };
    }

    // Get user with profile and settings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        settings: true,
      },
    });

    if (!user) {
      return { ...result, error: "User not found" };
    }

    await prisma.$transaction(async (tx) => {
      // Migrate assigned maestri to profile preferences
      if (trialSession.assignedMaestri) {
        try {
          const maestri = JSON.parse(trialSession.assignedMaestri) as string[];
          if (maestri.length > 0 && user.profile) {
            await tx.profile.update({
              where: { id: user.profile.id },
              data: {
                preferredCoach: maestri[0] || null,
              },
            });
            result.migratedItems.profile = true;
          }
        } catch {
          logger.warn("Failed to parse assignedMaestri", { trialSessionId });
        }
      }

      // Migrate assigned coach
      if (trialSession.assignedCoach && user.profile) {
        await tx.profile.update({
          where: { id: user.profile.id },
          data: {
            preferredCoach: trialSession.assignedCoach,
          },
        });
        result.migratedItems.profile = true;
      }

      // Note: Trial conversations are not stored in DB (in-memory only)
      // If we had stored trial conversations, we would migrate them here
      result.migratedItems.conversations = 0;

      // Mark migration complete in invite request
      await tx.inviteRequest.updateMany({
        where: { trialSessionId },
        data: { migratedData: true },
      });
    });

    result.success = true;
    logger.info("Trial data migrated", {
      userId,
      trialSessionId,
      migratedItems: result.migratedItems,
    });

    return result;
  } catch (error) {
    logger.error(
      "Trial migration failed",
      { userId, trialSessionId },
      error as Error,
    );
    return {
      ...result,
      error: error instanceof Error ? error.message : "Migration failed",
    };
  }
}

/**
 * Check if a trial session has migrateable data
 */
export async function hasTrialData(trialSessionId: string): Promise<boolean> {
  try {
    const session = await prisma.trialSession.findUnique({
      where: { id: trialSessionId },
    });

    if (!session) return false;

    // Check if there's any meaningful data
    return !!(
      session.chatsUsed > 0 ||
      session.assignedMaestri !== "[]" ||
      session.assignedCoach
    );
  } catch {
    return false;
  }
}

/**
 * Get trial session summary for migration preview
 */
export async function getTrialSummary(trialSessionId: string): Promise<{
  chatsUsed: number;
  docsUsed: number;
  assignedMaestri: string[];
  assignedCoach: string | null;
  createdAt: Date;
} | null> {
  try {
    const session = await prisma.trialSession.findUnique({
      where: { id: trialSessionId },
    });

    if (!session) return null;

    let maestri: string[] = [];
    try {
      maestri = JSON.parse(session.assignedMaestri) as string[];
    } catch {
      maestri = [];
    }

    return {
      chatsUsed: session.chatsUsed,
      docsUsed: session.docsUsed,
      assignedMaestri: maestri,
      assignedCoach: session.assignedCoach,
      createdAt: session.createdAt,
    };
  } catch {
    return null;
  }
}
