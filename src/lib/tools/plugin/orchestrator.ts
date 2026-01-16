/**
 * Tool Plugin Orchestrator
 * Executes tool plugins with validation, prerequisite checking, and error handling
 * Implements reliable, resilient execution engine (F-06, F-07)
 * Broadcasts tool events over WebRTC DataChannel for real-time monitoring (F-14)
 *
 * Security: Implements execution timeout to prevent indefinite hangs
 */

import { logger } from '@/lib/logger';
import { ToolPlugin, ToolCategory } from './types';
import { ToolRegistry } from './registry';
import type { ToolResult } from '@/types/tools';
import { ToolEventType, createToolMessage } from './data-channel-protocol';
import { DEFAULT_EXECUTION_TIMEOUT } from './constants';
import { withTimeout, createErrorToolResult } from './orchestrator-helpers';
import type { EventBroadcaster, ToolExecutionContext } from './orchestrator-types';

// Re-export types for backward compatibility
export type { EventBroadcaster, ToolExecutionContext } from './orchestrator-types';

/**
 * ToolOrchestrator - Execution engine for tool plugins
 * Manages plugin discovery, validation, execution, and error handling
 * Ensures reliable and resilient tool execution with comprehensive error recovery
 * Broadcasts real-time tool events for WebRTC DataChannel integration (F-14)
 */
export class ToolOrchestrator {
  private registry: ToolRegistry;
  private broadcaster: EventBroadcaster | null = null;

  constructor(registry: ToolRegistry) {
    this.registry = registry;
  }

  /**
   * Set the EventBroadcaster for sending tool events
   * Allows integration with WebRTC DataChannel, SSE, or other backends
   *
   * @param broadcaster - The EventBroadcaster instance to use
   */
  setBroadcaster(broadcaster: EventBroadcaster): void {
    this.broadcaster = broadcaster;
  }

  /**
   * Execute a tool plugin with full validation and error handling
   * Orchestrates: discovery → validation → prerequisites → execution → result
   * Broadcasts tool lifecycle events for real-time monitoring (F-14)
   *
   * @param toolId - ID of the tool to execute
   * @param args - Arguments passed to the tool handler
   * @param context - Execution context with user and session info
   * @returns Promise<ToolResult> with success status and data or error
   */
  async execute(
    toolId: string,
    args: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    try {
      // 1. Discover plugin from registry
      const plugin = this.registry.get(toolId);
      if (!plugin) {
        return createErrorToolResult(toolId, new Error(`Tool "${toolId}" not found in registry`));
      }

      // 2. Validate arguments against schema
      try {
        plugin.schema.parse(args);
      } catch (validationError) {
        return createErrorToolResult(toolId, validationError);
      }

      // 3. Check prerequisites
      if (!this.validatePrerequisites(plugin, context)) {
        return createErrorToolResult(
          toolId,
          new Error(`Prerequisites not met for tool "${toolId}". Required: ${plugin.prerequisites.join(', ')}`)
        );
      }

      // 4. Verify permissions (if defined)
      if (!this.checkPermissions(plugin, context)) {
        return createErrorToolResult(
          toolId,
          new Error(`Insufficient permissions to execute tool "${toolId}". Required: ${plugin.permissions.join(', ')}`)
        );
      }

      // 5. Broadcast TOOL_EXECUTING event (F-14)
      this.broadcastEvent(ToolEventType.TOOL_EXECUTING, toolId, {
        userId: context.userId,
        sessionId: context.sessionId,
      });

      // 6. Execute handler with context and timeout
      const result = await withTimeout(
        plugin.handler(args, {
          userId: context.userId,
          sessionId: context.sessionId,
          maestroId: context.maestroId,
          conversationId: context.conversationId,
        }),
        DEFAULT_EXECUTION_TIMEOUT,
        toolId
      );

      // 7. Broadcast completion or error event (F-14)
      this.broadcastCompletionEvent(toolId, result);

      return result;
    } catch (error) {
      const errorResult = createErrorToolResult(toolId, error);
      this.broadcastEvent(ToolEventType.TOOL_ERROR, toolId, { error: errorResult.error });
      return errorResult;
    }
  }

  /**
   * Validate that tool prerequisites are met in current context
   *
   * @param plugin - The tool plugin to validate
   * @param context - Execution context
   * @returns true if all prerequisites are met
   */
  validatePrerequisites(plugin: ToolPlugin, context: ToolExecutionContext): boolean {
    if (!context.userId) {
      logger.warn(`Prerequisite failed: no userId for tool "${plugin.id}"`);
      return false;
    }

    if (!context.sessionId) {
      logger.warn(`Prerequisite failed: no sessionId for tool "${plugin.id}"`);
      return false;
    }

    if (plugin.prerequisites && plugin.prerequisites.length > 0) {
      for (const prerequisite of plugin.prerequisites) {
        if (context.activeTools.includes(prerequisite)) {
          logger.warn(`Prerequisite check: "${prerequisite}" is already active for "${plugin.id}"`);
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get plugin metadata without executing it
   *
   * @param toolId - ID of the tool
   * @returns The plugin or undefined if not found
   */
  getToolMetadata(toolId: string): ToolPlugin | undefined {
    return this.registry.get(toolId);
  }

  /**
   * Get all available tools for a given category
   *
   * @param category - The category to filter by
   * @returns Array of available tools in the category
   */
  getToolsByCategory(category: ToolCategory): ToolPlugin[] {
    return this.registry.getByCategory(category);
  }

  /**
   * Check if user has required permissions for the plugin
   */
  private checkPermissions(plugin: ToolPlugin, context: ToolExecutionContext): boolean {
    if (!context.grantedPermissions || !plugin.permissions || plugin.permissions.length === 0) {
      return true;
    }

    return plugin.permissions.every(perm => context.grantedPermissions?.includes(perm));
  }

  /**
   * Broadcast a tool event through the configured EventBroadcaster
   */
  private broadcastEvent(
    type: ToolEventType,
    toolId: string,
    payload?: Record<string, unknown>
  ): void {
    if (!this.broadcaster) return;
    this.broadcaster.sendEvent(createToolMessage(type, toolId, payload));
  }

  /**
   * Broadcast completion or error event based on result
   */
  private broadcastCompletionEvent(toolId: string, result: ToolResult): void {
    if (result.success) {
      this.broadcastEvent(ToolEventType.TOOL_COMPLETED, toolId, {
        success: true,
        dataSize: result.data ? JSON.stringify(result.data).length : 0,
      });
    } else {
      this.broadcastEvent(ToolEventType.TOOL_ERROR, toolId, { error: result.error });
    }
  }
}

export default ToolOrchestrator;
