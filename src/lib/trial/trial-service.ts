import { prisma } from "@/lib/db";
import crypto from "crypto";

// Real maestri IDs from src/data/maestri/index.ts
const MAESTRI = [
  "leonardo",
  "galileo",
  "curie",
  "cicerone",
  "lovelace",
  "smith",
  "shakespeare",
  "humboldt",
  "erodoto",
  "manzoni",
  "euclide",
  "mozart",
  "socrate",
  "ippocrate",
  "feynman",
  "darwin",
  "chris",
  "omero",
  "alexPina",
  "simone",
  "cassese",
  // Excluded from trial: mascetti (amico, not maestro)
];

// Available coaches from src/data/coaches/
const COACHES = ["melissa", "laura"];

// Trial limits
export const TRIAL_LIMITS = {
  CHAT: 10, // 10 text chat messages
  VOICE_SECONDS: 300, // 5 minutes = 300 seconds
  TOOLS: 10, // 10 tool uses (mindmap, summary, etc.)
  DOCS: 1, // 1 document upload
  MAESTRI_COUNT: 3, // 3 assigned maestri
} as const;

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex");
}

function getRandomItems<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

export async function getOrCreateTrialSession(ip: string, visitorId: string) {
  const ipHash = hashIp(ip);

  let session = await prisma.trialSession.findFirst({
    where: {
      OR: [{ ipHash }, { visitorId }],
    },
  });

  if (!session) {
    const maestri = getRandomItems(MAESTRI, TRIAL_LIMITS.MAESTRI_COUNT);
    const coach = getRandomItems(COACHES, 1)[0];

    session = await prisma.trialSession.create({
      data: {
        ipHash,
        visitorId,
        chatsUsed: 0,
        docsUsed: 0,
        voiceSecondsUsed: 0,
        toolsUsed: 0,
        assignedMaestri: JSON.stringify(maestri),
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

  switch (action) {
    case "chat":
      if (session.chatsUsed >= TRIAL_LIMITS.CHAT) {
        return {
          allowed: false,
          reason: `Limite chat raggiunto (${TRIAL_LIMITS.CHAT})`,
        };
      }
      break;

    case "doc":
      if (session.docsUsed >= TRIAL_LIMITS.DOCS) {
        return {
          allowed: false,
          reason: `Limite documenti raggiunto (${TRIAL_LIMITS.DOCS})`,
        };
      }
      break;

    case "tool":
      if (session.toolsUsed >= TRIAL_LIMITS.TOOLS) {
        return {
          allowed: false,
          reason: `Limite strumenti raggiunto (${TRIAL_LIMITS.TOOLS})`,
        };
      }
      break;

    case "voice":
      // Check if adding these seconds would exceed limit
      const newTotal = session.voiceSecondsUsed + (voiceSeconds || 0);
      if (newTotal > TRIAL_LIMITS.VOICE_SECONDS) {
        const remainingSeconds =
          TRIAL_LIMITS.VOICE_SECONDS - session.voiceSecondsUsed;
        return {
          allowed: false,
          reason: `Limite voce raggiunto (${Math.floor(TRIAL_LIMITS.VOICE_SECONDS / 60)} minuti). Rimangono ${remainingSeconds} secondi.`,
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

export async function assignRandomMaestri(
  sessionId: string,
): Promise<string[]> {
  const maestri = getRandomItems(MAESTRI, TRIAL_LIMITS.MAESTRI_COUNT);

  await prisma.trialSession.update({
    where: { id: sessionId },
    data: { assignedMaestri: JSON.stringify(maestri) },
  });

  return maestri;
}

export async function getTrialStatus(sessionId: string) {
  const session = await prisma.trialSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return null;
  }

  const voiceSecondsRemaining = Math.max(
    0,
    TRIAL_LIMITS.VOICE_SECONDS - session.voiceSecondsUsed,
  );

  return {
    // Chat
    chatsRemaining: Math.max(0, TRIAL_LIMITS.CHAT - session.chatsUsed),
    totalChatsUsed: session.chatsUsed,
    maxChats: TRIAL_LIMITS.CHAT,

    // Voice
    voiceSecondsRemaining,
    voiceSecondsUsed: session.voiceSecondsUsed,
    maxVoiceSeconds: TRIAL_LIMITS.VOICE_SECONDS,
    voiceMinutesRemaining: Math.floor(voiceSecondsRemaining / 60),

    // Tools
    toolsRemaining: Math.max(0, TRIAL_LIMITS.TOOLS - session.toolsUsed),
    totalToolsUsed: session.toolsUsed,
    maxTools: TRIAL_LIMITS.TOOLS,

    // Docs
    docsRemaining: Math.max(0, TRIAL_LIMITS.DOCS - session.docsUsed),
    totalDocsUsed: session.docsUsed,
    maxDocs: TRIAL_LIMITS.DOCS,

    // Assigned characters
    assignedMaestri: JSON.parse(session.assignedMaestri) as string[],
    assignedCoach: session.assignedCoach,
  };
}
