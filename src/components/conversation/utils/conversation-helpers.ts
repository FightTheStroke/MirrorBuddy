/**
 * Conversation Helper Functions
 * Extracted from conversation-flow.tsx for better modularity
 */

import { logger } from '@/lib/logger';

/**
 * Get or create userId from sessionStorage (client-side)
 * Creates a new UUID if one doesn't exist
 */
export function getOrCreateUserId(): string | null {
  if (typeof window === 'undefined') return null;
  let userId = sessionStorage.getItem('mirrorbuddy-user-id');
  if (!userId) {
    userId = crypto.randomUUID();
    sessionStorage.setItem('mirrorbuddy-user-id', userId);
  }
  return userId;
}

/**
 * End a conversation and generate summary
 */
export async function endConversationWithSummary(
  conversationId: string,
  reason: 'explicit' | 'timeout' | 'system' = 'explicit'
): Promise<void> {
  const userId = getOrCreateUserId();
  if (!userId) {
    logger.warn('No userId, cannot end conversation');
    return;
  }

  try {
    const response = await fetch(`/api/conversations/${conversationId}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, reason }),
    });

    if (!response.ok) {
      logger.error('Failed to end conversation', { status: response.status });
    } else {
      logger.info('Conversation ended with summary', { conversationId });
    }
  } catch (error) {
    logger.error('Error ending conversation', { error: String(error) });
  }
}
