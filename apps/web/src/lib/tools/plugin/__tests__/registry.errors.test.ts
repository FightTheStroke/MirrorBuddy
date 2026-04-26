/**
 * Unit tests for ToolRegistry - Error Handling & Integration
 * Tests: Error classes, integration scenarios
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import {
  ToolRegistry,
  DuplicatePluginError,
  InvalidPluginError,
  RegistryError,
} from '../registry';
import { ToolPlugin, ToolCategory, Permission } from '../types';
import type { ToolResult, ToolContext } from '@/types/tools';

describe('ToolRegistry - Error Handling & Integration', () => {
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

  describe('Error classes', () => {
    it('should have proper error inheritance', () => {
      const dupError = new DuplicatePluginError('test');
      expect(dupError).toBeInstanceOf(DuplicatePluginError);
      expect(dupError).toBeInstanceOf(RegistryError);
      expect(dupError).toBeInstanceOf(Error);
    });

    it('should have correct error names', () => {
      const dupError = new DuplicatePluginError('test');
      const invError = new InvalidPluginError('test', 'reason');

      expect(dupError.name).toBe('DuplicatePluginError');
      expect(invError.name).toBe('InvalidPluginError');
    });

    it('should have descriptive error messages', () => {
      const dupError = new DuplicatePluginError('my_plugin');
      expect(dupError.message).toBe(
        'Plugin with ID "my_plugin" is already registered'
      );

      const invError = new InvalidPluginError('bad_plugin', 'ID format invalid');
      expect(invError.message).toBe('Invalid plugin "bad_plugin": ID format invalid');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle register, retrieve, and filter workflow', () => {
      const creationPlugin1 = createMockPlugin({
        id: 'create_chart',
        category: ToolCategory.CREATION,
        triggers: ['chart', 'diagram'],
      });
      const creationPlugin2 = createMockPlugin({
        id: 'create_outline',
        category: ToolCategory.CREATION,
        triggers: ['outline', 'structure'],
      });
      const educationalPlugin = createMockPlugin({
        id: 'explain_plugin',
        category: ToolCategory.EDUCATIONAL,
        triggers: ['explain', 'teach'],
      });

      registry.register(creationPlugin1);
      registry.register(creationPlugin2);
      registry.register(educationalPlugin);

      const allCreation = registry.getByCategory(ToolCategory.CREATION);
      expect(allCreation).toHaveLength(2);

      const chartTools = registry.getByTrigger('chart');
      expect(chartTools).toHaveLength(1);
      expect(chartTools[0].id).toBe('create_chart');

      registry.unregister('create_outline');
      expect(registry.getByCategory(ToolCategory.CREATION)).toHaveLength(1);
    });

    it('should maintain consistency across operations', () => {
      const plugins = [
        createMockPlugin({ id: 'consistency_one', name: 'Plugin 1' }),
        createMockPlugin({ id: 'consistency_two', name: 'Plugin 2' }),
        createMockPlugin({ id: 'consistency_three', name: 'Plugin 3' }),
      ];

      plugins.forEach(p => registry.register(p));
      expect(registry.getAll()).toHaveLength(3);

      registry.unregister('consistency_two');
      expect(registry.getAll()).toHaveLength(2);
      expect(registry.has('consistency_two')).toBe(false);

      const retrieved = registry.get('consistency_one');
      expect(retrieved?.name).toBe('Plugin 1');
    });
  });
});
