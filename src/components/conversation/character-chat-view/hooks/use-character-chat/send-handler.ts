/**
 * Send Message Handler
 * Handles sending messages with streaming or non-streaming flow
 */

import { logger } from '@/lib/logger';
import type { CharacterInfo } from '../../utils/character-utils';
import type { Message } from './types';
import { sendChatMessage, createAssistantMessage, createErrorMessage } from './message-handler';
import { sendStreamingMessage, messageRequiresTool } from './streaming-handler';
import type { ToolState } from '@/types/tools';

export interface SendMessageCallbacks {
  onStreamingStart: (streamingMsgId: string) => void;
  onStreamingChunk: (streamingMsgId: string, accumulated: string) => void;
  onStreamingComplete: (streamingMsgId: string, fullResponse: string) => void;
  onStreamingError: (streamingMsgId: string) => void;
  onStreamingFallback: (streamingMsgId: string) => void;
  onNonStreamingComplete: (message: Message, toolState: ToolState | null) => void;
  onError: () => void;
}

export interface SendMessageOptions {
  content: string;
  messages: Message[];
  character: CharacterInfo;
  characterId: string;
  streamingEnabled: boolean;
  signal: AbortSignal;
  callbacks: SendMessageCallbacks;
}

/**
 * Send a message with automatic streaming/non-streaming routing
 * Returns true if streaming was used, false if non-streaming
 */
export async function handleSendMessage(options: SendMessageOptions): Promise<boolean> {
  const {
    content,
    messages,
    character,
    characterId,
    streamingEnabled,
    signal,
    callbacks,
  } = options;

  const needsTool = messageRequiresTool(content);

  // Try streaming if enabled AND message doesn't require tools
  if (streamingEnabled && !needsTool) {
    const streamingMsgId = `streaming-${Date.now()}`;
    callbacks.onStreamingStart(streamingMsgId);

    const streamed = await sendStreamingMessage({
      input: content,
      messages,
      character,
      characterId,
      signal,
      onChunk: (_chunk, accumulated) => {
        callbacks.onStreamingChunk(streamingMsgId, accumulated);
      },
      onComplete: (fullResponse) => {
        callbacks.onStreamingComplete(streamingMsgId, fullResponse);
      },
      onError: (error) => {
        logger.error('Streaming error', { error });
        callbacks.onStreamingError(streamingMsgId);
      },
    });

    if (streamed) return true;

    // Fallback to non-streaming
    callbacks.onStreamingFallback(streamingMsgId);
  }

  // Non-streaming path
  try {
    const { responseContent, toolState } = await sendChatMessage(
      content,
      messages,
      character,
      characterId
    );

    const assistantMessage = createAssistantMessage(responseContent);
    callbacks.onNonStreamingComplete(assistantMessage, toolState);
    return false;
  } catch (error) {
    logger.error('Chat error', { error });
    callbacks.onError();
    return false;
  }
}

/**
 * Create error message for UI
 */
export { createErrorMessage };
