import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  registerToolHandler,
  executeToolCall,
  getRegisteredHandlers,
  clearHandlers,
} from '../tool-executor';
import type { ToolExecutionResult, ToolContext } from '@/types/tools';

// Mock the broadcast function
vi.mock('@/lib/realtime/tool-events', () => ({
  broadcastToolEvent: vi.fn(),
}));

describe('tool-executor', () => {
  beforeEach(() => {
    clearHandlers();
    vi.clearAllMocks();
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
      const mockResult: ToolExecutionResult = {
        success: true,
        toolId: 'test-id',
        toolType: 'mindmap',
        data: { topic: 'Test Topic', nodes: [] },
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
        { topic: 'Test Topic', nodes: [] },
        context
      );

      expect(mockHandler).toHaveBeenCalledWith(
        { topic: 'Test Topic', nodes: [] },
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

    it('should generate unique toolId for each execution', async () => {
      const mockHandler = vi.fn().mockResolvedValue({
        success: true,
        toolId: '', // Will be overwritten
        toolType: 'quiz',
        data: {},
      });
      registerToolHandler('create_quiz', mockHandler);

      const result1 = await executeToolCall('create_quiz', {}, { sessionId: 'test' });
      const result2 = await executeToolCall('create_quiz', {}, { sessionId: 'test' });

      expect(result1.toolId).toBeTruthy();
      expect(result2.toolId).toBeTruthy();
      expect(result1.toolId).not.toBe(result2.toolId);
    });
  });

  describe('tool event broadcasting', () => {
    it('should broadcast tool:created event on start', async () => {
      const { broadcastToolEvent } = await import('@/lib/realtime/tool-events');
      const mockHandler = vi.fn().mockResolvedValue({
        success: true,
        toolId: 'test-id',
        toolType: 'demo',
        data: {},
      });
      registerToolHandler('create_demo', mockHandler);

      await executeToolCall('create_demo', { title: 'Test Demo' }, { sessionId: 'test', maestroId: 'galileo' });

      expect(broadcastToolEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'tool:created',
          toolType: 'demo',
        })
      );
    });

    it('should broadcast tool:complete on success', async () => {
      const { broadcastToolEvent } = await import('@/lib/realtime/tool-events');
      const mockHandler = vi.fn().mockResolvedValue({
        success: true,
        toolId: 'test-id',
        toolType: 'search',
        data: { results: [] },
      });
      registerToolHandler('web_search', mockHandler);

      await executeToolCall('web_search', { query: 'test' }, { sessionId: 'test' });

      expect(broadcastToolEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'tool:complete',
        })
      );
    });

    it('should broadcast tool:error on failure', async () => {
      const { broadcastToolEvent } = await import('@/lib/realtime/tool-events');
      const mockHandler = vi.fn().mockRejectedValue(new Error('Test error'));
      registerToolHandler('failing_tool', mockHandler);

      await executeToolCall('failing_tool', {}, { sessionId: 'test' });

      expect(broadcastToolEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'tool:error',
          data: expect.objectContaining({
            error: expect.stringContaining('Test error'),
          }),
        })
      );
    });
  });
});
