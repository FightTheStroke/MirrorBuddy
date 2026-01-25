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
  checkAndIncrementUsage,
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

    // F-02: Atomic check and increment to prevent race condition
    // Uses Serializable transaction isolation - if limit reached, returns false
    // If allowed, increments usage atomically before returning
    const atomicResult = await checkAndIncrementUsage(session.id, "chat");

    if (!atomicResult.allowed) {
      log.info("Trial chat limit reached (atomic check)", {
        sessionId: session.id.slice(0, 8),
        reason: atomicResult.reason,
      });
      return {
        allowed: false,
        sessionId: session.id,
        reason: atomicResult.reason,
        chatsRemaining: 0,
      };
    }

    return {
      allowed: true,
      sessionId: session.id,
      chatsRemaining: atomicResult.remaining,
      toolsRemaining: Math.max(0, TRIAL_LIMITS.TOOLS - session.toolsUsed),
    };
  } catch (error) {
    log.warn("Trial check failed", { error: String(error) });
    // SECURITY: On error, deny access (fail-closed principle)
    return { allowed: false, reason: "Trial verification failed" };
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
 *
 * @deprecated Since F-02 fix, usage is now incremented atomically in checkTrialForAnonymous().
 * This function is a no-op for backward compatibility. New code should not call this.
 */
export async function incrementTrialUsage(sessionId: string): Promise<void> {
  // F-02: No-op - increment now happens atomically in checkTrialForAnonymous()
  // Kept for backward compatibility with existing callers
  log.debug("incrementTrialUsage called (no-op since F-02 atomic fix)", {
    sessionId: sessionId.slice(0, 8),
  });
}

/**
 * Check and increment trial tool usage atomically (F-02 fix)
 * Returns { allowed: boolean, remaining: number } to indicate if tool use is permitted
 */
export async function checkAndIncrementTrialToolUsage(
  sessionId: string,
): Promise<{ allowed: boolean; remaining: number; reason?: string }> {
  try {
    const result = await checkAndIncrementUsage(sessionId, "tool");
    log.debug("Trial tool usage check+increment (atomic)", {
      sessionId: sessionId.slice(0, 8),
      allowed: result.allowed,
      remaining: result.remaining,
    });
    return result;
  } catch (error) {
    log.error("Failed atomic tool usage check", { error: String(error) });
    return { allowed: false, remaining: 0, reason: "Tool check failed" };
  }
}

/**
 * Increment trial tool usage after successful tool call
 *
 * @deprecated Since F-02 fix, use checkAndIncrementTrialToolUsage() for atomic operations.
 * This function still works but doesn't prevent race conditions.
 */
export async function incrementTrialToolUsage(
  sessionId: string,
): Promise<void> {
  try {
    await incrementUsage(sessionId, "tool");
    log.debug("Trial tool usage incremented (legacy)", {
      sessionId: sessionId.slice(0, 8),
    });
  } catch (error) {
    log.error("Failed to increment trial tool usage", { error: String(error) });
  }
}
