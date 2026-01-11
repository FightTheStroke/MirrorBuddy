/**
 * Tool Plugin Orchestrator
 * Executes tool plugins with validation, prerequisite checking, and error handling
 * Implements reliable, resilient execution engine (F-06, F-07)
 */

import { ToolPlugin, ToolCategory, Permission } from './types';
import { ToolRegistry } from './registry';
import type { ToolResult } from '@/types/tools';
import type { ChatMessage } from '@/types/conversation';
import type { StudentProfile } from '@/types/user';

/**
 * Enhanced ToolContext with full execution context
 * Extends base ToolContext with additional metadata for prerequisites and handlers
 */
export interface ToolExecutionContext {
  // Core identifiers
  userId: string;
  sessionId: string;
  maestroId?: string;
  conversationId?: string;

  // Conversation context
  conversationHistory: ChatMessage[];

  // User profile and permissions
  userProfile: StudentProfile | null;

  // Tool state tracking
  activeTools: string[];

  // Optional: user's current permissions
  grantedPermissions?: Permission[];
}

/**
 * ToolOrchestrator - Execution engine for tool plugins
 * Manages plugin discovery, validation, execution, and error handling
 * Ensures reliable and resilient tool execution with comprehensive error recovery
 */
export class ToolOrchestrator {
  private registry: ToolRegistry;

  constructor(registry: ToolRegistry) {
    this.registry = registry;
  }

  /**
   * Execute a tool plugin with full validation and error handling
   * Orchestrates: discovery → validation → prerequisites → execution → result
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
        return this.handleError(
          new Error(`Tool "${toolId}" not found in registry`),
          toolId
        );
      }

      // 2. Validate arguments against schema
      try {
        plugin.schema.parse(args);
      } catch (validationError) {
        return this.handleError(validationError, toolId);
      }

      // 3. Check prerequisites
      if (!this.validatePrerequisites(plugin, context)) {
        return this.handleError(
          new Error(
            `Prerequisites not met for tool "${toolId}". ` +
              `Required: ${plugin.prerequisites.join(', ')}`
          ),
          toolId
        );
      }

      // 4. Verify permissions (if defined)
      if (
        context.grantedPermissions &&
        plugin.permissions &&
        plugin.permissions.length > 0
      ) {
        const hasRequiredPermissions = plugin.permissions.every(
          perm => context.grantedPermissions?.includes(perm)
        );
        if (!hasRequiredPermissions) {
          return this.handleError(
            new Error(
              `Insufficient permissions to execute tool "${toolId}". ` +
                `Required: ${plugin.permissions.join(', ')}`
            ),
            toolId
          );
        }
      }

      // 5. Execute handler with context
      const result = await plugin.handler(args, {
        userId: context.userId,
        sessionId: context.sessionId,
        maestroId: context.maestroId,
        conversationId: context.conversationId,
      });

      return result;
    } catch (error) {
      return this.handleError(error, toolId);
    }
  }

  /**
   * Validate that tool prerequisites are met in current context
   * Checks:
   * - User is authenticated (userId provided)
   * - Session exists (sessionId provided)
   * - Required tools are not already active (prevents recursion)
   *
   * @param plugin - The tool plugin to validate
   * @param context - Execution context
   * @returns true if all prerequisites are met, false otherwise
   */
  validatePrerequisites(
    plugin: ToolPlugin,
    context: ToolExecutionContext
  ): boolean {
    // Check basic requirements
    if (!context.userId) {
      console.warn(`Prerequisite failed: no userId for tool "${plugin.id}"`);
      return false;
    }

    if (!context.sessionId) {
      console.warn(`Prerequisite failed: no sessionId for tool "${plugin.id}"`);
      return false;
    }

    // Check plugin-specific prerequisites
    if (plugin.prerequisites && plugin.prerequisites.length > 0) {
      for (const prerequisite of plugin.prerequisites) {
        // Check if prerequisite tool is already active (prevent recursion)
        if (context.activeTools.includes(prerequisite)) {
          console.warn(
            `Prerequisite check: "${prerequisite}" is already active for "${plugin.id}"`
          );
          return false;
        }

        // In a full implementation, could check if prerequisite tool is registered
        // const prereqPlugin = this.registry.get(prerequisite);
        // if (!prereqPlugin) { return false; }
      }
    }

    return true;
  }

  /**
   * Centralized error handler for tool execution failures
   * Converts errors to standardized ToolResult with clear messaging
   *
   * @param error - The error that occurred
   * @param toolId - ID of the tool that failed
   * @returns ToolResult indicating failure with error message
   */
  private handleError(error: unknown, toolId: string): ToolResult {
    let errorMessage = 'Unknown error';

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (typeof error === 'object' && error !== null) {
      try {
        errorMessage = JSON.stringify(error);
      } catch {
        errorMessage = String(error);
      }
    }

    const message = `Tool execution failed for "${toolId}": ${errorMessage}`;
    console.error(message);

    return {
      success: false,
      error: message,
      output: undefined,
    };
  }

  /**
   * Get plugin metadata without executing it
   * Useful for tool discovery and capability checking
   *
   * @param toolId - ID of the tool
   * @returns The plugin or undefined if not found
   */
  getToolMetadata(toolId: string): ToolPlugin | undefined {
    return this.registry.get(toolId);
  }

  /**
   * Get all available tools for a given category
   * Used for tool discovery and UI rendering
   *
   * @param category - The category to filter by
   * @returns Array of available tools in the category
   */
  getToolsByCategory(category: ToolCategory): ToolPlugin[] {
    return this.registry.getByCategory(category);
  }
}

export default ToolOrchestrator;
