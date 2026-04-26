/**
 * Tool Plugin Registry
 * Manages plugin registration, retrieval, and filtering for the tool system
 * Implements singleton pattern for centralized tool management (F-05, F-09, F-10)
 */

import { ToolPlugin, ToolCategory, ToolPluginSchema, Permission } from './types';

/**
 * Registry error types
 */
export class RegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RegistryError';
  }
}

export class DuplicatePluginError extends RegistryError {
  constructor(id: string) {
    super(`Plugin with ID "${id}" is already registered`);
    this.name = 'DuplicatePluginError';
  }
}

export class InvalidPluginError extends RegistryError {
  constructor(id: string, reason: string) {
    super(`Invalid plugin "${id}": ${reason}`);
    this.name = 'InvalidPluginError';
  }
}

/**
 * ToolRegistry - Singleton registry for managing tool plugins
 * Provides centralized registration, retrieval, and filtering of tools
 * Ensures all plugins are validated against ToolPluginSchema
 */
export class ToolRegistry {
  private static instance: ToolRegistry;
  private plugins: Map<string, ToolPlugin> = new Map();

  private constructor() {}

  /**
   * Get singleton instance of ToolRegistry
   * Creates instance on first call, returns same instance on subsequent calls
   */
  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  /**
   * Register a new tool plugin
   * Validates against ToolPluginSchema before registration
   * Throws DuplicatePluginError if ID already exists
   * Throws InvalidPluginError if plugin schema validation fails
   *
   * @param plugin - The plugin to register
   * @throws {DuplicatePluginError} If plugin ID already registered
   * @throws {InvalidPluginError} If plugin fails schema validation
   */
  register(plugin: ToolPlugin): void {
    // Check for duplicate ID
    if (this.plugins.has(plugin.id)) {
      throw new DuplicatePluginError(plugin.id);
    }

    // Validate plugin against schema (skip function types which can't be validated at runtime)
    try {
      const pluginToValidate = { ...plugin };
      ToolPluginSchema.parse(pluginToValidate);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown validation error';
      throw new InvalidPluginError(plugin.id, reason);
    }

    // Add to registry
    this.plugins.set(plugin.id, plugin);
  }

  /**
   * Get a plugin by ID
   * @param id - The plugin ID
   * @returns The plugin or undefined if not found
   */
  get(id: string): ToolPlugin | undefined {
    return this.plugins.get(id);
  }

  /**
   * Get all registered plugins
   * @returns Array of all registered plugins
   */
  getAll(): ToolPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Check if a plugin is registered
   * @param id - The plugin ID
   * @returns True if plugin exists
   */
  has(id: string): boolean {
    return this.plugins.has(id);
  }

  /**
   * Unregister a plugin
   * @param id - The plugin ID to unregister
   * @returns True if plugin was unregistered, false if not found
   */
  unregister(id: string): boolean {
    return this.plugins.delete(id);
  }

  /**
   * Get plugins by trigger keyword (case-insensitive)
   * Searches through all plugin triggers for matches
   *
   * @param keyword - The trigger keyword to search for
   * @returns Array of plugins that match the trigger
   */
  getByTrigger(keyword: string): ToolPlugin[] {
    const lowerKeyword = keyword.toLowerCase();
    return this.getAll().filter(
      plugin =>
        plugin.triggers &&
        plugin.triggers.some(
          trigger => trigger.toLowerCase() === lowerKeyword
        )
    );
  }

  /**
   * Get plugins by category
   * @param category - The ToolCategory to filter by
   * @returns Array of plugins in the specified category
   */
  getByCategory(category: ToolCategory): ToolPlugin[] {
    return this.getAll().filter(plugin => plugin.category === category);
  }

  /**
   * Get plugins that have a specific permission
   * @param permission - The Permission to filter by
   * @returns Array of plugins that require the specified permission
   */
  getByPermission(permission: Permission): ToolPlugin[] {
    return this.getAll().filter(
      plugin =>
        plugin.permissions && plugin.permissions.includes(permission)
    );
  }

  /**
   * Clear all plugins from registry
   * Useful for testing and reset scenarios
   */
  clear(): void {
    this.plugins.clear();
  }
}

export default ToolRegistry;
