/**
 * Streaming callbacks factory for character chat
 */

import type { Message } from './types';
import type { ToolState } from '@/types/tools';
import { createErrorMessage } from './message-handler';

export interface StreamingCallbacksParams {
  setIsStreaming: (v: boolean) => void;
  setStreamedContent: (v: string) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setIsLoading: (v: boolean) => void;
  setActiveTool: (v: ToolState | null) => void;
  addMessageToStore: (convId: string, msg: { role: 'user' | 'assistant'; content: string }) => void;
  conversationIdRef: React.MutableRefObject<string | null>;
  streamAbortRef: React.MutableRefObject<AbortController | null>;
}

export function createStreamingCallbacks(params: StreamingCallbacksParams) {
  const {
    setIsStreaming,
    setStreamedContent,
    setMessages,
    setIsLoading,
    setActiveTool,
    addMessageToStore,
    conversationIdRef,
    streamAbortRef,
  } = params;

  return {
    onStreamingStart: (id: string) => {
      setIsStreaming(true);
      setMessages((prev) => [...prev, { id, role: 'assistant', content: '', timestamp: new Date() }]);
    },
    onStreamingChunk: (id: string, accumulated: string) => {
      setStreamedContent(accumulated);
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content: accumulated } : m)));
    },
    onStreamingComplete: (id: string, fullResponse: string) => {
      setIsStreaming(false);
      streamAbortRef.current = null;
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, id: `assistant-${Date.now()}`, content: fullResponse } : m))
      );
      if (conversationIdRef.current) {
        addMessageToStore(conversationIdRef.current, { role: 'assistant', content: fullResponse });
      }
      setIsLoading(false);
    },
    onStreamingError: (id: string) => {
      setIsStreaming(false);
      streamAbortRef.current = null;
      setMessages((prev) => [...prev.filter((m) => m.id !== id), createErrorMessage()]);
      setIsLoading(false);
    },
    onStreamingFallback: (id: string) => {
      setIsStreaming(false);
      setMessages((prev) => prev.filter((m) => m.id !== id));
    },
    onNonStreamingComplete: (assistantMessage: Message, toolState: ToolState | null) => {
      setMessages((prev) => [...prev, assistantMessage]);
      if (conversationIdRef.current) {
        addMessageToStore(conversationIdRef.current, { role: 'assistant', content: assistantMessage.content });
      }
      if (toolState) setActiveTool(toolState);
      setIsLoading(false);
    },
    onError: () => {
      setMessages((prev) => [...prev, createErrorMessage()]);
      setIsLoading(false);
    },
  };
}
