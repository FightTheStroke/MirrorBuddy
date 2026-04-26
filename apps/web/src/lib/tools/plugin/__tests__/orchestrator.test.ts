/**
 * Unit tests for ToolOrchestrator
 * Tests validation, prerequisite checking, error handling, and execution
 * F-11: Thor validates, zero technical debt
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { ToolOrchestrator, ToolExecutionContext } from '../orchestrator';
import { ToolRegistry } from '../registry';
import { ToolPlugin, Permission, ToolCategory } from '../types';
// ToolResult is available from types but we use the handler return directly

/**
 * Mock plugin factory for testing
 */
function createMockPlugin(overrides?: Partial<ToolPlugin>): ToolPlugin {
  return {
    id: 'test_tool',
    name: 'Test Tool',
    category: ToolCategory.EDUCATIONAL,
    schema: z.object({ input: z.string() }),
    handler: vi.fn(async () => ({
      success: true,
      output: 'test output',
    })),
    voicePrompt: 'Use test tool',
    voiceFeedback: 'Tool executed',
    triggers: ['test'],
    prerequisites: [],
    permissions: [],
    ...overrides,
  };
}

/**
 * Create a valid execution context
 */
function createValidContext(overrides?: Partial<ToolExecutionContext>): ToolExecutionContext {
  return {
    userId: 'user123',
    sessionId: 'session456',
    maestroId: 'galileo',
    conversationId: 'conv789',
    conversationHistory: [],
    userProfile: null,
    activeTools: [],
    grantedPermissions: [Permission.READ_CONVERSATION],
    ...overrides,
  };
}

