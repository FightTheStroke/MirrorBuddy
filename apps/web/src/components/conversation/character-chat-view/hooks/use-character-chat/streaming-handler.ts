/**
 * Streaming message handler
 * Sends messages with real-time streaming response
 *
 * @see ADR 0034 for streaming architecture
 */

import type { Message } from './types';
import type { CharacterInfo } from '../../utils/character-utils';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/auth';
import type { ChatUsage, SafetyBlockEvent } from './message-handler';

// Re-exported so existing importers keep working; the detection itself lives in
// tool-intent.ts to keep this file within the repo's file-size budget.
export { messageRequiresTool, TOOL_KEYWORDS } from './tool-intent';

/** Streaming result with REAL usage data from API */
export interface StreamingResult {
  success: boolean;
  usage: ChatUsage | null;
  latencyMs: number;
}

/**
 * Streaming message options
 */
export interface StreamingMessageOptions {
  input: string;
  messages: Message[];
  character: CharacterInfo;
  characterId: string;
  onChunk: (chunk: string, accumulated: string) => void;
  onComplete: (
    fullResponse: string,
    usage: ChatUsage | null,
    latencyMs: number,
    safetyEvent?: SafetyBlockEvent | null,
  ) => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
  language?: 'it' | 'en' | 'es' | 'fr' | 'de';
}

/**
 * Check if streaming is available
 * Checks server support via feature flag endpoint
 */
export async function isStreamingAvailable(): Promise<boolean> {
  try {
    const response = await fetch('/api/chat/stream', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) return false;

    const data = await response.json();
    return data.streaming === true;
  } catch {
    return false;
  }
}

/**
 * Send message with streaming response
 * Returns true if streaming was used, false if fallback was needed
 * Extracts REAL usage data from SSE stream for metrics
 */
export async function sendStreamingMessage(options: StreamingMessageOptions): Promise<boolean> {
  const {
    input,
    messages,
    character,
    characterId,
    onChunk,
    onComplete,
    onError,
    signal,
    language = 'it',
  } = options;

  const startTime = performance.now();
  let streamUsage: ChatUsage | null = null;
  let safetyEvent: SafetyBlockEvent | null = null;

  try {
    const response = await csrfFetch('/api/chat/stream', {
      method: 'POST',
      body: JSON.stringify({
        messages: [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: input },
        ],
        systemPrompt: character.systemPrompt,
        maestroId: characterId,
        enableMemory: true,
        language,
      }),
      signal,
    });

    // If streaming is disabled, response will be JSON error
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.fallback) {
        logger.debug('[Streaming] Not available, needs fallback');
        return false; // Signal to use fallback
      }
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    // Verify SSE content type
    const contentType = response.headers.get('Content-Type');
    if (!contentType?.includes('text/event-stream')) {
      logger.debug('[Streaming] Not SSE response, needs fallback');
      return false;
    }

    // Process SSE stream
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

        const data = trimmedLine.slice(6);

        if (data === '[DONE]') {
          const latencyMs = Math.round(performance.now() - startTime);
          onComplete(accumulated, streamUsage, latencyMs, safetyEvent);
          return true;
        }

        try {
          const parsed = JSON.parse(data);

          if (parsed.content) {
            accumulated += parsed.content;
            onChunk(parsed.content, accumulated);
          }

          // F-06: capture a real safety block so the UI can explain it.
          if (parsed.blocked) {
            safetyEvent = { blocked: true, category: parsed.category || 'unknown' };
          }

          // Extract REAL usage data from stream
          if (parsed.usage) {
            streamUsage = {
              prompt_tokens: parsed.usage.prompt_tokens || 0,
              completion_tokens: parsed.usage.completion_tokens || 0,
              total_tokens: parsed.usage.total_tokens || 0,
            };
          }

          if (parsed.error) {
            throw new Error(parsed.error);
          }

          // Log content filter but continue
          if (parsed.filtered) {
            logger.warn('[Streaming] Content filtered by Azure');
          }
        } catch (parseError) {
          // Ignore parse errors for individual chunks
          if ((parseError as Error).message.includes('filtered')) {
            throw parseError;
          }
        }
      }
    }

    // Stream ended normally
    const latencyMs = Math.round(performance.now() - startTime);
    onComplete(accumulated, streamUsage, latencyMs, safetyEvent);
    return true;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      logger.debug('[Streaming] Aborted by user');
      return true; // Abort is handled, don't fallback
    }

    logger.error('[Streaming] Error', { error: String(error) });
    onError(error as Error);
    return true; // Error is handled, don't fallback
  }
}
