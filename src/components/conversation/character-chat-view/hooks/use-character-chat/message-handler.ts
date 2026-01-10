/**
 * Message sending and chat API logic
 */

import type { Message } from './types';
import type { CharacterInfo } from '../../utils/character-utils';
import type { ToolState, ToolType, ToolCallRef, ToolCall } from '@/types/tools';

export const FUNCTION_NAME_TO_TOOL_TYPE: Record<string, ToolType> = {
  create_mindmap: 'mindmap',
  create_quiz: 'quiz',
  create_demo: 'demo',
  web_search: 'search',
  create_flashcards: 'flashcard',
  create_diagram: 'diagram',
  create_timeline: 'timeline',
  create_summary: 'summary',
  open_student_summary: 'summary',
};

/**
 * Send message to chat API and handle response
 */
export async function sendChatMessage(
  input: string,
  messages: Message[],
  character: CharacterInfo,
  characterId: string,
  enableTools: boolean = true
): Promise<{
  responseContent: string;
  toolState: ToolState | null;
}> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: input },
      ],
      systemPrompt: character.systemPrompt,
      maestroId: characterId,
      enableTools,
    }),
  });

  if (!response.ok) throw new Error('Failed to send message');

  const data = await response.json();

  let responseContent = data.content || data.message;
  if (!responseContent || responseContent.trim() === '') {
    responseContent = generateDefaultResponse(data.toolCalls);
  }

  let toolState: ToolState | null = null;
  if (data.toolCalls && data.toolCalls.length > 0) {
    const toolCall = data.toolCalls[0] as ToolCallRef;
    const toolType = toolCall.type as ToolType;

    // Handle both old format (with result.data) and new format (with materialId)
    let toolContent = null;
    const toolCallWithFallback = toolCall as ToolCallRef | (ToolCall & { result: { data: unknown } });

    // Try to get content from result.data (old format with full data)
    if ('result' in toolCallWithFallback &&
        typeof toolCallWithFallback.result === 'object' &&
        toolCallWithFallback.result !== null &&
        'data' in toolCallWithFallback.result) {
      toolContent = (toolCallWithFallback.result as { data: unknown }).data;
    } else if (toolCall.materialId) {
      // New format: fetch from Material table
      try {
        const materialResponse = await fetch(`/api/materials/${toolCall.materialId}`);
        if (materialResponse.ok) {
          const data = await materialResponse.json();
          // Response wraps material in { material: parsed }
          toolContent = data.material?.content || null;
        }
      } catch (error) {
        console.warn('Failed to fetch material content:', error);
        // Fall back to empty content, UI will display error
      }
    }

    // If no content found, use arguments as fallback
    if (!toolContent && 'arguments' in toolCallWithFallback) {
      toolContent = (toolCallWithFallback as ToolCall).arguments || null;
    }

    toolState = {
      id: toolCall.id,
      type: toolType,
      status: 'completed',
      progress: 1,
      content: toolContent,
      createdAt: new Date(),
    };
  }

  return { responseContent, toolState };
}

/**
 * Generate default response based on tool calls
 */
function generateDefaultResponse(toolCalls: Array<{ type?: string }>): string {
  if (!toolCalls || toolCalls.length === 0) {
    return 'Mi dispiace, non ho capito. Puoi ripetere?';
  }

  const toolNames = toolCalls.map((tc) => tc.type);

  if (toolNames.includes('create_mindmap')) {
    return 'Ti sto creando la mappa mentale...';
  } else if (toolNames.includes('create_quiz')) {
    return 'Ti sto preparando il quiz...';
  } else if (toolNames.includes('create_flashcards')) {
    return 'Ti sto creando le flashcard...';
  } else if (toolNames.includes('create_summary')) {
    return 'Ti sto preparando il riassunto...';
  }

  return 'Sto elaborando la tua richiesta...';
}

/**
 * Create user message
 */
export function createUserMessage(content: string): Message {
  return {
    id: `user-${Date.now()}`,
    role: 'user',
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
    role: 'assistant',
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
    role: 'assistant',
    content: 'Mi dispiace, c\'è stato un errore. Riprova tra poco!',
    timestamp: new Date(),
  };
}
