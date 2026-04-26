/**
 * Conversation Helper Functions
 * Extracted from conversation-flow.tsx for better modularity
 */

import { logger } from "@/lib/logger";
import { getUserIdFromCookie } from "@/lib/auth";
import { csrfFetch } from "@/lib/auth";

/**
 * Get userId from cookie (client-side)
 * Cookie is set by server during authentication
 */
export function getOrCreateUserId(): string | null {
  return getUserIdFromCookie();
}

/**
 * End a conversation and generate summary
 */
export async function endConversationWithSummary(
  conversationId: string,
  reason: "explicit" | "timeout" | "system" = "explicit",
): Promise<void> {
  const userId = getOrCreateUserId();
  if (!userId) {
    logger.warn("No userId, cannot end conversation");
    return;
  }

  try {
    const response = await csrfFetch(
      `/api/conversations/${conversationId}/end`,
      {
        method: "POST",
        body: JSON.stringify({ userId, reason }),
      },
    );

    if (!response.ok) {
      logger.error("Failed to end conversation", { status: response.status });
    } else {
      logger.info("Conversation ended with summary", { conversationId });
    }
  } catch (error) {
    logger.error("Error ending conversation", { error: String(error) });
  }
}
