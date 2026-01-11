// ============================================================================
// TOOL EXECUTOR FRAMEWORK
// Handles registration and execution of tool handlers
// Related: ADR 0009 - Tool Execution Architecture
// ============================================================================

import { nanoid } from 'nanoid';
import { z } from 'zod';
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
 * Zod validation schemas for tool arguments
 * Ensures type safety and graceful error handling for tool inputs
 */
const TOOL_SCHEMAS = {
  create_mindmap: z.object({
    title: z.string().min(1, 'Title is required'),
    nodes: z.array(z.object({
      id: z.string(),
      label: z.string(),
      parentId: z.string().optional(),
    })).min(1, 'At least one node is required'),
  }),
  create_quiz: z.object({
    topic: z.string().min(1, 'Topic is required'),
    questions: z.array(z.object({
      question: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number(),
      explanation: z.string().optional(),
    })).min(1, 'At least one question is required'),
  }),
  create_flashcards: z.object({
    topic: z.string().min(1, 'Topic is required'),
    cards: z.array(z.object({
      front: z.string(),
      back: z.string(),
    })).min(1, 'At least one card is required'),
  }),
  create_demo: z.object({
    title: z.string().min(1, 'Title is required'),
    concept: z.string().min(1, 'Concept is required'),
    visualization: z.string().min(1, 'Visualization is required'),
    interaction: z.string().min(1, 'Interaction is required'),
    wowFactor: z.string().optional(),
  }),
  create_summary: z.object({
    topic: z.string().min(1, 'Topic is required'),
    sections: z.array(z.object({
      title: z.string(),
      content: z.string(),
      keyPoints: z.array(z.string()).optional(),
    })).min(1, 'At least one section is required'),
  }),
  web_search: z.object({
    query: z.string().min(1, 'Query is required'),
    type: z.enum(['web', 'youtube', 'all']).optional(),
  }),
  open_student_summary: z.object({
    topic: z.string().min(1, 'Topic is required'),
  }),
  student_summary_add_comment: z.object({
    sectionId: z.enum(['intro', 'main', 'conclusion']),
    startOffset: z.number(),
    endOffset: z.number(),
    text: z.string().min(1, 'Comment text is required'),
  }),
  create_diagram: z.object({
    topic: z.string().min(1, 'Topic is required'),
    diagramType: z.enum(['flowchart', 'sequence', 'class', 'er']),
    mermaidCode: z.string().min(1, 'Mermaid code is required'),
  }),
  create_timeline: z.object({
    topic: z.string().min(1, 'Topic is required'),
    period: z.string().optional(),
    events: z.array(z.object({
      date: z.string(),
      title: z.string(),
      description: z.string().optional(),
    })).min(1, 'At least one event is required'),
  }),
  search_archive: z.object({
    query: z.string().optional(),
    toolType: z.enum(['mindmap', 'quiz', 'flashcard', 'summary', 'demo', 'homework', 'diagram', 'timeline']).optional(),
    subject: z.string().optional(),
  }),
} as const;

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
 * Get validation schema for a tool (if one exists)
 */
function getToolSchema(
  functionName: string
): z.ZodSchema | undefined {
  return TOOL_SCHEMAS[functionName as keyof typeof TOOL_SCHEMAS];
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
      toolType: toolType as 'mindmap' | 'flashcard' | 'quiz' | 'summary' | 'timeline' | 'diagram',
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

  // Validate arguments if schema exists
  const schema = getToolSchema(functionName);
  if (schema) {
    const validation = schema.safeParse(args);
    if (!validation.success) {
      const validationError = validation.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      const error = `Invalid arguments for ${functionName}: ${validationError}`;

      console.warn(`[Tool Validation] ${error}`);

      // Broadcast error event
      broadcastToolEvent({
        id: toolId,
        type: 'tool:error',
        toolType: toolType as 'mindmap' | 'flashcard' | 'quiz' | 'summary' | 'timeline' | 'diagram',
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
  }

  // Broadcast tool started event
  broadcastToolEvent({
    id: toolId,
    type: 'tool:created',
    toolType: toolType as 'mindmap' | 'flashcard' | 'quiz' | 'summary' | 'timeline' | 'diagram',
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
      toolType: result.toolType as 'mindmap' | 'flashcard' | 'quiz' | 'summary' | 'timeline' | 'diagram',
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
      toolType: toolType as 'mindmap' | 'flashcard' | 'quiz' | 'summary' | 'timeline' | 'diagram',
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
