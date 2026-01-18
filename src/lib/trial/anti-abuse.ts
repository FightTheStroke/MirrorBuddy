// Anti-abuse detection for trial visitor tracking
// Detects patterns: multiple visitors per IP, IP rotation, cookie clearing

import { logger } from "@/lib/logger";

const log = logger.child({ module: "trial/anti-abuse" });

const ABUSE_THRESHOLD = 10;
const MAX_TRACKED_IPS = 100;

// In-memory tracking: IP -> Set<visitorId>
const ipToVisitors = new Map<string, Set<string>>();
// In-memory tracking: visitorId -> Set<IP>
const visitorToIps = new Map<string, Set<string>>();

export interface AbuseCheckResult {
  isAbuse: boolean;
  score: number;
  reason?: string;
}

/**
 * Check for abuse patterns based on IP and visitor ID
 * Pattern 1: Multiple visitor cookies from same IP
 * Pattern 2: Rapid IP rotation for same visitor
 */
export function checkAbuse(ip: string, visitorId: string): AbuseCheckResult {
  let score = 0;
  const reasons: string[] = [];

  // Get current tracking state
  const visitorsForIp = ipToVisitors.get(ip) || new Set<string>();
  const ipsForVisitor = visitorToIps.get(visitorId) || new Set<string>();

  // Pattern 1: Same IP with multiple different visitor cookies
  // (indicates trying to create multiple trial accounts from one location)
  if (visitorsForIp.size >= 3) {
    score += 5;
    reasons.push(`Multiple visitors (${visitorsForIp.size}) from IP ${ip}`);
  }

  // Pattern 2: Rapid IP rotation for same visitor
  // (indicates proxy rotation or geographic spoofing)
  if (ipsForVisitor.size >= 4) {
    score += 5;
    reasons.push(
      `Rapid IP rotation (${ipsForVisitor.size} IPs) for visitor ${visitorId}`,
    );
  }

  // Update tracking maps
  visitorsForIp.add(visitorId);
  ipsForVisitor.add(ip);
  ipToVisitors.set(ip, visitorsForIp);
  visitorToIps.set(visitorId, ipsForVisitor);

  // Trim memory if exceeded max tracked IPs
  if (ipToVisitors.size > MAX_TRACKED_IPS) {
    const firstKey = ipToVisitors.keys().next().value;
    if (firstKey) {
      ipToVisitors.delete(firstKey);
    }
  }

  return {
    isAbuse: score > 0,
    score,
    reason: reasons.length > 0 ? reasons.join(" | ") : undefined,
  };
}

/**
 * Increment abuse score in database for a session
 * Call after detecting suspicious behavior
 */
export async function incrementAbuseScore(
  sessionId: string,
  points: number,
  db?: { session: { update: (args: unknown) => Promise<unknown> } },
): Promise<void> {
  if (!db) {
    log.warn("Cannot increment abuse score: database not provided", {
      sessionId,
    });
    return;
  }

  try {
    await db.session.update({
      where: { id: sessionId },
      data: { abuseScore: { increment: points } },
    });
  } catch (error) {
    log.error("Failed to increment abuse score", {
      sessionId,
      error: String(error),
    });
  }
}

/**
 * Check if a session is blocked due to abuse
 */
export async function isSessionBlocked(
  sessionId: string,
  db?: {
    session: {
      findUnique: (args: unknown) => Promise<{ abuseScore: number } | null>;
    };
  },
): Promise<boolean> {
  if (!db) {
    return false;
  }

  try {
    const session = await db.session.findUnique({
      where: { id: sessionId },
      select: { abuseScore: true },
    });

    return session ? session.abuseScore > ABUSE_THRESHOLD : false;
  } catch (error) {
    log.error("Failed to check session block status", {
      sessionId,
      error: String(error),
    });
    return false;
  }
}

export { ABUSE_THRESHOLD };
