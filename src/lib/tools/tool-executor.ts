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
import {
  getRegisteredHandlers,
  clearHandlers,
  hasToolHandler,
  getRegisteredToolNames,
  _setDeprecatedHandlers,
  _setDeprecatedRegistry,
} from './tool-executor-deprecated';
import type { ToolHandler } from './tool-executor-plugin-factory';
import { createPluginFromHandler } from './tool-executor-plugin-factory';
import { executeViaOrchestrator } from './tool-executor-orchestration';

// Re-export deprecated functions for backward compatibility
export { getRegisteredHandlers, clearHandlers, hasToolHandler, getRegisteredToolNames };

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
    // Share references with deprecated module
    _setDeprecatedHandlers(handlers);
    _setDeprecatedRegistry(registry);
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Tool executor: ToolRegistry and ToolOrchestrator initialized');
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
    try {
      // Create a minimal ToolPlugin from the legacy handler using factory
      const plugin = createPluginFromHandler(functionName, handler);

      // Register if not already registered
      if (!registry.has(functionName)) {
        registry.register(plugin);
      }
    } catch (error) {
      logger.warn(`Failed to register ${functionName} with ToolRegistry:`, { error: String(error) });
      // Continue with legacy handler even if registry sync fails
    }
  }
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
    const orchestratorResult = await executeViaOrchestrator(
      functionName,
      args,
      context,
      orchestrator,
      toolId,
      registry.has(functionName)
    );
    if (orchestratorResult) {
      return orchestratorResult;
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
  // For legacy handlers, minimal broadcast is expected
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
          { userId: context.userId, enableRAG: true }
        );
      } catch (error) {
        // Log error but don't fail the tool execution
        logger.warn('Failed to save tool output to database:', { error: String(error) });
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
