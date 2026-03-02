/**
 * Conversation Window — Sliding Window Summarization
 *
 * Compresses long conversation histories by summarizing older messages.
 * Keeps recent N messages intact, summarizes the rest into a single
 * system message. Tier-aware token limits.
 */

import { logger } from '@/lib/logger';

const RECENT_MESSAGES_TO_KEEP = 6;

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface WindowConfig {
  maxTokens: number;
  recentMessagesToKeep?: number;
}

/**
 * Estimate token count for a string (~4 chars per token).
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Estimate total tokens for a message array.
 */
function estimateMessagesTokens(messages: ConversationMessage[]): number {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
}

/**
 * Compress conversation history using sliding window summarization.
 *
 * When total tokens exceed maxTokens:
 * 1. Keep the last N messages intact (most recent context)
 * 2. Summarize older messages into a single system message
 *
 * Returns the original messages if under the token limit.
 */
export function compressConversationHistory(
  messages: ConversationMessage[],
  config: WindowConfig,
): ConversationMessage[] {
  const { maxTokens, recentMessagesToKeep = RECENT_MESSAGES_TO_KEEP } = config;

  if (!messages || messages.length === 0) {
    return [];
  }

  const totalTokens = estimateMessagesTokens(messages);

  if (totalTokens <= maxTokens) {
    return messages;
  }

  // Not enough messages to compress
  if (messages.length <= recentMessagesToKeep) {
    return messages;
  }

  const recentMessages = messages.slice(-recentMessagesToKeep);
  const olderMessages = messages.slice(0, -recentMessagesToKeep);

  const summary = buildConversationSummary(olderMessages);

  logger.debug('[ConversationWindow] Compressed history', {
    originalMessages: messages.length,
    originalTokens: totalTokens,
    compressedMessages: recentMessages.length + 1,
    summarizedCount: olderMessages.length,
  });

  return [
    {
      role: 'system',
      content: `[Riassunto conversazione precedente: ${summary}]`,
    },
    ...recentMessages,
  ];
}

/**
 * Build a concise summary of older messages.
 */
function buildConversationSummary(messages: ConversationMessage[]): string {
  const topics: string[] = [];
  let lastAssistantResponse = '';

  for (const msg of messages) {
    if (msg.role === 'user') {
      const topic = msg.content.slice(0, 100).replace(/\n/g, ' ').trim();
      if (topic) topics.push(topic);
    }
    if (msg.role === 'assistant') {
      lastAssistantResponse = msg.content.slice(0, 150).replace(/\n/g, ' ').trim();
    }
  }

  const uniqueTopics = [...new Set(topics)].slice(0, 5);
  const parts: string[] = [];

  if (uniqueTopics.length > 0) {
    parts.push(`Lo studente ha chiesto: ${uniqueTopics.join('; ')}`);
  }
  if (lastAssistantResponse) {
    parts.push(`Ultima risposta trattava: ${lastAssistantResponse}`);
  }

  return parts.join('. ') || 'Conversazione precedente non riassumibile.';
}
