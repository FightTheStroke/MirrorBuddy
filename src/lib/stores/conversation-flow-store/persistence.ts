/**
 * Database Persistence for Conversation Flow
 *
 * Handles all database operations for conversations and messages:
 * - Creating conversations in the database
 * - Saving messages to the database
 * - Loading conversation summaries for context
 * - Updating conversation summaries
 */

import { logger } from '@/lib/logger';
import type { CharacterType } from '@/types';
import type { ConversationSummary } from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Minimum number of messages required before generating a summary.
 * Set to 2 to ensure there's meaningful conversation beyond just the greeting.
 */
export const MIN_MESSAGES_FOR_SUMMARY = 2;

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Create a new conversation in the database.
 */
export async function createConversationInDB(
  characterId: string,
  characterType: CharacterType,
  characterName: string
): Promise<string | null> {
  try {
    const response = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        maestroId: characterId,
        title: `Conversazione con ${characterName}`,
      }),
    });
    if (!response.ok) {
      logger.error('Failed to create conversation', { status: response.status });
      return null;
    }
    const data = await response.json();
    logger.debug('Created conversation', { id: data.id, characterId });
    return data.id;
  } catch (error) {
    logger.error('Error creating conversation', { error: String(error) });
    return null;
  }
}

/**
 * Save a message to the database.
 */
export async function saveMessageToDB(
  conversationId: string,
  role: string,
  content: string
): Promise<void> {
  try {
    const response = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, content }),
    });
    if (!response.ok) {
      logger.error('Failed to save message', { status: response.status });
    }
  } catch (error) {
    logger.error('Error saving message', { error: String(error) });
  }
}

/**
 * Load conversation summaries from the database (not full messages).
 * We use summaries for context instead of restoring entire conversations.
 */
export async function loadConversationSummariesFromDB(): Promise<ConversationSummary[]> {
  try {
    const response = await fetch('/api/conversations?limit=20&active=true');

    // 401 = no user cookie yet (first visit), not an error
    if (response.status === 401) {
      return [];
    }

    if (!response.ok) {
      logger.warn('Conversations API returned error', { status: response.status });
      return [];
    }

    const data = await response.json();

    // API might return error object instead of array
    if (!Array.isArray(data)) {
      if (data.error) {
        logger.warn('Conversations API error', { error: data.error });
      }
      return [];
    }

    return data;
  } catch (error) {
    // Network error or JSON parse error
    logger.warn('Error loading conversation summaries', { error: String(error) });
    return [];
  }
}

/**
 * Update conversation summary in DB.
 * NOTE: Integrate with conversation-flow.tsx endSession() for memory persistence.
 * See ADR-0021 for architecture details.
 */
export async function updateConversationSummary(
  conversationId: string,
  summary: string,
  keyFacts: string[],
  topics: string[]
): Promise<void> {
  try {
    await fetch(`/api/conversations/${conversationId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary, keyFacts: JSON.stringify(keyFacts), topics }),
    });
  } catch (error) {
    logger.error('Error updating conversation summary', { error: String(error) });
  }
}
