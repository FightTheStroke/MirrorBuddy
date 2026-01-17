/**
 * Send Message Handler
 * Handles sending messages with streaming or non-streaming flow
 */

import { logger } from "@/lib/logger";
import type { CharacterInfo } from "../../utils/character-utils";
import type { Message } from "./types";
import {
  sendChatMessage,
  createAssistantMessage,
  createErrorMessage,
  type ChatUsage,
  type SafetyBlockEvent,
} from "./message-handler";
import { sendStreamingMessage, messageRequiresTool } from "./streaming-handler";
import type { ToolState } from "@/types/tools";

/** Metrics data from chat turn (REAL data from API) */
export interface TurnMetricsData {
  usage: ChatUsage | null;
  latencyMs: number;
  safetyEvent?: SafetyBlockEvent | null;
}

export interface SendMessageCallbacks {
  onStreamingStart: (streamingMsgId: string) => void;
  onStreamingChunk: (streamingMsgId: string, accumulated: string) => void;
  onStreamingComplete: (
    streamingMsgId: string,
    fullResponse: string,
    metrics?: TurnMetricsData,
  ) => void;
  onStreamingError: (streamingMsgId: string) => void;
  onStreamingFallback: (streamingMsgId: string) => void;
  onNonStreamingComplete: (
    message: Message,
    toolState: ToolState | null,
    metrics: TurnMetricsData,
  ) => void;
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
export async function handleSendMessage(
  options: SendMessageOptions,
): Promise<boolean> {
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
      onComplete: (fullResponse, usage, latencyMs) => {
        callbacks.onStreamingComplete(streamingMsgId, fullResponse, {
          usage,
          latencyMs,
        });
      },
      onError: (error) => {
        logger.error("Streaming error", undefined, error);
        callbacks.onStreamingError(streamingMsgId);
      },
    });

    if (streamed) return true;

    // Fallback to non-streaming
    callbacks.onStreamingFallback(streamingMsgId);
  }

  // Non-streaming path
  try {
    const { responseContent, toolState, usage, latencyMs, safetyEvent } =
      await sendChatMessage(content, messages, character, characterId);

    const assistantMessage = createAssistantMessage(responseContent);
    callbacks.onNonStreamingComplete(assistantMessage, toolState, {
      usage,
      latencyMs,
      safetyEvent,
    });
    return false;
  } catch (error) {
    logger.error("Chat error", undefined, error);
    callbacks.onError();
    return false;
  }
}

/**
 * Create error message for UI
 */
export { createErrorMessage };
