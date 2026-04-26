/**
 * Tests for Conversation Window — Sliding Window Summarization
 */

import { describe, it, expect, vi } from 'vitest';
import { compressConversationHistory, type ConversationMessage } from './conversation-window';

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

function makeMessages(count: number): ConversationMessage[] {
  const messages: ConversationMessage[] = [];
  for (let i = 0; i < count; i++) {
    messages.push({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}: ${'x'.repeat(100)}`,
    });
  }
  return messages;
}

describe('compressConversationHistory', () => {
  it('returns original messages when under token limit', () => {
    const messages: ConversationMessage[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ];
    const result = compressConversationHistory(messages, { maxTokens: 1000 });
    expect(result).toEqual(messages);
  });

  it('returns empty array for empty input', () => {
    const result = compressConversationHistory([], { maxTokens: 1000 });
    expect(result).toEqual([]);
  });

  it('compresses long conversations exceeding token limit', () => {
    const messages = makeMessages(30);
    const result = compressConversationHistory(messages, { maxTokens: 500 });

    // Should have summary + recent messages
    expect(result.length).toBeLessThan(messages.length);
    expect(result[0].role).toBe('system');
    expect(result[0].content).toContain('Riassunto conversazione precedente');
  });

  it('keeps the most recent messages intact', () => {
    const messages = makeMessages(20);
    const result = compressConversationHistory(messages, {
      maxTokens: 100,
      recentMessagesToKeep: 4,
    });

    // Last 4 messages should be preserved
    const lastOriginal = messages.slice(-4);
    const lastResult = result.slice(-4);
    expect(lastResult).toEqual(lastOriginal);
  });

  it('summary includes user topics', () => {
    const messages: ConversationMessage[] = [
      { role: 'user', content: 'Spiegami le derivate' },
      { role: 'assistant', content: 'Le derivate sono...' + 'x'.repeat(500) },
      { role: 'user', content: 'E gli integrali?' },
      { role: 'assistant', content: 'Gli integrali sono...' + 'x'.repeat(500) },
      { role: 'user', content: 'Parliamo di limiti' },
      { role: 'assistant', content: 'I limiti sono...' + 'x'.repeat(500) },
      { role: 'user', content: 'Ultima domanda' },
      { role: 'assistant', content: 'Risposta finale' },
    ];

    const result = compressConversationHistory(messages, {
      maxTokens: 200,
      recentMessagesToKeep: 2,
    });

    expect(result[0].content).toContain('derivate');
  });

  it('does not compress when fewer messages than recentMessagesToKeep', () => {
    const messages = makeMessages(4);
    const result = compressConversationHistory(messages, {
      maxTokens: 10,
      recentMessagesToKeep: 6,
    });
    expect(result).toEqual(messages);
  });

  it('respects custom recentMessagesToKeep', () => {
    const messages = makeMessages(20);
    const result = compressConversationHistory(messages, {
      maxTokens: 100,
      recentMessagesToKeep: 8,
    });

    // 1 summary + 8 recent = 9
    expect(result.length).toBe(9);
  });
});
