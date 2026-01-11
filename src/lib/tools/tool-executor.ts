// ============================================================================
// TOOL EXECUTOR FRAMEWORK
// Handles registration and execution of tool handlers
// Integrates with ToolRegistry and ToolOrchestrator for plugin system
// Related: ADR 0009 - Tool Execution Architecture
// ============================================================================

import { nanoid } from 'nanoid';
import { z } from 'zod';
import { broadcastToolEvent } from '@/lib/realtime/tool-events';
import { ToolRegistry } from '@/lib/tools/plugin/registry';
import { ToolOrchestrator } from '@/lib/tools/plugin/orchestrator';
import type { ToolType, ToolExecutionResult, ToolContext } from '@/types/tools';
import type { ToolPlugin } from '@/lib/tools/plugin/types';
import { ToolCategory, Permission } from '@/lib/tools/plugin/types';

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
    topic: z.string().min(1, 'Topic is required'),
    subtopics: z.array(z.string()).optional(),
    learningStyle: z.string().optional(),
  }),
  create_quiz: z.object({
    topic: z.string().min(1, 'Topic is required'),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    questionCount: z.number().int().min(1).max(50).optional(),
  }),
  create_flashcards: z.object({
    topic: z.string().min(1, 'Topic is required'),
    cardCount: z.number().int().min(1).max(100).optional(),
  }),
  create_demo: z.object({
    topic: z.string().min(1, 'Topic is required'),
    demonstrationType: z.string().optional(),
  }),
  create_summary: z.object({
    title: z.string().min(1, 'Title is required'),
    content: z.string().optional(),
    length: z.enum(['short', 'medium', 'long']).optional(),
  }),
} as const;

/**
 * Registry of tool handlers (maintained for backward compatibility)
 * New plugins should use ToolRegistry directly
 */
const handlers = new Map<string, ToolHandler>();

/**
 * Initialize ToolRegistry singleton and ToolOrchestrator
 * Call once during app bootstrap to prepare the plugin system
 */
let registry: ToolRegistry | null = null;
let orchestrator: ToolOrchestrator | null = null;

function initializeRegistry(): void {
  if (!registry) {
    registry = ToolRegistry.getInstance();
    orchestrator = new ToolOrchestrator(registry);
    if (process.env.NODE_ENV === 'development') {
      console.debug('Tool executor: ToolRegistry and ToolOrchestrator initialized');
    }
  }
}

/**
 * Register a tool handler for a function name
 * Maintains backward compatibility while syncing with ToolRegistry
 * @param functionName - OpenAI function name (e.g., 'create_mindmap')
 * @param handler - Async function that executes the tool
 */
export function registerToolHandler(
  functionName: string,
  handler: ToolHandler
): void {
  // Store in legacy handlers map for backward compatibility
  handlers.set(functionName, handler);

  // Also register with ToolRegistry if initialized
  initializeRegistry();
  if (registry && orchestrator) {
    const toolType = getToolTypeFromFunctionName(functionName);
    const schema = getToolSchema(functionName);

    try {
      // Create a minimal ToolPlugin from the legacy handler
      const plugin: ToolPlugin = {
        id: functionName,
        name: functionName.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()),
        category: ToolCategory.CREATION,
        handler: async (args: Record<string, unknown>, context) => {
          return handler(args, {
            sessionId: context.sessionId,
            userId: context.userId,
            maestroId: context.maestroId,
            conversationId: context.conversationId,
          });
        },
        schema: (schema || z.object({})) as z.ZodSchema<Record<string, unknown>>,
        voicePrompt: `Create ${functionName.replace(/_/g, ' ')}`,
        voiceFeedback: `${functionName.replace(/_/g, ' ')} created successfully`,
        triggers: [functionName],
        prerequisites: [],
        permissions: [],
      };

      // Register if not already registered
      if (!registry.has(functionName)) {
        registry.register(plugin);
      }
    } catch (error) {
      console.warn(`Failed to register ${functionName} with ToolRegistry:`, error);
      // Continue with legacy handler even if registry sync fails
    }
  }
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
 * Attempts to use ToolOrchestrator; falls back to legacy handler if not registered
 * Maintains all event broadcasting for real-time updates
 *
 * @param functionName - Name of the function to call (from OpenAI tool_calls)
 * @param args - Arguments from the function call
 * @param context - Session context (sessionId, userId, maestroId)
 */
export async function executeToolCall(
  functionName: string,
  args: Record<string, unknown>,
  context: ToolContext
): Promise<ToolExecutionResult> {
  const toolId = nanoid();
  const toolType = getToolTypeFromFunctionName(functionName);

  // Try to use ToolOrchestrator if initialized
  initializeRegistry();

  // First try to validate and execute via orchestrator if tool is registered
  if (registry && orchestrator && registry.has(functionName)) {
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
      // Build orchestrator context
      const orchestratorContext = {
        userId: context.userId || 'unknown',
        sessionId: context.sessionId || 'unknown',
        maestroId: context.maestroId,
        conversationId: context.conversationId,
        conversationHistory: [],
        userProfile: null,
        activeTools: [],
      };

      // Execute through orchestrator
      const result = await orchestrator.execute(functionName, args, orchestratorContext);

      // Convert orchestrator result to ToolExecutionResult
      if (result.success) {
        return {
          success: true,
          toolId,
          toolType,
          data: result.output,
        };
      } else {
        // Broadcast error event
        broadcastToolEvent({
          id: toolId,
          type: 'tool:error',
          toolType: toolType as 'mindmap' | 'flashcard' | 'quiz' | 'summary' | 'timeline' | 'diagram',
          sessionId: context.sessionId || 'unknown',
          maestroId: context.maestroId || 'unknown',
          timestamp: Date.now(),
          data: { error: result.error || 'Unknown error' },
        });

        return {
          success: false,
          toolId,
          toolType,
          error: result.error || 'Unknown error',
        };
      }
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

  // Fallback to legacy handler mechanism for backward compatibility
  const handler = handlers.get(functionName);

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

/**
 * Get the ToolRegistry singleton instance
 * Initializes if not already done
 */
export function getToolRegistry(): ToolRegistry {
  initializeRegistry();
  return registry!;
}

/**
 * Get the ToolOrchestrator instance
 * Initializes if not already done
 */
export function getToolOrchestrator(): ToolOrchestrator {
  initializeRegistry();
  return orchestrator!;
}
