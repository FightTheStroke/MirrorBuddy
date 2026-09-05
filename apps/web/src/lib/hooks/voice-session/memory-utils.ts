// ============================================================================
// CONVERSATION MEMORY UTILITIES
// Fetching, building, and sanitizing conversation context
// ============================================================================

import type { ConversationMemory } from './types';
import { clientLogger as logger } from '@/lib/logger/client';
import {
  decodeConversationKeyFacts,
  decodeConversationListResponse,
  decodeConversationTopics,
  type ConversationListItem,
} from '@/lib/validation/schemas/conversations';

/**
 * Sanitize text by removing HTML comments completely.
 * Uses a loop-based approach with combined regex to handle nested/overlapping
 * patterns that could bypass single-pass sanitization.
 * Per CodeQL docs: combines patterns in single regex with alternation.
 * Note: This sanitizes TRUSTED internal strings (maestro definitions), not user input.
 * @see https://codeql.github.com/codeql-query-help/javascript/js-incomplete-multi-character-sanitization/
 */
export function sanitizeHtmlComments(text: string): string {
  let result = text;
  let previousResult: string;

  // Loop until no more changes occur (handles nested patterns like <!---->)
  // Uses combined regex with alternation as recommended by CodeQL docs
  // Handles all standard HTML comment variations including --!> (browser quirk)
  do {
    previousResult = result;
    // Remove complete HTML comments (including --!> variant), then orphaned markers
    result = result.replace(/<!--[\s\S]*?(?:--|--!)>|<!--|(?:--|--!)>/g, '');
  } while (result !== previousResult);

  return result;
}

/**
 * Build conversation memory from one decoded conversation item.
 * Fields that cannot be decoded are dropped with an explicit warning instead of
 * failing the whole recall; diagnostics carry field names only, never content.
 */
function toConversationMemory(
  conversation: ConversationListItem,
  maestroId: string,
): ConversationMemory | null {
  const keyFacts = decodeConversationKeyFacts(conversation.keyFacts);
  const topics = decodeConversationTopics(conversation.topics);

  if (!keyFacts.ok) {
    logger.warn('[VoiceSession] Discarded malformed conversation memory field', {
      maestroId,
      field: 'keyFacts',
      error: keyFacts.error,
    });
  }
  if (!topics.ok) {
    logger.warn('[VoiceSession] Discarded malformed conversation memory field', {
      maestroId,
      field: 'topics',
      error: topics.error,
    });
  }

  const memory: ConversationMemory = {};
  if (conversation.summary) memory.summary = conversation.summary;
  if (keyFacts.ok && keyFacts.data) memory.keyFacts = keyFacts.data;
  if (topics.ok && topics.data?.length) memory.recentTopics = topics.data;

  return Object.keys(memory).length > 0 ? memory : null;
}

/**
 * Fetch conversation memory for a maestro from the API.
 * Reads the actual `{ items, pagination }` envelope of GET /api/conversations.
 */
export async function fetchConversationMemory(
  maestroId: string,
): Promise<ConversationMemory | null> {
  let payload: unknown;

  try {
    const response = await fetch(
      `/api/conversations?maestroId=${encodeURIComponent(maestroId)}&limit=1`,
    );
    if (!response.ok) {
      // Optional memory recall — degrade gracefully on transient failures.
      // Logged at info to avoid Sentry noise (MIRRORBUDDY-1K).
      logger.info('[VoiceSession] Conversation memory request rejected', {
        maestroId,
        status: response.status,
      });
      return null;
    }
    payload = await response.json();
  } catch (error) {
    logger.info('[VoiceSession] Failed to fetch conversation memory', {
      maestroId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }

  const decoded = decodeConversationListResponse(payload);
  if (!decoded.ok) {
    // A shape mismatch is a contract break, not a transient failure: surface it.
    logger.warn('[VoiceSession] Unexpected conversations response shape', {
      maestroId,
      error: decoded.error,
    });
    return null;
  }

  const conversation = decoded.data.items[0];
  if (!conversation) return null;

  return toConversationMemory(conversation, maestroId);
}

/**
 * Build context string from conversation memory for system instructions
 */
export function buildMemoryContext(memory: ConversationMemory | null): string {
  if (!memory) return '';

  let context = '\n\n## MEMORIA DELLE CONVERSAZIONI PRECEDENTI\n';
  context += 'Ricordi importanti dalle sessioni precedenti con questo studente:\n\n';

  if (memory.summary) {
    context += `### Riassunto:\n${memory.summary}\n\n`;
  }

  if (memory.keyFacts?.learned?.length) {
    context += `### Concetti capiti:\n`;
    memory.keyFacts.learned.forEach((l) => {
      context += `- ${l}\n`;
    });
    context += '\n';
  }

  if (memory.keyFacts?.preferences?.length) {
    context += `### Preferenze:\n`;
    memory.keyFacts.preferences.forEach((p) => {
      context += `- ${p}\n`;
    });
    context += '\n';
  }

  if (memory.recentTopics?.length) {
    context += `### Argomenti recenti:\n`;
    memory.recentTopics.forEach((t) => {
      context += `- ${t}\n`;
    });
    context += '\n';
  }

  context += `\n**USA QUESTE INFORMAZIONI** per personalizzare la lezione.\n`;
  return context;
}
