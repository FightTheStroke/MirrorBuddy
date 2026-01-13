/**
 * Streaming Chat Types
 * Type definitions for streaming chat functionality
 *
 * @see ADR 0034 for streaming architecture
 */

/**
 * Message format for chat
 */
export interface StreamChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Streaming state
 */
export type StreamingState = 'idle' | 'streaming' | 'complete' | 'error';

/**
 * Usage information from API
 */
export interface StreamUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/**
 * Hook options
 */
export interface UseStreamingChatOptions {
  onChunk?: (chunk: string, accumulated: string) => void;
  onComplete?: (fullResponse: string, usage?: StreamUsage) => void;
  onError?: (error: Error) => void;
  onContentFiltered?: () => void;
}

/**
 * Hook return type
 */
export interface UseStreamingChatResult {
  /** Current streaming state */
  streamingState: StreamingState;
  /** Accumulated response text */
  streamedContent: string;
  /** Usage stats from last request */
  usage: StreamUsage | null;
  /** Content was blocked by filter */
  wasFiltered: boolean;
  /** Error message if any */
  error: string | null;
  /** Send a streaming message */
  sendStreamingMessage: (params: StreamingMessageParams) => Promise<void>;
  /** Cancel ongoing stream */
  cancelStream: () => void;
  /** Reset state for new conversation */
  reset: () => void;
}

/**
 * Parameters for sending a streaming message
 */
export interface StreamingMessageParams {
  messages: StreamChatMessage[];
  systemPrompt: string;
  maestroId: string;
  enableMemory?: boolean;
}

/**
 * Parsed SSE event data
 */
export interface SSEParsedEvent {
  type: 'content' | 'usage' | 'filtered' | 'error' | 'done';
  content?: string;
  usage?: StreamUsage;
  error?: string;
}

/**
 * SSE parser callbacks
 */
export interface SSEParserCallbacks {
  onContent: (content: string, accumulated: string) => void;
  onUsage: (usage: StreamUsage) => void;
  onFiltered: () => void;
  onError: (error: Error) => void;
  onDone: (accumulated: string, usage?: StreamUsage) => void;
}
