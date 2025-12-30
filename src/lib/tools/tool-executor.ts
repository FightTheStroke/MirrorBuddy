// ============================================================================
// TOOL EXECUTOR FRAMEWORK
// Handles registration and execution of tool handlers
// Related: ADR 0009 - Tool Execution Architecture
// ============================================================================

import { nanoid } from 'nanoid';
import { broadcastToolEvent } from '@/lib/realtime/tool-events';
import type { ToolType, ToolExecutionResult, ToolContext } from '@/types/tools';

/**
 * Tool handler function signature
 */
type ToolHandler = (
  args: Record<string, unknown>,
  context: ToolContext
) => Promise<ToolExecutionResult>;

/**
 * Registry of tool handlers
 */
const handlers = new Map<string, ToolHandler>();

/**
 * Register a tool handler for a function name
 * @param functionName - OpenAI function name (e.g., 'create_mindmap')
 * @param handler - Async function that executes the tool
 */
export function registerToolHandler(
  functionName: string,
  handler: ToolHandler
): void {
  handlers.set(functionName, handler);
}

/**
 * Get all registered handlers (for testing)
 */
export function getRegisteredHandlers(): Map<string, ToolHandler> {
  return new Map(handlers);
}

/**
 * Clear all handlers (for testing)
 */
export function clearHandlers(): void {
  handlers.clear();
}

/**
 * Map function names to tool types
 */
function getToolTypeFromFunctionName(functionName: string): ToolType {
  const mapping: Record<string, ToolType> = {
    create_mindmap: 'mindmap',
    create_quiz: 'quiz',
    create_demo: 'demo',
    web_search: 'search',
    create_flashcards: 'flashcard',
    create_diagram: 'diagram',
    create_timeline: 'timeline',
    create_summary: 'summary',
    create_formula: 'formula',
    create_chart: 'chart',
  };
  return mapping[functionName] || 'mindmap';
}

/**
 * Execute a tool call
 * @param functionName - Name of the function to call (from OpenAI tool_calls)
 * @param args - Arguments from the function call
 * @param context - Session context (sessionId, userId, maestroId)
 */
export async function executeToolCall(
  functionName: string,
  args: Record<string, unknown>,
  context: ToolContext
): Promise<ToolExecutionResult> {
  const handler = handlers.get(functionName);
  const toolId = nanoid();
  const toolType = getToolTypeFromFunctionName(functionName);

  if (!handler) {
    const error = `Unknown tool: ${functionName}`;

    // Broadcast error event
    broadcastToolEvent({
      id: toolId,
      type: 'tool:error',
      toolType: toolType as 'mindmap' | 'flashcards' | 'quiz' | 'summary' | 'timeline' | 'diagram',
      sessionId: context.sessionId || 'unknown',
      maestroId: context.maestroId || 'unknown',
      timestamp: Date.now(),
      data: { error },
    });

    return {
      success: false,
      toolId,
      toolType,
      error,
    };
  }

  // Broadcast tool started event
  broadcastToolEvent({
    id: toolId,
    type: 'tool:created',
    toolType: toolType as 'mindmap' | 'flashcards' | 'quiz' | 'summary' | 'timeline' | 'diagram',
    sessionId: context.sessionId || 'unknown',
    maestroId: context.maestroId || 'unknown',
    timestamp: Date.now(),
    data: {
      title: (args.topic as string) || (args.title as string) || functionName,
    },
  });

  try {
    const result = await handler(args, context);

    // Ensure toolId is set
    result.toolId = result.toolId || toolId;

    // Broadcast completion event
    broadcastToolEvent({
      id: result.toolId,
      type: 'tool:complete',
      toolType: result.toolType as 'mindmap' | 'flashcards' | 'quiz' | 'summary' | 'timeline' | 'diagram',
      sessionId: context.sessionId || 'unknown',
      maestroId: context.maestroId || 'unknown',
      timestamp: Date.now(),
      data: {
        content: result.data,
      },
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Broadcast error event
    broadcastToolEvent({
      id: toolId,
      type: 'tool:error',
      toolType: toolType as 'mindmap' | 'flashcards' | 'quiz' | 'summary' | 'timeline' | 'diagram',
      sessionId: context.sessionId || 'unknown',
      maestroId: context.maestroId || 'unknown',
      timestamp: Date.now(),
      data: { error: errorMessage },
    });

    return {
      success: false,
      toolId,
      toolType,
      error: errorMessage,
    };
  }
}

/**
 * Check if a tool handler is registered
 */
export function hasToolHandler(functionName: string): boolean {
  return handlers.has(functionName);
}

/**
 * Get list of registered tool function names
 */
export function getRegisteredToolNames(): string[] {
  return Array.from(handlers.keys());
}
