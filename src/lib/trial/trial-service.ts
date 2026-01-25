import { prisma } from "@/lib/db";
import crypto from "crypto";

// Re-export atomic operations for backward compatibility
export {
  checkAndIncrementUsage,
  getTierLimitsForTrial,
} from "./trial-atomic-operations";

// Available coaches from src/data/coaches/
const COACHES = ["melissa", "laura"];

/**
 * Trial limits (DEPRECATED - for backward compatibility only)
 *
 * NOTE: These are static fallback values. The actual limits are fetched from TierService.
 * Use getTierLimitsForTrial() instead for runtime limit checking.
 *
 * Previously included MAESTRI_COUNT limit (3 maestri).
 * Removed because it didn't work well - users should be able to talk to any maestro.
 * Time-based limits (voice, chat, tools) are more effective.
 */
export const TRIAL_LIMITS = {
  CHAT: 10, // 10 text chat messages
  VOICE_SECONDS: 300, // 5 minutes = 300 seconds total
  TOOLS: 10, // 10 tool uses (mindmap, summary, etc.)
  DOCS: 1, // 1 document upload
} as const;

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex");
}

function getRandomItems<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

export async function getOrCreateTrialSession(
  ip: string,
  visitorId: string,
  _userId?: string, // Kept for API compatibility but unused
) {
  const ipHash = hashIp(ip);

  let session = await prisma.trialSession.findFirst({
    where: {
      OR: [{ ipHash }, { visitorId }],
    },
  });

  if (!session) {
    const coach = getRandomItems(COACHES, 1)[0];

    session = await prisma.trialSession.create({
      data: {
        ipHash,
        visitorId,
        chatsUsed: 0,
        docsUsed: 0,
        voiceSecondsUsed: 0,
        toolsUsed: 0,
        // No maestri restrictions - users can talk to any maestro
        assignedMaestri: JSON.stringify([]), // Empty array (legacy field)
        assignedCoach: coach,
      },
    });
  }

  return session;
}

export type TrialAction = "chat" | "doc" | "tool" | "voice";

export async function checkTrialLimits(
  sessionId: string,
  action: TrialAction,
  voiceSeconds?: number,
): Promise<{ allowed: boolean; reason?: string }> {
  const session = await prisma.trialSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return { allowed: false, reason: "Session not found" };
  }

  // Fetch limits from TierService
  const limits = await getTierLimitsForTrial();

  switch (action) {
    case "chat":
      if (session.chatsUsed >= limits.chat) {
        return {
          allowed: false,
          reason: `Limite chat raggiunto (${limits.chat})`,
        };
      }
      break;

    case "doc":
      if (session.docsUsed >= limits.docs) {
        return {
          allowed: false,
          reason: `Limite documenti raggiunto (${limits.docs})`,
        };
      }
      break;

    case "tool":
      if (session.toolsUsed >= limits.tools) {
        return {
          allowed: false,
          reason: `Limite strumenti raggiunto (${limits.tools})`,
        };
      }
      break;

    case "voice":
      // Check if adding these seconds would exceed limit
      const newTotal = session.voiceSecondsUsed + (voiceSeconds || 0);
      if (newTotal > limits.voiceSeconds) {
        const remainingSeconds = limits.voiceSeconds - session.voiceSecondsUsed;
        return {
          allowed: false,
          reason: `Limite voce raggiunto (${Math.floor(limits.voiceSeconds / 60)} minuti). Rimangono ${remainingSeconds} secondi.`,
        };
      }
      break;
  }

  return { allowed: true };
}

export async function incrementUsage(
  sessionId: string,
  action: "chat" | "doc" | "tool",
): Promise<void> {
  const updateData: Record<string, { increment: number }> = {};

  switch (action) {
    case "chat":
      updateData.chatsUsed = { increment: 1 };
      break;
    case "doc":
      updateData.docsUsed = { increment: 1 };
      break;
    case "tool":
      updateData.toolsUsed = { increment: 1 };
      break;
  }

  await prisma.trialSession.update({
    where: { id: sessionId },
    data: updateData,
  });
}

/**
 * Add voice seconds to trial session
 * @param sessionId Trial session ID
 * @param seconds Number of seconds to add
 * @returns Updated total voice seconds
 */
export async function addVoiceSeconds(
  sessionId: string,
  seconds: number,
): Promise<number> {
  const session = await prisma.trialSession.update({
    where: { id: sessionId },
    data: {
      voiceSecondsUsed: { increment: Math.ceil(seconds) },
    },
  });

  return session.voiceSecondsUsed;
}

/**
 * Update email for trial session
 * @param sessionId Trial session ID
 * @param email User email address
 * @returns Updated trial session
 */
export async function updateTrialEmail(sessionId: string, email: string) {
  const session = await prisma.trialSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  return prisma.trialSession.update({
    where: { id: sessionId },
    data: {
      email,
      emailCollectedAt: new Date(),
    },
  });
}

export async function getTrialStatus(sessionId: string) {
  const session = await prisma.trialSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return null;
  }

  // Fetch limits from TierService
  const limits = await getTierLimitsForTrial();

  const voiceSecondsRemaining = Math.max(
    0,
    limits.voiceSeconds - session.voiceSecondsUsed,
  );

  return {
    // Chat
    chatsRemaining: Math.max(0, limits.chat - session.chatsUsed),
    totalChatsUsed: session.chatsUsed,
    maxChats: limits.chat,

    // Voice
    voiceSecondsRemaining,
    voiceSecondsUsed: session.voiceSecondsUsed,
    maxVoiceSeconds: limits.voiceSeconds,
    voiceMinutesRemaining: Math.floor(voiceSecondsRemaining / 60),

    // Tools
    toolsRemaining: Math.max(0, limits.tools - session.toolsUsed),
    totalToolsUsed: session.toolsUsed,
    maxTools: limits.tools,

    // Docs
    docsRemaining: Math.max(0, limits.docs - session.docsUsed),
    totalDocsUsed: session.docsUsed,
    maxDocs: limits.docs,

    // Assigned coach (maestri restrictions removed - users can talk to any maestro)
    assignedCoach: session.assignedCoach,
  };
}
