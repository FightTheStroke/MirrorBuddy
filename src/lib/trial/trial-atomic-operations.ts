/**
 * MIRRORBUDDY - Trial Service Atomic Operations
 *
 * F-02: Race condition prevention via atomic check+increment
 * Extracted from trial-service.ts to maintain file size under 250 lines
 */

import { prisma } from "@/lib/db";

/**
 * Internal cache for tier limits to avoid repeated DB calls
 */
let cachedLimits: {
  chat: number;
  voiceSeconds: number;
  tools: number;
  docs: number;
} | null = null;

/**
 * Get trial limits from TierService
 * Fetches limits for anonymous users (trial tier)
 */
export async function getTierLimitsForTrial(): Promise<{
  chat: number;
  voiceSeconds: number;
  tools: number;
  docs: number;
}> {
  // Return cached limits if available
  if (cachedLimits) {
    return cachedLimits;
  }

  try {
    const { TierService } = await import("@/lib/tier/tier-service");
    const tierService = new TierService();
    const limits = await tierService.getLimitsForUser(null); // null = anonymous/trial user

    cachedLimits = {
      chat: limits.dailyMessages,
      voiceSeconds: limits.dailyVoiceMinutes * 60, // Convert minutes to seconds
      tools: limits.dailyTools,
      docs: limits.maxDocuments,
    };

    return cachedLimits;
  } catch (error) {
    // Fallback to hardcoded limits if TierService fails
    console.error("Failed to fetch trial limits from TierService:", error);
    const { TRIAL_LIMITS } = await import("./trial-service");
    return {
      chat: TRIAL_LIMITS.CHAT,
      voiceSeconds: TRIAL_LIMITS.VOICE_SECONDS,
      tools: TRIAL_LIMITS.TOOLS,
      docs: TRIAL_LIMITS.DOCS,
    };
  }
}

export type AtomicTrialAction = "chat" | "doc" | "tool";

/**
 * Atomically check and increment trial usage (F-02: Race condition prevention)
 *
 * Uses Prisma transaction with Serializable isolation to prevent race conditions
 * where multiple concurrent requests could exceed the limit.
 *
 * @param sessionId Trial session ID
 * @param action Type of action (chat, doc, tool)
 * @returns { allowed: boolean, remaining: number, reason?: string }
 */
export async function checkAndIncrementUsage(
  sessionId: string,
  action: AtomicTrialAction,
): Promise<{ allowed: boolean; remaining: number; reason?: string }> {
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Step 1: Read current session state
        const session = await tx.trialSession.findUnique({
          where: { id: sessionId },
        });

        if (!session) {
          throw new Error("Session not found");
        }

        // Step 2: Fetch limits from TierService
        const limits = await getTierLimitsForTrial();

        // Step 3: Check limit based on action type
        let currentUsage: number;
        let limit: number;
        let updateField: string;

        switch (action) {
          case "chat":
            currentUsage = session.chatsUsed;
            limit = limits.chat;
            updateField = "chatsUsed";
            break;
          case "doc":
            currentUsage = session.docsUsed;
            limit = limits.docs;
            updateField = "docsUsed";
            break;
          case "tool":
            currentUsage = session.toolsUsed;
            limit = limits.tools;
            updateField = "toolsUsed";
            break;
          default:
            throw new Error(`Unsupported action: ${action}`);
        }

        // Step 4: Check if limit would be exceeded
        if (currentUsage >= limit) {
          return {
            allowed: false,
            remaining: 0,
            reason: `Limite ${action} raggiunto (${limit})`,
          };
        }

        // Step 5: Atomically increment usage
        await tx.trialSession.update({
          where: { id: sessionId },
          data: {
            [updateField]: { increment: 1 },
          },
        });

        // Step 6: Return success with remaining count
        const remaining = limit - (currentUsage + 1);
        return {
          allowed: true,
          remaining,
        };
      },
      {
        isolationLevel: "Serializable", // Critical: Prevents race conditions
      },
    );

    return result;
  } catch (error) {
    // Transaction failed (e.g., serialization error, limit exceeded)
    console.error("checkAndIncrementUsage error:", error);
    return {
      allowed: false,
      remaining: 0,
      reason: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
