/**
 * Chat API authentication handling
 * Extracts and verifies user identity from authenticated session
 */

import { logger } from "@/lib/logger";
import { validateAuth } from "@/lib/auth/session-auth";

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
