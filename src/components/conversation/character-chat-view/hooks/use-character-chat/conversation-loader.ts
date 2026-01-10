/**
 * Conversation loading and initialization logic
 */

import { logger } from '@/lib/logger';
import type { Message } from './types';
import type { CharacterInfo } from '../../utils/character-utils';

/**
 * Load messages from server for existing conversation
 */
export async function loadMessagesFromServer(
  conversationId: string
): Promise<Message[] | null> {
  try {
    const response = await fetch(`/api/conversations/${conversationId}`);
    if (response.ok) {
      const convData = await response.json();
      if (convData.messages && convData.messages.length > 0) {
        return convData.messages.map(
          (m: { id: string; role: string; content: string; createdAt: string }) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: new Date(m.createdAt),
          })
        );
      }
    }
  } catch (error) {
    logger.warn('Failed to load messages from server', { error: String(error) });
  }
  return null;
}

/**
 * Convert store messages to local format
 */
export function convertStoreMessages(
  storeMessages: Array<{ id: string; role: string; content: string; timestamp?: number | string | Date }>
): Message[] {
  return storeMessages.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
    timestamp: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp || Date.now()),
  }));
}

/**
 * Create greeting message from character
 */
export function createGreetingMessage(character: CharacterInfo): Message {
  return {
    id: 'greeting',
    role: 'assistant',
    content: character.greeting,
    timestamp: new Date(),
  };
}
