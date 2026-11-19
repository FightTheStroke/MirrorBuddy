import { logger } from '@/lib/logger';
import { isTransientNetworkError } from '@/lib/resilience/network-read';
import type { ChatMessage } from '@/types';

const NOTICE_PREFIX = 'error-';

/** A failure notice shown in the chat; it is for the student, never for the model. */
export function turnNotice(content: string): ChatMessage {
  return {
    id: `${NOTICE_PREFIX}${Date.now()}`,
    role: 'assistant',
    content,
    timestamp: new Date(),
  };
}

export function toModelHistory(messages: ChatMessage[]) {
  return messages
    .filter((m) => !m.id.startsWith(NOTICE_PREFIX))
    .map((m) => ({ role: m.role, content: m.content }));
}

/**
 * The phone losing its connection mid-turn is not an application fault
 * (Sentry MIRRORBUDDY-4G); a refused or broken request still raises an error.
 * Returns true when the turn was lost in transit.
 */
export function reportTurnFailure(label: string, error: unknown): boolean {
  if (isTransientNetworkError(error)) {
    logger.debug(`${label}: connection lost`, { errorName: error.name });
    return true;
  }
  logger.error(label, { error: String(error) });
  return false;
}
