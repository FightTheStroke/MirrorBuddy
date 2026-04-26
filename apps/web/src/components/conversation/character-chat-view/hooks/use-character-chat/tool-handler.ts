/**
 * Tool request handling logic
 */

import { csrfFetch } from "@/lib/auth";
import type { Message } from "./types";
import type { CharacterInfo } from "../../utils/character-utils";
import type { ToolType, ToolState } from "@/types/tools";
import { functionNameToToolType } from "@/lib/tools/constants";

const TOOL_PROMPTS: Partial<Record<ToolType, string>> = {
  mindmap: "Crea una mappa mentale sull'argomento che stiamo studiando",
  quiz: "Fammi un quiz per verificare cosa ho capito",
  flashcard: "Crea delle flashcard per aiutarmi a memorizzare",
  demo: "Mostrami una demo interattiva",
  summary: "Fammi un riassunto strutturato",
  diagram: "Crea un diagramma",
  timeline: "Crea una linea del tempo",
};

/**
 * Request a specific tool from the AI
 */
export async function requestTool(
  toolType: ToolType,
  messages: Message[],
  character: CharacterInfo,
  characterId: string,
  language: "it" | "en" | "es" | "fr" | "de" = "it",
): Promise<{
  assistantMessage: Message | null;
  toolState: ToolState;
}> {
  const toolPrompt = TOOL_PROMPTS[toolType] || `Usa lo strumento ${toolType}`;

  const response = await csrfFetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({
      messages: [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: toolPrompt },
      ],
      systemPrompt: character.systemPrompt,
      maestroId: characterId,
      enableTools: true,
      requestedTool: toolType === "flashcard" ? "flashcard" : toolType,
      language,
    }),
  });

  if (!response.ok) throw new Error("Failed to request tool");

  const data = await response.json();

  const assistantMessage: Message | null = data.content
    ? {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
      }
    : null;

  const toolState: ToolState = {
    id: `tool-${Date.now()}`,
    type: toolType,
    status: "initializing",
    progress: 0,
    content: null,
    createdAt: new Date(),
  };

  if (data.toolCalls?.length > 0) {
    const toolCall = data.toolCalls[0];
    const mappedToolType = functionNameToToolType(toolCall.type) || toolType;
    const toolContent =
      toolCall.result?.data || toolCall.result || toolCall.arguments;

    return {
      assistantMessage,
      toolState: {
        ...toolState,
        type: mappedToolType,
        status: "completed",
        progress: 1,
        content: toolContent,
      },
    };
  }

  return { assistantMessage, toolState: { ...toolState, status: "error" } };
}

/**
 * Create error tool state
 */
export function createErrorToolState(
  toolType: ToolType,
  error: string,
): ToolState {
  return {
    id: `tool-${Date.now()}`,
    type: toolType,
    status: "error",
    progress: 0,
    content: null,
    error,
    createdAt: new Date(),
  };
}

/**
 * Create initial tool state
 */
export function createInitialToolState(toolType: ToolType): ToolState {
  return {
    id: `tool-${Date.now()}`,
    type: toolType,
    status: "initializing",
    progress: 0,
    content: null,
    createdAt: new Date(),
  };
}
