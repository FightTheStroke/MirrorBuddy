// ============================================================================
// TOOL EXECUTOR DEPRECATED
// Legacy functions maintained for backward compatibility only
// ============================================================================

import { ToolRegistry } from '@/lib/tools/plugin/registry';
import type { ToolExecutionResult, ToolContext } from '@/types/tools';

/**
 * Tool handler function signature
 */
type ToolHandler = (
  args: Record<string, unknown>,
  context: ToolContext
) => Promise<ToolExecutionResult>;

// Lazily access the handlers from the main executor
let handlersRef: Map<string, ToolHandler> | null = null;
let registryRef: ToolRegistry | null = null;

export function _setDeprecatedHandlers(handlers: Map<string, ToolHandler>): void {
  handlersRef = handlers;
}

export function _setDeprecatedRegistry(registry: ToolRegistry): void {
  registryRef = registry;
}

/**
 * DEPRECATED: Get all registered handlers from legacy Map
 * Used only in tests for backward compatibility verification
 * For production code, use getToolRegistry().getAll() instead
 */
export function getRegisteredHandlers(): Map<string, ToolHandler> {
  return handlersRef ? new Map(handlersRef) : new Map();
}

/**
 * DEPRECATED: Clear all legacy handlers
 * Used only in tests for cleanup between test runs
 * Does not affect ToolRegistry state - call getToolRegistry().clear() separately if needed
 */
export function clearHandlers(): void {
  if (handlersRef) {
    handlersRef.clear();
  }
}

/**
 * DEPRECATED: Check if a tool handler is registered in legacy Map
 * Checks both fallback Map (legacy) and ToolRegistry (new system)
 * @returns true if tool exists in either legacy Map or ToolRegistry
 */
export function hasToolHandler(functionName: string): boolean {
  // Check both legacy Map and new ToolRegistry
  if (handlersRef && handlersRef.has(functionName)) {
    return true;
  }
  return registryRef ? registryRef.has(functionName) : false;
}

/**
 * DEPRECATED: Get list of registered tool function names from legacy Map
 * Returns only handlers in the fallback Map, not ToolRegistry.
 * Use getToolRegistry().getAll() for the authoritative tool list.
 */
export function getRegisteredToolNames(): string[] {
  // Return from legacy Map for backward compatibility
  const legacyNames = handlersRef ? Array.from(handlersRef.keys()) : [];

  // Supplement with ToolRegistry entries for more complete picture
  if (registryRef) {
    const registryNames = registryRef.getAll().map((plugin) => plugin.id);
    const allNames = new Set([...legacyNames, ...registryNames]);
    return Array.from(allNames).sort();
  }

  return legacyNames;
}
