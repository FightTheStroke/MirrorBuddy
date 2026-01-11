/**
 * Unit tests for ToolRegistry - Core Operations
 * Tests: getInstance, register, get, getAll, has, unregister, clear
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import {
  ToolRegistry,
  DuplicatePluginError,
  InvalidPluginError,
} from '../registry';
import { ToolPlugin, ToolCategory, Permission } from '../types';
import type { ToolResult, ToolContext } from '@/types/tools';

describe('ToolRegistry - Core Operations', () => {
  let registry: ToolRegistry;

  const createMockPlugin = (
    overrides?: Partial<ToolPlugin>
  ): ToolPlugin => ({
    id: 'test_plugin',
    name: 'Test Plugin',
    category: ToolCategory.CREATION,
    schema: z.object({ input: z.string() }),
    handler: async (_args: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> => ({
      success: true,
      data: { message: 'test' },
      renderComponent: undefined,
    }),
    voicePrompt: 'Test voice prompt',
    voiceFeedback: 'Test voice feedback',
    triggers: ['test', 'example'],
    prerequisites: [],
    permissions: [Permission.READ_CONVERSATION],
    ...overrides,
  });

  beforeEach(() => {
    ToolRegistry.getInstance().clear();
    registry = ToolRegistry.getInstance();
  });

  afterEach(() => {
    registry.clear();
  });

  describe('getInstance()', () => {
    it('should return a ToolRegistry instance', () => {
      expect(registry).toBeInstanceOf(ToolRegistry);
    });

    it('should return the same instance (singleton pattern)', () => {
      const instance1 = ToolRegistry.getInstance();
      const instance2 = ToolRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across instances', () => {
      const plugin = createMockPlugin();
      registry.register(plugin);

      const anotherInstance = ToolRegistry.getInstance();
      expect(anotherInstance.has(plugin.id)).toBe(true);
      expect(anotherInstance.get(plugin.id)).toEqual(plugin);
    });
  });

  describe('register()', () => {
    it('should successfully register a valid plugin', () => {
      const plugin = createMockPlugin();
      expect(() => registry.register(plugin)).not.toThrow();
      expect(registry.has(plugin.id)).toBe(true);
    });

    it('should register multiple different plugins', () => {
      const plugin1 = createMockPlugin({ id: 'plugin_one' });
      const plugin2 = createMockPlugin({ id: 'plugin_two' });

      registry.register(plugin1);
      registry.register(plugin2);

      expect(registry.has('plugin_one')).toBe(true);
      expect(registry.has('plugin_two')).toBe(true);
      expect(registry.getAll()).toHaveLength(2);
    });

    it('should throw DuplicatePluginError when registering duplicate ID', () => {
      const plugin = createMockPlugin({ id: 'duplicate_id' });
      registry.register(plugin);

      expect(() => registry.register(plugin)).toThrow(DuplicatePluginError);
      expect(() => registry.register(plugin)).toThrow(
        'Plugin with ID "duplicate_id" is already registered'
      );
    });

    it('should throw InvalidPluginError when plugin ID is missing', () => {
      const invalidPlugin = createMockPlugin({ id: '' });
      expect(() => registry.register(invalidPlugin)).toThrow(
        InvalidPluginError
      );
    });

    it('should throw InvalidPluginError when plugin name is missing', () => {
      const invalidPlugin = createMockPlugin({ name: '' });
      expect(() => registry.register(invalidPlugin)).toThrow(
        InvalidPluginError
      );
    });

    it('should throw InvalidPluginError when required fields are missing', () => {
      expect(() => registry.register(createMockPlugin({ voicePrompt: '' }))).toThrow(
        InvalidPluginError
      );
      expect(() => registry.register(createMockPlugin({ voiceFeedback: '' }))).toThrow(
        InvalidPluginError
      );
      expect(() => registry.register(createMockPlugin({ triggers: [] }))).toThrow(
        InvalidPluginError
      );
    });

    it('should throw InvalidPluginError for invalid plugin ID or category', () => {
      expect(() => registry.register(createMockPlugin({ id: 'plugin-with-hyphens' }))).toThrow(
        InvalidPluginError
      );
      expect(() => registry.register(createMockPlugin({
        category: 'invalid-category' as ToolCategory,
      }))).toThrow(InvalidPluginError);
    });
  });

  describe('get()', () => {
    it('should return registered plugin by ID', () => {
      const plugin = createMockPlugin({ id: 'search_test' });
      registry.register(plugin);

      const retrieved = registry.get('search_test');
      expect(retrieved).toEqual(plugin);
    });

    it('should return undefined for non-existent plugin', () => {
      const result = registry.get('non-existent');
      expect(result).toBeUndefined();
    });

    it('should return correct plugin among multiple', () => {
      const plugin1 = createMockPlugin({ id: 'plugin_a', name: 'Plugin 1' });
      const plugin2 = createMockPlugin({ id: 'plugin_b', name: 'Plugin 2' });
      const plugin3 = createMockPlugin({ id: 'plugin_c', name: 'Plugin 3' });

      registry.register(plugin1);
      registry.register(plugin2);
      registry.register(plugin3);

      expect(registry.get('plugin_b')).toEqual(plugin2);
      expect(registry.get('plugin_b')?.name).toBe('Plugin 2');
    });
  });

  describe('getAll()', () => {
    it('should return all registered plugins and maintain array immutability', () => {
      const plugin1 = createMockPlugin({ id: 'plugin_x' });
      const plugin2 = createMockPlugin({ id: 'plugin_y' });

      expect(registry.getAll()).toEqual([]);

      registry.register(plugin1);
      registry.register(plugin2);

      const all1 = registry.getAll();
      const all2 = registry.getAll();

      expect(all1).toHaveLength(2);
      expect(all1).toContain(plugin1);
      expect(all1).toContain(plugin2);
      expect(all1).toEqual(all2);
      expect(all1).not.toBe(all2);
    });
  });

  describe('has()', () => {
    it('should check plugin existence correctly', () => {
      const plugin = createMockPlugin({ id: 'plugin_exists' });
      expect(registry.has('does-not-exist')).toBe(false);

      registry.register(plugin);
      expect(registry.has('plugin_exists')).toBe(true);

      registry.unregister('plugin_exists');
      expect(registry.has('plugin_exists')).toBe(false);
    });
  });

  describe('unregister()', () => {
    it('should remove plugins correctly', () => {
      const plugin1 = createMockPlugin({ id: 'plugin_one' });
      const plugin2 = createMockPlugin({ id: 'plugin_two' });

      registry.register(plugin1);
      registry.register(plugin2);

      expect(registry.unregister('does-not-exist')).toBe(false);
      expect(registry.unregister('plugin_two')).toBe(true);
      expect(registry.has('plugin_one')).toBe(true);
      expect(registry.has('plugin_two')).toBe(false);

      expect(registry.unregister('plugin_two')).toBe(false);
    });
  });

  describe('clear()', () => {
    it('should remove all plugins', () => {
      const plugin1 = createMockPlugin({ id: 'clear_plugin_one' });
      const plugin2 = createMockPlugin({ id: 'clear_plugin_two' });

      registry.register(plugin1);
      registry.register(plugin2);
      expect(registry.getAll()).toHaveLength(2);

      registry.clear();
      expect(registry.getAll()).toHaveLength(0);
    });

    it('should allow registering plugins after clear', () => {
      const plugin1 = createMockPlugin({ id: 'after_clear_one' });
      registry.register(plugin1);
      registry.clear();

      const plugin2 = createMockPlugin({ id: 'after_clear_two' });
      registry.register(plugin2);

      expect(registry.getAll()).toHaveLength(1);
      expect(registry.get('after_clear_two')).toEqual(plugin2);
    });

    it('should clear previously used IDs allowing re-registration', () => {
      const plugin = createMockPlugin({ id: 'reused_plugin' });
      registry.register(plugin);
      registry.clear();

      expect(() => registry.register(plugin)).not.toThrow();
    });
  });

});
