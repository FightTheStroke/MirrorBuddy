/**
 * Unit tests for ToolRegistry - Filtering Operations
 * Tests: getByCategory, getByTrigger, getByPermission
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { ToolRegistry } from '../registry';
import { ToolPlugin, ToolCategory, Permission } from '../types';
import type { ToolResult, ToolContext } from '@/types/tools';

describe('ToolRegistry - Filtering Operations', () => {
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

  describe('getByCategory()', () => {
    it('should return plugins matching category', () => {
      const creation1 = createMockPlugin({
        id: 'create_one',
        category: ToolCategory.CREATION,
      });
      const creation2 = createMockPlugin({
        id: 'create_two',
        category: ToolCategory.CREATION,
      });
      const educational = createMockPlugin({
        id: 'edu_one',
        category: ToolCategory.EDUCATIONAL,
      });

      registry.register(creation1);
      registry.register(creation2);
      registry.register(educational);

      const creationTools = registry.getByCategory(ToolCategory.CREATION);
      expect(creationTools).toHaveLength(2);
      expect(creationTools).toContain(creation1);
      expect(creationTools).toContain(creation2);
    });

    it('should return empty array for category with no plugins', () => {
      const plugin = createMockPlugin({
        category: ToolCategory.CREATION,
      });
      registry.register(plugin);

      const utility = registry.getByCategory(ToolCategory.UTILITY);
      expect(utility).toEqual([]);
    });

    it('should filter all categories correctly', () => {
      const plugins = [
        createMockPlugin({ id: 'cat_creation', category: ToolCategory.CREATION }),
        createMockPlugin({ id: 'cat_educational', category: ToolCategory.EDUCATIONAL }),
        createMockPlugin({ id: 'cat_navigation', category: ToolCategory.NAVIGATION }),
        createMockPlugin({ id: 'cat_assessment', category: ToolCategory.ASSESSMENT }),
        createMockPlugin({ id: 'cat_utility', category: ToolCategory.UTILITY }),
      ];

      plugins.forEach(p => registry.register(p));

      Object.values(ToolCategory).forEach(category => {
        const filtered = registry.getByCategory(category);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].category).toBe(category);
      });
    });
  });

  describe('getByTrigger()', () => {
    it('should find plugins by exact trigger', () => {
      const plugin1 = createMockPlugin({
        id: 'trigger_plugin_one',
        triggers: ['create', 'generate'],
      });
      const plugin2 = createMockPlugin({
        id: 'trigger_plugin_two',
        triggers: ['write', 'compose'],
      });

      registry.register(plugin1);
      registry.register(plugin2);

      const results = registry.getByTrigger('create');
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(plugin1);
    });

    it('should be case-insensitive', () => {
      const plugin = createMockPlugin({
        id: 'casetest_plugin',
        triggers: ['Create', 'Generate'],
      });
      registry.register(plugin);

      expect(registry.getByTrigger('create')).toHaveLength(1);
      expect(registry.getByTrigger('CREATE')).toHaveLength(1);
      expect(registry.getByTrigger('Create')).toHaveLength(1);
    });

    it('should return multiple plugins with same trigger', () => {
      const plugin1 = createMockPlugin({
        id: 'analyze_plugin_one',
        triggers: ['analyze'],
      });
      const plugin2 = createMockPlugin({
        id: 'analyze_plugin_two',
        triggers: ['analyze', 'examine'],
      });

      registry.register(plugin1);
      registry.register(plugin2);

      const results = registry.getByTrigger('analyze');
      expect(results).toHaveLength(2);
    });

    it('should return empty array for non-existent trigger', () => {
      const plugin = createMockPlugin({
        id: 'trigger_test_plugin',
        triggers: ['existing'],
      });
      registry.register(plugin);

      const results = registry.getByTrigger('nonexistent');
      expect(results).toEqual([]);
    });

    it('should handle plugins without triggers', () => {
      const plugin = createMockPlugin({
        id: 'notrigger_test',
        triggers: ['valid'],
      });
      registry.register(plugin);

      const results = registry.getByTrigger('valid');
      expect(results).toHaveLength(1);
    });
  });

  describe('getByPermission()', () => {
    it('should return plugins requiring specific permission', () => {
      const plugin1 = createMockPlugin({
        id: 'perm_plugin_one',
        permissions: [Permission.READ_CONVERSATION, Permission.VOICE_OUTPUT],
      });
      const plugin2 = createMockPlugin({
        id: 'perm_plugin_two',
        permissions: [Permission.WRITE_CONTENT],
      });

      registry.register(plugin1);
      registry.register(plugin2);

      const results = registry.getByPermission(Permission.READ_CONVERSATION);
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(plugin1);
    });

    it('should return empty array for permission with no plugins', () => {
      const plugin = createMockPlugin({
        id: 'perm_test_plugin',
        permissions: [Permission.READ_PROFILE],
      });
      registry.register(plugin);

      const results = registry.getByPermission(Permission.FILE_ACCESS);
      expect(results).toEqual([]);
    });

    it('should return multiple plugins with same permission', () => {
      const plugin1 = createMockPlugin({
        id: 'voice_plugin_one',
        permissions: [Permission.VOICE_OUTPUT],
      });
      const plugin2 = createMockPlugin({
        id: 'voice_plugin_two',
        permissions: [Permission.VOICE_OUTPUT, Permission.READ_PROFILE],
      });

      registry.register(plugin1);
      registry.register(plugin2);

      const results = registry.getByPermission(Permission.VOICE_OUTPUT);
      expect(results).toHaveLength(2);
    });
  });
});
