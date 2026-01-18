/**
 * Message sending and chat API logic
 */

import { logger } from "@/lib/logger";
import { csrfFetch } from "@/lib/auth/csrf-client";
import type { Message } from "./types";
import type { CharacterInfo } from "../../utils/character-utils";
import type { ToolState, ToolType, ToolCallRef } from "@/types/tools";

/** REAL usage data from API response (not estimated) */
export interface ChatUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/** Safety event data when content is blocked */
export interface SafetyBlockEvent {
  blocked: true;
  category: string;
}

/**
 * Send message to chat API and handle response.
 * Returns REAL usage data from API for metrics tracking.
 * Returns safety event when content is blocked by safety filter.
 */
export async function sendChatMessage(
  input: string,
  messages: Message[],
  character: CharacterInfo,
  characterId: string,
  enableTools: boolean = true,
  language: "it" | "en" | "es" | "fr" | "de" = "it",
): Promise<{
  responseContent: string;
  toolState: ToolState | null;
  usage: ChatUsage | null;
  latencyMs: number;
  safetyEvent: SafetyBlockEvent | null;
}> {
  const startTime = performance.now();
  const response = await csrfFetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({
      messages: [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: input },
      ],
      systemPrompt: character.systemPrompt,
      maestroId: characterId,
      enableTools,
      language,
    }),
  });

  if (!response.ok) throw new Error("Failed to send message");

  const data = await response.json();

  let responseContent = data.content || data.message;
  if (!responseContent || responseContent.trim() === "") {
    responseContent = generateDefaultResponse(data.toolCalls);
  }

  let toolState: ToolState | null = null;
  if (data.toolCalls && data.toolCalls.length > 0) {
    const toolCall = data.toolCalls[0] as ToolCallRef;
    const toolType = toolCall.type as ToolType;

    // Get tool content from API response
    // Priority: data (inline) > arguments (fallback) > fetch from Material table
    let toolContent = null;
    const toolCallData = toolCall as ToolCallRef & {
      data?: unknown;
      arguments?: Record<string, unknown>;
    };

    // Try inline data first (new format)
    if (toolCallData.data) {
      toolContent = toolCallData.data;
    }
    // Fallback to arguments
    else if (toolCallData.arguments) {
      toolContent = toolCallData.arguments;
    }
    // Last resort: fetch from Material table
    else if (toolCall.materialId) {
      try {
        const materialResponse = await fetch(
          `/api/materials/${toolCall.materialId}`,
        );
        if (materialResponse.ok) {
          const materialData = await materialResponse.json();
          toolContent = materialData.material?.content || null;
        }
      } catch (error) {
        logger.warn("Failed to fetch material content", {
          error: String(error),
        });
      }
    }

    toolState = {
      id: toolCall.id,
      type: toolType,
      status: "completed",
      progress: 1,
      content: toolContent,
      createdAt: new Date(),
    };
  }

  const latencyMs = Math.round(performance.now() - startTime);

  // Extract REAL usage from API response (null if not provided)
  const usage: ChatUsage | null = data.usage
    ? {
        prompt_tokens: data.usage.prompt_tokens || 0,
        completion_tokens: data.usage.completion_tokens || 0,
        total_tokens: data.usage.total_tokens || 0,
      }
    : null;

  // Check for safety filter block
  const safetyEvent: SafetyBlockEvent | null = data.blocked
    ? { blocked: true, category: data.category || "unknown" }
    : null;

  return { responseContent, toolState, usage, latencyMs, safetyEvent };
}

/**
 * Generate default response based on tool calls
 */
function generateDefaultResponse(toolCalls: Array<{ type?: string }>): string {
  if (!toolCalls || toolCalls.length === 0) {
    return "Mi dispiace, non ho capito. Puoi ripetere?";
  }

  const toolNames = toolCalls.map((tc) => tc.type);

  if (toolNames.includes("mindmap")) {
    return "Ti sto creando la mappa mentale...";
  } else if (toolNames.includes("quiz")) {
    return "Ti sto preparando il quiz...";
  } else if (toolNames.includes("flashcard")) {
    return "Ti sto creando le flashcard...";
  } else if (toolNames.includes("summary")) {
    return "Ti sto preparando il riassunto...";
  }

  return "Sto elaborando la tua richiesta...";
}

/**
 * Create user message
 */
export function createUserMessage(content: string): Message {
  return {
    id: `user-${Date.now()}`,
    role: "user",
    content: content.trim(),
    timestamp: new Date(),
  };
}

/**
 * Create assistant message
 */
export function createAssistantMessage(content: string): Message {
  return {
    id: `assistant-${Date.now()}`,
    role: "assistant",
    content,
    timestamp: new Date(),
  };
}

/**
 * Create error message
 */
export function createErrorMessage(): Message {
  return {
    id: `error-${Date.now()}`,
    role: "assistant",
    content: "Mi dispiace, c'è stato un errore. Riprova tra poco!",
    timestamp: new Date(),
  };
}
