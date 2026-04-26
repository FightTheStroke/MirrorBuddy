// ============================================================================
// TOOL EXECUTOR FRAMEWORK
// Handles registration and execution of tool handlers
// Integrates with ToolRegistry and ToolOrchestrator for plugin system
// Related: ADR 0009 - Tool Execution Architecture
// ============================================================================

import { nanoid } from 'nanoid';
import { logger } from '@/lib/logger';
import { ToolRegistry } from '@/lib/tools/plugin/registry';
import { ToolOrchestrator } from '@/lib/tools/plugin/orchestrator';
import type { ToolExecutionResult, ToolContext } from '@/types/tools';
import { saveToolOutput } from '@/lib/tools/tool-output-storage';
import { getToolSchema } from './tool-executor-schemas';
import { getToolTypeFromFunctionName } from './tool-executor-mapping';
import type { ToolHandler } from './tool-executor-plugin-factory';
import { createPluginFromHandler } from './tool-executor-plugin-factory';
import { executeViaOrchestrator } from './tool-executor-orchestration';

/**
 * Intentional compatibility shim: keep Map-based handlers while plugin migration
 * finalizes across tool modules.
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
      logger.debug('Tool executor: ToolRegistry and ToolOrchestrator initialized');
    }
  }
}

/** Get all registered handlers (for testing) */
export function getRegisteredHandlers(): Map<string, ToolHandler> {
  // Intentional compatibility shim: tests still validate handler registration surface.
  return handlers;
}

/** Clear all handlers (for testing cleanup) */
export function clearHandlers(): void {
  // Intentional compatibility shim: test isolation needs explicit reset support.
  handlers.clear();
}

/**
 * Register a tool handler for a function name
 * DUAL REGISTRATION: stores in Map shim and ToolRegistry.
 *
 * DEPRECATION: This function will be replaced with direct ToolRegistry.register() calls.
 * Currently it serves as a bridge during the transition from Map-based to plugin-based system.
 *
 * @param functionName - OpenAI function name (e.g., 'create_mindmap')
 * @param handler - Async function that executes the tool
 */
export function registerToolHandler(functionName: string, handler: ToolHandler): void {
  // Intentional compatibility shim: retain Map registration for non-migrated handlers.
  handlers.set(functionName, handler);

  // Also register with ToolRegistry if initialized
  initializeRegistry();
  if (registry && orchestrator) {
    try {
      // Intentional compatibility shim: wrap function handlers as plugins on registration.
      const plugin = createPluginFromHandler(functionName, handler);

      // Register if not already registered
      if (!registry.has(functionName)) {
        registry.register(plugin);
      }
    } catch (error) {
      logger.warn(`Failed to register ${functionName} with ToolRegistry:`, {
        error: String(error),
      });
      // Intentional compatibility shim: preserve execution continuity if plugin registration fails.
    }
  }
}

/**
 * Execute a tool call with dual path:
 * 1. ToolRegistry + ToolOrchestrator (preferred)
 * 2. Map shim fallback for non-migrated handlers
 *
 * Execution flow:
 * - If tool found in ToolRegistry: Execute via ToolOrchestrator
 * - Otherwise: Fall back to compatibility handler from Map
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
  context: ToolContext,
): Promise<ToolExecutionResult> {
  const toolId = nanoid();
  const toolType = getToolTypeFromFunctionName(functionName);

  // Try to use ToolOrchestrator if initialized
  initializeRegistry();

  // First try to validate and execute via orchestrator if tool is registered
  if (registry && orchestrator && registry.has(functionName)) {
    // Tool events are now broadcast through ToolOrchestrator's unified EventBroadcaster
    // which supports both WebRTC DataChannel and SSE fallback (F-08, F-14)
    const orchestratorResult = await executeViaOrchestrator(
      functionName,
      args,
      context,
      orchestrator,
      toolId,
      registry.has(functionName),
    );
    if (orchestratorResult) {
      return orchestratorResult;
    }
  }

  // Intentional compatibility shim: Map fallback for handlers not yet plugin-registered.
  const handler = handlers.get(functionName);

  if (!handler) {
    const error = `Unknown tool: ${functionName} (not found in ToolRegistry or compatibility handlers)`;

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

      logger.warn(`[Tool Validation] ${error}`);

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
  // Intentional compatibility shim: minimal broadcast path for Map-based handlers.
  try {
    const result = await handler(args, context);

    // Ensure toolId is set
    result.toolId = result.toolId || toolId;

    // Save tool output to database if conversationId is available and result is successful (F-03, F-04)
    if (result.success && context.conversationId && result.data) {
      try {
        await saveToolOutput(
          context.conversationId,
          toolType,
          result.data as Record<string, unknown>,
          result.toolId,
          { userId: context.userId, enableRAG: true },
        );
      } catch (error) {
        // Log error but don't fail the tool execution
        logger.warn('Failed to save tool output to database:', {
          error: String(error),
        });
      }
    }

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
