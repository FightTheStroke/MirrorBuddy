// ============================================================================
// TOOL EXECUTOR FRAMEWORK
// Handles registration and execution of tool handlers
// Integrates with ToolRegistry and ToolOrchestrator for plugin system
// Related: ADR 0009 - Tool Execution Architecture
// ============================================================================

import { nanoid } from 'nanoid';
import { z } from 'zod';
import { ToolRegistry } from '@/lib/tools/plugin/registry';
import { ToolOrchestrator } from '@/lib/tools/plugin/orchestrator';
import type { ToolType, ToolExecutionResult, ToolContext } from '@/types/tools';
import type { ToolPlugin } from '@/lib/tools/plugin/types';
import { ToolCategory, Permission as _Permission } from '@/lib/tools/plugin/types';

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
 * LEGACY: Registry of tool handlers (maintained for backward compatibility only)
 *
 * DEPRECATION: This Map is a transitional mechanism and will be removed once all
 * handlers are migrated to register directly with ToolRegistry.
 *
 * See executeToolCall() for how this interacts with the new ToolRegistry system.
 * Current role: Fallback handler lookup when ToolRegistry doesn't contain a tool.
 *
 * Handlers are registered to BOTH this Map and ToolRegistry via registerToolHandler()
 * to support the transition period. New code should use ToolRegistry directly.
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
 * DUAL REGISTRATION: Stores in both legacy Map and ToolRegistry
 * Maintains backward compatibility while syncing with the new ToolRegistry system
 *
 * DEPRECATION: This function will be replaced with direct ToolRegistry.register() calls.
 * Currently it serves as a bridge during the transition from Map-based to plugin-based system.
 *
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
    const _toolType = getToolTypeFromFunctionName(functionName);
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
 * DEPRECATED: Get all registered handlers from legacy Map
 * Used only in tests for backward compatibility verification
 * For production code, use getToolRegistry().getAll() instead
 */
export function getRegisteredHandlers(): Map<string, ToolHandler> {
  return new Map(handlers);
}

/**
 * DEPRECATED: Clear all legacy handlers
 * Used only in tests for cleanup between test runs
 * Does not affect ToolRegistry state - call getToolRegistry().clear() separately if needed
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
    open_student_summary: 'summary',
    student_summary_add_comment: 'summary',
    create_formula: 'formula',
    create_chart: 'chart',
    create_calculator: 'calculator',
  };
  return mapping[functionName] || 'mindmap';
}

/**
 * Execute a tool call
 * DUAL EXECUTION PATH:
 * 1. Primary (NEW): ToolRegistry + ToolOrchestrator (preferred)
 * 2. Fallback (LEGACY): Direct handler from legacy Map (backward compatibility)
 *
 * Execution flow:
 * - If tool found in ToolRegistry: Execute via ToolOrchestrator
 * - Otherwise: Fall back to legacy handler from Map
 * - If no handler found anywhere: Return error
 *
 * Tool events are broadcast via ToolOrchestrator's unified EventBroadcaster,
 * supporting both WebRTC DataChannel and SSE fallback (F-08, F-14).
 * The SSE-only broadcasting in this module has been consolidated (W4-WebRTCUnification).
 *
 * @param functionName - Name of the function to call (from OpenAI tool_calls)
 * @param args - Arguments from the function call
 * @param context - Session context (sessionId, userId, maestroId)
 * @returns ToolExecutionResult with success status and output data
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
    // Tool events are now broadcast through ToolOrchestrator's unified EventBroadcaster
    // which supports both WebRTC DataChannel and SSE fallback (F-08, F-14)

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
      // Errors are broadcast through ToolOrchestrator's EventBroadcaster
      // Note: Legacy handlers return ToolExecutionResult with data property,
      // while plugin handlers may return ToolResult with output property
      if (result.success) {
        // Respect handler's toolId if provided, otherwise use generated one
        // Legacy handlers return ToolExecutionResult with toolId, cast safely
        const resultAny = result as unknown as Record<string, unknown>;
        const handlerToolId = resultAny.toolId as string | undefined;
        return {
          success: true,
          toolId: handlerToolId || toolId,
          toolType,
          data: result.data ?? result.output,
        };
      } else {
        return {
          success: false,
          toolId,
          toolType,
          error: result.error || 'Unknown error',
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Error broadcast handled by ToolOrchestrator's EventBroadcaster
      return {
        success: false,
        toolId,
        toolType,
        error: errorMessage,
      };
    }
  }

  // LEGACY FALLBACK PATH: Try to execute via legacy handler Map
  // This is reached only if tool is NOT in ToolRegistry (primary system)
  // Maintained for backward compatibility during transition to plugin-based system
  const handler = handlers.get(functionName);

  if (!handler) {
    const error = `Unknown tool: ${functionName} (not found in ToolRegistry or legacy handlers)`;

    // Log error - broadcasting would be handled by ToolOrchestrator if tool was registered
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

      // Broadcast would be handled by ToolOrchestrator for registered tools
      return {
        success: false,
        toolId,
        toolType,
        error,
      };
    }
  }

  // Tool events are broadcast through ToolOrchestrator's unified EventBroadcaster
  // For legacy handlers, minimal broadcast is expected
  try {
    const result = await handler(args, context);

    // Ensure toolId is set
    result.toolId = result.toolId || toolId;

    // Completion broadcast handled by ToolOrchestrator's EventBroadcaster for registered tools
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Error broadcast handled by ToolOrchestrator's EventBroadcaster for registered tools
    return {
      success: false,
      toolId,
      toolType,
      error: errorMessage,
    };
  }
}

/**
 * DEPRECATED: Check if a tool handler is registered in legacy Map
 * Checks both fallback Map (legacy) and ToolRegistry (new system)
 * @returns true if tool exists in either legacy Map or ToolRegistry
 */
export function hasToolHandler(functionName: string): boolean {
  // Check both legacy Map and new ToolRegistry
  if (handlers.has(functionName)) {
    return true;
  }
  initializeRegistry();
  return registry ? registry.has(functionName) : false;
}

/**
 * DEPRECATED: Get list of registered tool function names from legacy Map
 * Returns only handlers in the fallback Map, not ToolRegistry.
 * Use getToolRegistry().getAll() for the authoritative tool list.
 */
export function getRegisteredToolNames(): string[] {
  // Return from legacy Map for backward compatibility
  const legacyNames = Array.from(handlers.keys());

  // Supplement with ToolRegistry entries for more complete picture
  initializeRegistry();
  if (registry) {
    const registryNames = registry.getAll().map((plugin) => plugin.id);
    const allNames = new Set([...legacyNames, ...registryNames]);
    return Array.from(allNames).sort();
  }

  return legacyNames;
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
