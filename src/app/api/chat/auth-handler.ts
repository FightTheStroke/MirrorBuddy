/**
 * Chat API authentication handling
 * Extracts and verifies user identity from authenticated session
 * Includes COPPA compliance enforcement for under-13 users
 */

import { logger } from "@/lib/logger";
import { validateAuth } from "@/lib/auth";
import { canAccessFullFeatures } from "@/lib/compliance";

/**
 * Extract userId from validated authentication
 */
export async function extractUserId(): Promise<string | undefined> {
  const auth = await validateAuth();

  if (!auth.authenticated || !auth.userId) {
    logger.debug("No authenticated user in chat API");
    return undefined;
  }

  return auth.userId;
}

/**
 * COPPA compliance result
 */
export interface CoppaCheckResult {
  allowed: boolean;
  userId?: string;
  reason?: "not_authenticated" | "coppa_blocked";
}

/**
 * Extract userId and verify COPPA compliance
 * Returns blocked status if user is under 13 without parental consent
 */
export async function extractUserIdWithCoppaCheck(): Promise<CoppaCheckResult> {
  const auth = await validateAuth();

  if (!auth.authenticated || !auth.userId) {
    return { allowed: true, userId: undefined }; // Anonymous allowed, COPPA applies to identified users
  }

  const canAccess = await canAccessFullFeatures(auth.userId);

  if (!canAccess) {
    logger.info("COPPA: Access blocked - parental consent required", {
      userId: auth.userId.slice(0, 8),
    });
    return { allowed: false, userId: auth.userId, reason: "coppa_blocked" };
  }

  return { allowed: true, userId: auth.userId };
}
