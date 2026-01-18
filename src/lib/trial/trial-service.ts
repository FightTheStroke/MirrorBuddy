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

export const TOOLS_WHITELIST = ["mindmap", "summary"];

const CHAT_LIMIT = 10;
const DOC_LIMIT = 1;
const MAESTRI_COUNT = 3;

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
    const maestri = getRandomItems(MAESTRI, MAESTRI_COUNT);
    const coach = getRandomItems(COACHES, 1)[0];

    session = await prisma.trialSession.create({
      data: {
        ipHash,
        visitorId,
        chatsUsed: 0,
        docsUsed: 0,
        assignedMaestri: JSON.stringify(maestri),
        assignedCoach: coach,
      },
    });
  }

  return session;
}

export async function checkTrialLimits(
  sessionId: string,
  action: "chat" | "doc" | "tool",
): Promise<{ allowed: boolean; reason?: string }> {
  // Tool whitelist is always allowed if in whitelist
  if (action === "tool") {
    return { allowed: true };
  }

  const session = await prisma.trialSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return { allowed: false, reason: "Session not found" };
  }

  if (action === "chat") {
    if (session.chatsUsed >= CHAT_LIMIT) {
      return {
        allowed: false,
        reason: `Chat limit reached (${CHAT_LIMIT})`,
      };
    }
  }

  if (action === "doc") {
    if (session.docsUsed >= DOC_LIMIT) {
      return {
        allowed: false,
        reason: `Document limit reached (${DOC_LIMIT})`,
      };
    }
  }

  return { allowed: true };
}

export async function incrementUsage(
  sessionId: string,
  action: "chat" | "doc",
): Promise<void> {
  if (action === "chat") {
    await prisma.trialSession.update({
      where: { id: sessionId },
      data: { chatsUsed: { increment: 1 } },
    });
  } else if (action === "doc") {
    await prisma.trialSession.update({
      where: { id: sessionId },
      data: { docsUsed: { increment: 1 } },
    });
  }
}

export async function assignRandomMaestri(
  sessionId: string,
): Promise<string[]> {
  const maestri = getRandomItems(MAESTRI, MAESTRI_COUNT);

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

  return {
    chatsRemaining: Math.max(0, CHAT_LIMIT - session.chatsUsed),
    docsRemaining: Math.max(0, DOC_LIMIT - session.docsUsed),
    assignedMaestri: JSON.parse(session.assignedMaestri) as string[],
    assignedCoach: session.assignedCoach,
    totalChatsUsed: session.chatsUsed,
    totalDocsUsed: session.docsUsed,
  };
}
