/**
 * Chat API trial limit handling
 * Enforces trial limits for anonymous users (ADR 0056)
 */

import { cookies, headers } from "next/headers";
import { logger } from "@/lib/logger";
import {
  getOrCreateTrialSession,
  checkTrialLimits,
  incrementUsage,
  TRIAL_LIMITS,
} from "@/lib/trial/trial-service";

const log = logger.child({ module: "api/chat/trial-handler" });

export interface TrialCheckResult {
  allowed: boolean;
  sessionId?: string;
  reason?: string;
  chatsRemaining?: number;
  toolsRemaining?: number;
}

/**
 * Get trial session for current request
 * Returns null if user is authenticated or no visitor ID
 */
export async function getTrialSession(
  isAuthenticated: boolean,
  userId?: string,
): Promise<{ sessionId: string } | null> {
  if (isAuthenticated) return null;

  const cookieStore = await cookies();
  const visitorId = cookieStore.get("mirrorbuddy-visitor-id")?.value;

  if (!visitorId) return null;

  const headersList = await headers();
  const forwarded = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");
  const ip = forwarded?.split(",")[0].trim() || realIp || "unknown";

  const session = await getOrCreateTrialSession(ip, visitorId, userId);
  return { sessionId: session.id };
}

/**
 * Check trial limits for anonymous users
 * Returns allowed: true if user is authenticated or within trial limits
 */
export async function checkTrialForAnonymous(
  isAuthenticated: boolean,
  userId?: string,
): Promise<TrialCheckResult> {
  // Authenticated users don't have trial limits
  if (isAuthenticated) {
    return { allowed: true };
  }

  try {
    // Get visitor ID from cookie
    const cookieStore = await cookies();
    const visitorId = cookieStore.get("mirrorbuddy-visitor-id")?.value;

    // No visitor cookie = no trial session yet = allow first access
    // Trial session will be created on /welcome before app access
    if (!visitorId) {
      log.debug("No visitor ID cookie - trial session not yet created");
      return { allowed: true };
    }

    // Get IP from headers
    const headersList = await headers();
    const forwarded = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ip = forwarded?.split(",")[0].trim() || realIp || "unknown";

    // Get or create trial session
    const session = await getOrCreateTrialSession(ip, visitorId, userId);

    // Check trial limits
    const limitCheck = await checkTrialLimits(session.id, "chat");

    if (!limitCheck.allowed) {
      log.info("Trial chat limit reached", {
        sessionId: session.id.slice(0, 8),
        chatsUsed: session.chatsUsed,
      });
      return {
        allowed: false,
        sessionId: session.id,
        reason: limitCheck.reason,
        chatsRemaining: 0,
      };
    }

    return {
      allowed: true,
      sessionId: session.id,
      chatsRemaining: Math.max(0, TRIAL_LIMITS.CHAT - session.chatsUsed),
      toolsRemaining: Math.max(0, TRIAL_LIMITS.TOOLS - session.toolsUsed),
    };
  } catch (error) {
    log.error("Trial check failed", { error: String(error) });
    // On error, allow access (graceful degradation)
    return { allowed: true };
  }
}

/**
 * Check trial limits for tool usage
 */
export async function checkTrialToolLimit(
  sessionId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  return checkTrialLimits(sessionId, "tool");
}

/**
 * Increment trial chat usage after successful chat
 */
export async function incrementTrialUsage(sessionId: string): Promise<void> {
  try {
    await incrementUsage(sessionId, "chat");
    log.debug("Trial chat usage incremented", {
      sessionId: sessionId.slice(0, 8),
    });
  } catch (error) {
    log.error("Failed to increment trial usage", { error: String(error) });
  }
}

/**
 * Increment trial tool usage after successful tool call
 */
export async function incrementTrialToolUsage(
  sessionId: string,
): Promise<void> {
  try {
    await incrementUsage(sessionId, "tool");
    log.debug("Trial tool usage incremented", {
      sessionId: sessionId.slice(0, 8),
    });
  } catch (error) {
    log.error("Failed to increment trial tool usage", { error: String(error) });
  }
}
