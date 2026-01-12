/**
 * Tool Plugin System Initialization
 * Handles singleton registry creation and plugin registration during app bootstrap
 * Part of scalable plugin architecture (F-05)
 */

import { ToolRegistry } from './registry';

/**
 * Initialize the ToolRegistry singleton
 * Call this once during app bootstrap to prepare the plugin system
 * Subsequent calls return the same singleton instance
 */
export function initializeToolRegistry(): ToolRegistry {
  const registry = ToolRegistry.getInstance();
  if (process.env.NODE_ENV === 'development') {
    console.debug('ToolRegistry initialized');
  }
  return registry;
}

export default initializeToolRegistry;
