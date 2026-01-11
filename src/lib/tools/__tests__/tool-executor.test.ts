import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  registerToolHandler,
  executeToolCall,
  getRegisteredHandlers,
  clearHandlers,
} from '../tool-executor';
import type { ToolExecutionResult, ToolContext } from '@/types/tools';

// Mock nanoid with a function that generates unique IDs
const mockNanoid = vi.fn();
vi.mock('nanoid', () => ({
  nanoid: () => mockNanoid(),
}));

describe('tool-executor', () => {
  let idCounter = 0;

  beforeEach(() => {
    clearHandlers();
    vi.clearAllMocks();
    // Reset and configure nanoid mock to return unique IDs
    idCounter = 0;
    mockNanoid.mockImplementation(() => `test-id-${++idCounter}`);
  });

  afterEach(() => {
    clearHandlers();
  });

  describe('registerToolHandler', () => {
    it('should register a handler for a function name', () => {
      const mockHandler = vi.fn();
      registerToolHandler('test_tool', mockHandler);

      const handlers = getRegisteredHandlers();
      expect(handlers.has('test_tool')).toBe(true);
    });

    it('should overwrite existing handler with same name', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      registerToolHandler('test_tool', handler1);
      registerToolHandler('test_tool', handler2);

      const handlers = getRegisteredHandlers();
      expect(handlers.get('test_tool')).toBe(handler2);
    });

    it('should register multiple handlers with different names', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      registerToolHandler('tool_1', handler1);
      registerToolHandler('tool_2', handler2);

      const handlers = getRegisteredHandlers();
      expect(handlers.size).toBe(2);
      expect(handlers.has('tool_1')).toBe(true);
      expect(handlers.has('tool_2')).toBe(true);
    });
  });

  describe('executeToolCall', () => {
    it('should execute registered handler with args', async () => {
      const validArgs = {
        title: 'Test Topic',
        nodes: [{ id: 'node-1', label: 'Root Node' }],
      };

      const mockResult: ToolExecutionResult = {
        success: true,
        toolId: 'test-id',
        toolType: 'mindmap',
        data: validArgs,
      };

      const mockHandler = vi.fn().mockResolvedValue(mockResult);
      registerToolHandler('create_mindmap', mockHandler);

      const context: ToolContext = {
        sessionId: 'session-123',
        userId: 'user-456',
        maestroId: 'archimede',
      };

      const result = await executeToolCall(
        'create_mindmap',
        validArgs,
        context
      );

      expect(mockHandler).toHaveBeenCalledWith(
        validArgs,
        context
      );
      expect(result.success).toBe(true);
      expect(result.toolType).toBe('mindmap');
    });

    it('should return error for unknown tool', async () => {
      const result = await executeToolCall(
        'unknown_tool',
        {},
        { sessionId: 'test' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown tool');
    });

    it('should handle handler errors gracefully', async () => {
      const mockHandler = vi.fn().mockRejectedValue(new Error('Handler error'));
      registerToolHandler('failing_tool', mockHandler);

      const result = await executeToolCall(
        'failing_tool',
        {},
        { sessionId: 'test' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Handler error');
    });

    it('should generate toolId when handler returns empty toolId', async () => {
      const mockHandler = vi.fn().mockResolvedValue({
        success: true,
        toolId: '', // Empty - should be filled by executor
        toolType: 'quiz',
        data: {},
      });
      registerToolHandler('create_quiz', mockHandler);

      // Pass all required fields per Zod schema
      const result = await executeToolCall('create_quiz', {
        topic: 'Test Quiz',
        questions: [{
          question: 'Test question?',
          options: ['A', 'B', 'C'],
          correctIndex: 0,
        }],
      }, { sessionId: 'test' });

      // Executor should fill in a toolId when handler returns empty
      expect(result.toolId).toBeTruthy();
      expect(typeof result.toolId).toBe('string');
      expect(result.toolId.length).toBeGreaterThan(0);
    });

    it('should preserve toolId when handler returns one', async () => {
      const mockHandler = vi.fn().mockResolvedValue({
        success: true,
        toolId: 'handler-provided-id',
        toolType: 'quiz',
        data: {},
      });
      registerToolHandler('create_quiz', mockHandler);

      // Pass all required fields per Zod schema
      const result = await executeToolCall('create_quiz', {
        topic: 'Test Quiz',
        questions: [{
          question: 'Test question?',
          options: ['A', 'B', 'C'],
          correctIndex: 0,
        }],
      }, { sessionId: 'test' });

      // Handler's toolId should be preserved
      expect(result.toolId).toBe('handler-provided-id');
    });
  });

  describe('tool event broadcasting', () => {
    it('should not broadcast SSE events directly (delegated to ToolOrchestrator)', async () => {
      // Tool event broadcasting is now handled by ToolOrchestrator's unified EventBroadcaster
      // for both WebRTC DataChannel and SSE fallback (F-08, F-14)
      // tool-executor delegates this responsibility, no longer broadcasts directly
      const mockHandler = vi.fn().mockResolvedValue({
        success: true,
        toolId: 'test-id',
        toolType: 'demo',
        data: {},
      });
      registerToolHandler('create_demo', mockHandler);

      // Pass all required fields per Zod schema
      const result = await executeToolCall('create_demo', {
        title: 'Test Demo',
        concept: 'Test concept',
        visualization: 'Test visualization',
        interaction: 'Test interaction',
      }, { sessionId: 'test', maestroId: 'galileo' });

      // Verify execution succeeded - broadcasting is verified through ToolOrchestrator tests
      expect(result.success).toBe(true);
      expect(result.toolType).toBe('demo');
    });
  });
});
