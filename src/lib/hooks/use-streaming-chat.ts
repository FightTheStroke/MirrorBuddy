/**
 * Streaming Chat Hook
 * Handles real-time streaming of chat responses via SSE
 *
 * @see ADR 0034 for streaming architecture
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';
import { parseSSEStream, fetchStreamingResponse } from './sse-parser';
import type {
  StreamingState,
  StreamUsage,
  UseStreamingChatOptions,
  UseStreamingChatResult,
  StreamingMessageParams,
} from './streaming-types';

// Re-export types for consumers
export type {
  StreamChatMessage,
  StreamingState,
  StreamUsage,
  UseStreamingChatOptions,
  UseStreamingChatResult,
  StreamingMessageParams,
} from './streaming-types';

/**
 * Hook for streaming chat responses
 *
 * @example
 * ```tsx
 * const { streamedContent, sendStreamingMessage, streamingState } = useStreamingChat({
 *   onChunk: (chunk, acc) => console.log('New chunk:', chunk),
 *   onComplete: (full) => console.log('Complete:', full),
 * });
 *
 * await sendStreamingMessage({
 *   messages: [{ role: 'user', content: 'Hello!' }],
 *   systemPrompt: 'You are a helpful tutor.',
 *   maestroId: 'physics',
 * });
 * ```
 */
export function useStreamingChat(options: UseStreamingChatOptions = {}): UseStreamingChatResult {
  const { onChunk, onComplete, onError, onContentFiltered } = options;

  const [streamingState, setStreamingState] = useState<StreamingState>('idle');
  const [streamedContent, setStreamedContent] = useState('');
  const [usage, setUsage] = useState<StreamUsage | null>(null);
  const [wasFiltered, setWasFiltered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const callbacksRef = useRef({ onChunk, onComplete, onError, onContentFiltered });
  callbacksRef.current = { onChunk, onComplete, onError, onContentFiltered };

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setStreamingState('idle');
      logger.debug('[StreamingChat] Stream cancelled');
    }
  }, []);

  const reset = useCallback(() => {
    cancelStream();
    setStreamedContent('');
    setUsage(null);
    setWasFiltered(false);
    setError(null);
    setStreamingState('idle');
  }, [cancelStream]);

  const sendStreamingMessage = useCallback(async (params: StreamingMessageParams) => {
    const { messages, systemPrompt, maestroId, enableMemory = true } = params;

    cancelStream();
    setStreamedContent('');
    setUsage(null);
    setWasFiltered(false);
    setError(null);
    setStreamingState('streaming');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetchStreamingResponse(
        messages,
        systemPrompt,
        maestroId,
        enableMemory,
        abortController.signal
      );

      const reader = response.body!.getReader();

      await parseSSEStream(reader, {
        onContent: (content, accumulated) => {
          setStreamedContent(accumulated);
          callbacksRef.current.onChunk?.(content, accumulated);
        },
        onUsage: (u) => {
          setUsage(u);
        },
        onFiltered: () => {
          setWasFiltered(true);
          callbacksRef.current.onContentFiltered?.();
        },
        onError: (err) => {
          throw err;
        },
        onDone: (accumulated, u) => {
          setStreamingState('complete');
          callbacksRef.current.onComplete?.(accumulated, u);
        },
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        logger.debug('[StreamingChat] Aborted');
        setStreamingState('idle');
        return;
      }

      const errorMessage = (err as Error).message || 'Streaming failed';
      logger.error('[StreamingChat] Error', { error: errorMessage });
      setError(errorMessage);
      setStreamingState('error');
      callbacksRef.current.onError?.(err as Error);
    } finally {
      abortControllerRef.current = null;
    }
  }, [cancelStream]);

  return {
    streamingState,
    streamedContent,
    usage,
    wasFiltered,
    error,
    sendStreamingMessage,
    cancelStream,
    reset,
  };
}
