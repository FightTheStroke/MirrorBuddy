/**
 * Unit Tests: Tool Events (SSE Broadcasting)
 * T-21: Unit tests for tool-executor + handlers
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerClient,
  unregisterClient,
  broadcastToolEvent,
  sendHeartbeat,
  getSessionClientCount,
  getTotalClientCount,
  cleanupStaleClients,
  type ToolEvent,
} from '../tool-events';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock ReadableStreamDefaultController
function createMockController() {
  const chunks: Uint8Array[] = [];
  return {
    enqueue: vi.fn((chunk: Uint8Array) => {
      chunks.push(chunk);
    }),
    close: vi.fn(),
    error: vi.fn(),
    chunks,
  };
}

describe('Tool Events (SSE Broadcasting)', () => {
  // Clean up between tests
  beforeEach(() => {
    // Unregister all clients by cleaning up stale ones with 0 timeout
    cleanupStaleClients();
  });

  describe('registerClient', () => {
    it('should register a new client', () => {
      const controller = createMockController();
      registerClient('client-1', 'session-1', controller as unknown as ReadableStreamDefaultController<Uint8Array>);

      expect(getTotalClientCount()).toBeGreaterThanOrEqual(1);
      expect(getSessionClientCount('session-1')).toBeGreaterThanOrEqual(1);
    });

    it('should track clients per session', () => {
      const controller1 = createMockController();
      const controller2 = createMockController();
      const controller3 = createMockController();

      registerClient('client-1', 'session-a', controller1 as unknown as ReadableStreamDefaultController<Uint8Array>);
      registerClient('client-2', 'session-a', controller2 as unknown as ReadableStreamDefaultController<Uint8Array>);
      registerClient('client-3', 'session-b', controller3 as unknown as ReadableStreamDefaultController<Uint8Array>);

      expect(getSessionClientCount('session-a')).toBe(2);
      expect(getSessionClientCount('session-b')).toBe(1);
    });
  });

  describe('unregisterClient', () => {
    it('should remove a registered client', () => {
      const controller = createMockController();
      registerClient('client-unreg', 'session-unreg', controller as unknown as ReadableStreamDefaultController<Uint8Array>);

      expect(getSessionClientCount('session-unreg')).toBe(1);

      unregisterClient('client-unreg');

      expect(getSessionClientCount('session-unreg')).toBe(0);
    });

    it('should handle unregistering non-existent client gracefully', () => {
      expect(() => unregisterClient('non-existent')).not.toThrow();
    });
  });

  describe('broadcastToolEvent', () => {
    it('should send event to all clients in the same session', () => {
      const controller1 = createMockController();
      const controller2 = createMockController();
      const controller3 = createMockController();

      registerClient('bc-1', 'session-bc', controller1 as unknown as ReadableStreamDefaultController<Uint8Array>);
      registerClient('bc-2', 'session-bc', controller2 as unknown as ReadableStreamDefaultController<Uint8Array>);
      registerClient('bc-3', 'session-other', controller3 as unknown as ReadableStreamDefaultController<Uint8Array>);

      const event: ToolEvent = {
        id: 'event-1',
        type: 'tool:created',
        toolType: 'mindmap',
        sessionId: 'session-bc',
        maestroId: 'archimede',
        timestamp: Date.now(),
        data: { title: 'Test Event' },
      };

      broadcastToolEvent(event);

      // Clients in session-bc should receive the event
      expect(controller1.enqueue).toHaveBeenCalled();
      expect(controller2.enqueue).toHaveBeenCalled();

      // Client in different session should NOT receive the event
      expect(controller3.enqueue).not.toHaveBeenCalled();
    });

    it('should encode event as JSON in SSE format', () => {
      const controller = createMockController();
      registerClient('bc-format', 'session-format', controller as unknown as ReadableStreamDefaultController<Uint8Array>);

      const event: ToolEvent = {
        id: 'event-format',
        type: 'tool:update',
        toolType: 'quiz',
        sessionId: 'session-format',
        maestroId: 'dante',
        timestamp: 1234567890,
        data: { progress: 50 },
      };

      broadcastToolEvent(event);

      const sentChunk = controller.chunks[0];
      const sentString = new TextDecoder().decode(sentChunk);

      expect(sentString).toContain('data: ');
      expect(sentString).toContain('"id":"event-format"');
      expect(sentString).toContain('"type":"tool:update"');
      expect(sentString).toContain('"progress":50');
      expect(sentString).toMatch(/\n\n$/); // SSE requires double newline
    });
  });

  describe('sendHeartbeat', () => {
    it('should send heartbeat to registered client', () => {
      const controller = createMockController();
      registerClient('hb-client', 'session-hb', controller as unknown as ReadableStreamDefaultController<Uint8Array>);

      const result = sendHeartbeat('hb-client');

      expect(result).toBe(true);
      expect(controller.enqueue).toHaveBeenCalled();

      const sentChunk = controller.chunks[0];
      const sentString = new TextDecoder().decode(sentChunk);
      expect(sentString).toContain(':heartbeat');
    });

    it('should return false for non-existent client', () => {
      const result = sendHeartbeat('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('getSessionClientCount', () => {
    it('should return 0 for session with no clients', () => {
      expect(getSessionClientCount('empty-session')).toBe(0);
    });

    it('should return correct count', () => {
      const controller1 = createMockController();
      const controller2 = createMockController();

      registerClient('count-1', 'session-count', controller1 as unknown as ReadableStreamDefaultController<Uint8Array>);
      registerClient('count-2', 'session-count', controller2 as unknown as ReadableStreamDefaultController<Uint8Array>);

      expect(getSessionClientCount('session-count')).toBe(2);
    });
  });

  describe('getTotalClientCount', () => {
    it('should return total clients across all sessions', () => {
      const initialCount = getTotalClientCount();

      const controller1 = createMockController();
      const controller2 = createMockController();
      const controller3 = createMockController();

      registerClient('total-1', 'session-a', controller1 as unknown as ReadableStreamDefaultController<Uint8Array>);
      registerClient('total-2', 'session-b', controller2 as unknown as ReadableStreamDefaultController<Uint8Array>);
      registerClient('total-3', 'session-c', controller3 as unknown as ReadableStreamDefaultController<Uint8Array>);

      expect(getTotalClientCount()).toBe(initialCount + 3);
    });
  });

  describe('Event Types', () => {
    it('should support tool:created event', () => {
      const controller = createMockController();
      registerClient('type-created', 'session-types', controller as unknown as ReadableStreamDefaultController<Uint8Array>);

      const event: ToolEvent = {
        id: 'created-1',
        type: 'tool:created',
        toolType: 'mindmap',
        sessionId: 'session-types',
        maestroId: 'archimede',
        timestamp: Date.now(),
        data: { title: 'New Mindmap', subject: 'mathematics' },
      };

      broadcastToolEvent(event);
      expect(controller.enqueue).toHaveBeenCalled();
    });

    it('should support tool:update event', () => {
      const controller = createMockController();
      registerClient('type-update', 'session-types2', controller as unknown as ReadableStreamDefaultController<Uint8Array>);

      const event: ToolEvent = {
        id: 'update-1',
        type: 'tool:update',
        toolType: 'flashcard',
        sessionId: 'session-types2',
        maestroId: 'dante',
        timestamp: Date.now(),
        data: { chunk: 'New flashcard content', progress: 25 },
      };

      broadcastToolEvent(event);
      expect(controller.enqueue).toHaveBeenCalled();
    });

    it('should support tool:complete event', () => {
      const controller = createMockController();
      registerClient('type-complete', 'session-types3', controller as unknown as ReadableStreamDefaultController<Uint8Array>);

      const event: ToolEvent = {
        id: 'complete-1',
        type: 'tool:complete',
        toolType: 'quiz',
        sessionId: 'session-types3',
        maestroId: 'galileo',
        timestamp: Date.now(),
        data: { content: { questions: [] } },
      };

      broadcastToolEvent(event);
      expect(controller.enqueue).toHaveBeenCalled();
    });

    it('should support tool:error event', () => {
      const controller = createMockController();
      registerClient('type-error', 'session-types4', controller as unknown as ReadableStreamDefaultController<Uint8Array>);

      const event: ToolEvent = {
        id: 'error-1',
        type: 'tool:error',
        toolType: 'diagram',
        sessionId: 'session-types4',
        maestroId: 'da-vinci',
        timestamp: Date.now(),
        data: { error: 'Failed to generate diagram' },
      };

      broadcastToolEvent(event);
      expect(controller.enqueue).toHaveBeenCalled();
    });

    it('should support tool:cancelled event', () => {
      const controller = createMockController();
      registerClient('type-cancel', 'session-types5', controller as unknown as ReadableStreamDefaultController<Uint8Array>);

      const event: ToolEvent = {
        id: 'cancel-1',
        type: 'tool:cancelled',
        toolType: 'timeline',
        sessionId: 'session-types5',
        maestroId: 'cesare',
        timestamp: Date.now(),
        data: {},
      };

      broadcastToolEvent(event);
      expect(controller.enqueue).toHaveBeenCalled();
    });
  });
});