describe('ToolOrchestrator', () => {
  let registry: ToolRegistry;
  let orchestrator: ToolOrchestrator;

  beforeEach(() => {
    // Use singleton registry and clear between tests
    registry = ToolRegistry.getInstance();
    registry.clear();
    orchestrator = new ToolOrchestrator(registry);
  });

  describe('execute()', () => {
    it('returns success result for valid plugin with valid args', async () => {
      // Arrange
      const mockPlugin = createMockPlugin();
      registry.register(mockPlugin);
      const context = createValidContext();
      const args = { input: 'test input' };

      // Act
      const result = await orchestrator.execute('test_tool', args, context);

      // Assert
      expect(result.success).toBe(true);
      expect(result.output).toBe('test output');
      expect(mockPlugin.handler).toHaveBeenCalledWith(args, {
        userId: 'user123',
        sessionId: 'session456',
        maestroId: 'galileo',
        conversationId: 'conv789',
      });
    });

    it('returns error for unknown plugin (PLUGIN_NOT_FOUND)', async () => {
      // Arrange
      const context = createValidContext();
      const args = {};

      // Act
      const result = await orchestrator.execute('unknown_tool', args, context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('unknown_tool');
      expect(result.error).toContain('not found');
    });

    it('returns error for invalid arguments (VALIDATION_FAILED)', async () => {
      // Arrange
      const mockPlugin = createMockPlugin({
        schema: z.object({
          input: z.string().min(5),
        }),
      });
      registry.register(mockPlugin);
      const context = createValidContext();
      const args = { input: 'abc' }; // Too short, fails validation

      // Act
      const result = await orchestrator.execute('test_tool', args, context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Tool execution failed');
    });

    it('returns error when prerequisites not met - missing userId', async () => {
      // Arrange
      const mockPlugin = createMockPlugin();
      registry.register(mockPlugin);
      const context = createValidContext({ userId: '' });
      const args = { input: 'test' };

      // Act
      const result = await orchestrator.execute('test_tool', args, context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Prerequisites not met');
    });

    it('returns error when prerequisites not met - missing sessionId', async () => {
      // Arrange
      const mockPlugin = createMockPlugin();
      registry.register(mockPlugin);
      const context = createValidContext({ sessionId: '' });
      const args = { input: 'test' };

      // Act
      const result = await orchestrator.execute('test_tool', args, context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Prerequisites not met');
    });

    it('returns error when tool prerequisite already active', async () => {
      // Arrange
      const mockPlugin = createMockPlugin({
        prerequisites: ['prereq-tool'],
      });
      registry.register(mockPlugin);
      const context = createValidContext({
        activeTools: ['prereq-tool'],
      });
      const args = { input: 'test' };

      // Act
      const result = await orchestrator.execute('test_tool', args, context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Prerequisites not met');
    });

    it('returns error when permissions insufficient', async () => {
      // Arrange
      const mockPlugin = createMockPlugin({
        permissions: [Permission.VOICE_OUTPUT, Permission.FILE_ACCESS],
      });
      registry.register(mockPlugin);
      const context = createValidContext({
        grantedPermissions: [Permission.READ_CONVERSATION], // Missing required permissions
      });
      const args = { input: 'test' };

      // Act
      const result = await orchestrator.execute('test_tool', args, context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient permissions');
    });

    it('returns error when handler throws exception', async () => {
      // Arrange
      const mockPlugin = createMockPlugin({
        handler: vi.fn(async () => {
          throw new Error('Handler execution failed');
        }),
      });
      registry.register(mockPlugin);
      const context = createValidContext();
      const args = { input: 'test' };

      // Act
      const result = await orchestrator.execute('test_tool', args, context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Handler execution failed');
    });

    it('succeeds when plugin has no permissions required', async () => {
      // Arrange
      const mockPlugin = createMockPlugin({
        permissions: [],
      });
      registry.register(mockPlugin);
      const context = createValidContext({
        grantedPermissions: [], // No permissions granted
      });
      const args = { input: 'test' };

      // Act
      const result = await orchestrator.execute('test_tool', args, context);

      // Assert
      expect(result.success).toBe(true);
    });

    it('succeeds when all required permissions are granted', async () => {
      // Arrange
      const mockPlugin = createMockPlugin({
        permissions: [Permission.READ_CONVERSATION, Permission.WRITE_CONTENT],
      });
      registry.register(mockPlugin);
      const context = createValidContext({
        grantedPermissions: [
          Permission.READ_CONVERSATION,
          Permission.WRITE_CONTENT,
          Permission.VOICE_OUTPUT, // Extra permission
        ],
      });
      const args = { input: 'test' };

      // Act
      const result = await orchestrator.execute('test_tool', args, context);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('validatePrerequisites()', () => {
    it('returns true when all prerequisites are met', () => {
      // Arrange
      const mockPlugin = createMockPlugin({
        prerequisites: ['tool_a', 'tool_b'],
      });
      const context = createValidContext({
        activeTools: [], // Neither tool is active
      });

      // Act
      const result = orchestrator.validatePrerequisites(mockPlugin, context);

      // Assert
      expect(result).toBe(true);
    });

    it('returns false when userId is missing', () => {
      // Arrange
      const mockPlugin = createMockPlugin();
      const context = createValidContext({ userId: '' });

      // Act
      const result = orchestrator.validatePrerequisites(mockPlugin, context);

      // Assert
      expect(result).toBe(false);
    });

    it('returns false when sessionId is missing', () => {
      // Arrange
      const mockPlugin = createMockPlugin();
      const context = createValidContext({ sessionId: '' });

      // Act
      const result = orchestrator.validatePrerequisites(mockPlugin, context);

      // Assert
      expect(result).toBe(false);
    });

    it('returns false when prerequisite tool is active', () => {
      // Arrange
      const mockPlugin = createMockPlugin({
        prerequisites: ['tool_a'],
      });
      const context = createValidContext({
        activeTools: ['tool_a'],
      });

      // Act
      const result = orchestrator.validatePrerequisites(mockPlugin, context);

      // Assert
      expect(result).toBe(false);
    });

    it('returns true when plugin has no prerequisites', () => {
      // Arrange
      const mockPlugin = createMockPlugin({
        prerequisites: [],
      });
      const context = createValidContext({
        activeTools: ['any-tool'],
      });

      // Act
      const result = orchestrator.validatePrerequisites(mockPlugin, context);

      // Assert
      expect(result).toBe(true);
    });

    it('returns true when only non-conflicting tools are active', () => {
      // Arrange
      const mockPlugin = createMockPlugin({
        prerequisites: ['tool_a', 'tool_b'],
      });
      const context = createValidContext({
        activeTools: ['tool_c', 'tool_d'],
      });

      // Act
      const result = orchestrator.validatePrerequisites(mockPlugin, context);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('handleError()', () => {
    it('creates error result from Error instance', async () => {
      // Arrange
      const mockPlugin = createMockPlugin({
        handler: vi.fn(async () => {
          throw new Error('Test error message');
        }),
      });
      registry.register(mockPlugin);
      const context = createValidContext();
      const args = { input: 'test' };

      // Act
      const result = await orchestrator.execute('test_tool', args, context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Test error message');
    });

    it('creates error result from string error', async () => {
      // Arrange
      const mockPlugin = createMockPlugin({
        handler: vi.fn(async () => {
          throw 'String error message';
        }),
      });
      registry.register(mockPlugin);
      const context = createValidContext();
      const args = { input: 'test' };

      // Act
      const result = await orchestrator.execute('test_tool', args, context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('String error message');
    });

    it('creates error result from object error', async () => {
      // Arrange
      const errorObj = { code: 'TEST_ERROR', detail: 'Test detail' };
      const mockPlugin = createMockPlugin({
        handler: vi.fn(async () => {
          throw errorObj;
        }),
      });
      registry.register(mockPlugin);
      const context = createValidContext();

      // Act
      const result = await orchestrator.execute('test_tool', {}, context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('includes toolId in error message', async () => {
      // Arrange
      const mockPlugin = createMockPlugin({
        id: 'specific_tool',
      });
      registry.register(mockPlugin);
      const context = createValidContext();

      // Act
      const result = await orchestrator.execute('specific_tool', {}, context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('specific_tool');
    });
  });

  describe('getToolMetadata()', () => {
    it('returns plugin metadata for registered tool', () => {
      // Arrange
      const mockPlugin = createMockPlugin({ id: 'my_tool' });
      registry.register(mockPlugin);

      // Act
      const metadata = orchestrator.getToolMetadata('my_tool');

      // Assert
      expect(metadata).toBeDefined();
      expect(metadata?.id).toBe('my_tool');
      expect(metadata?.name).toBe('Test Tool');
    });

    it('returns undefined for unregistered tool', () => {
      // Act
      const metadata = orchestrator.getToolMetadata('nonexistent');

      // Assert
      expect(metadata).toBeUndefined();
    });
  });

  describe('getToolsByCategory()', () => {
    it('returns all tools in specified category', () => {
      // Arrange
      const educationalTool = createMockPlugin({
        id: 'tool_one',
        category: ToolCategory.EDUCATIONAL,
      });
      const creationTool = createMockPlugin({
        id: 'tool_two',
        category: ToolCategory.CREATION,
      });
      const anotherEducationalTool = createMockPlugin({
        id: 'tool_three',
        category: ToolCategory.EDUCATIONAL,
      });

      registry.register(educationalTool);
      registry.register(creationTool);
      registry.register(anotherEducationalTool);

      // Act
      const tools = orchestrator.getToolsByCategory(ToolCategory.EDUCATIONAL);

      // Assert
      expect(tools).toHaveLength(2);
      expect(tools.map(t => t.id)).toEqual(['tool_one', 'tool_three']);
    });

    it('returns empty array when no tools in category', () => {
      // Act
      const tools = orchestrator.getToolsByCategory(ToolCategory.ASSESSMENT);

      // Assert
      expect(tools).toEqual([]);
    });
  });

  describe('Complex scenarios', () => {
    it('executes tool with multiple prerequisites when none are active', async () => {
      // Arrange
      const mockPlugin = createMockPlugin({
        prerequisites: ['tool_a', 'tool_b', 'tool_c'],
      });
      registry.register(mockPlugin);
      const context = createValidContext({
        activeTools: ['other-tool'],
      });
      const args = { input: 'test' };

      // Act
      const result = await orchestrator.execute('test_tool', args, context);

      // Assert
      expect(result.success).toBe(true);
    });

    it('fails when one of multiple prerequisites is active', async () => {
      // Arrange
      const mockPlugin = createMockPlugin({
        prerequisites: ['tool_a', 'tool_b', 'tool_c'],
      });
      registry.register(mockPlugin);
      const context = createValidContext({
        activeTools: ['tool_b'], // One prereq is active
      });
      const args = { input: 'test' };

      // Act
      const result = await orchestrator.execute('test_tool', args, context);

      // Assert
      expect(result.success).toBe(false);
    });

    it('passes context metadata to handler correctly', async () => {
      // Arrange
      const mockHandler = vi.fn(async () => ({
        success: true,
        output: 'test',
      }));
      const mockPlugin = createMockPlugin({
        handler: mockHandler,
      });
      registry.register(mockPlugin);
      const context = createValidContext({
        userId: 'user999',
        sessionId: 'session888',
        maestroId: 'curie',
        conversationId: 'conv777',
      });
      const args = { input: 'test' };

      // Act
      await orchestrator.execute('test_tool', args, context);

      // Assert
      expect(mockHandler).toHaveBeenCalledWith(args, {
        userId: 'user999',
        sessionId: 'session888',
        maestroId: 'curie',
        conversationId: 'conv777',
      });
    });
  });
});
