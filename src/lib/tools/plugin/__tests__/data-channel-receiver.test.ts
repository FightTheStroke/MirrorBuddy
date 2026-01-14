/**
 * Tests for ToolDataChannelReceiver
 * Verifies WebRTC DataChannel message receiving and event dispatch
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ToolDataChannelReceiver,
  createToolDataChannelReceiver,
  ToolEventCallback,
} from '../data-channel-receiver';
import { MAX_MESSAGE_SIZE } from '../constants';

// Mock logger - must use inline object for vi.mock hoisting
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Get reference to mocked logger for assertions
import { logger as mockLogger } from '@/lib/logger';

// Mock data-channel-protocol
vi.mock('../data-channel-protocol', () => ({
  deserializeMessage: vi.fn((data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.toolId && parsed.type) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }),
}));

// Create mock RTCDataChannel
function createMockDataChannel(): RTCDataChannel {
  return {
    onmessage: null,
    onclose: null,
    onerror: null,
    send: vi.fn(),
    close: vi.fn(),
    readyState: 'open',
    label: 'test-channel',
  } as unknown as RTCDataChannel;
}

describe('ToolDataChannelReceiver', () => {
  let receiver: ToolDataChannelReceiver;
  let mockCallback: ToolEventCallback;
  let mockChannel: RTCDataChannel;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCallback = vi.fn();
    receiver = new ToolDataChannelReceiver(mockCallback);
    mockChannel = createMockDataChannel();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with callback', () => {
      expect(receiver).toBeDefined();
      expect(receiver.isChannelAttached()).toBe(false);
    });
  });

  describe('attachToChannel', () => {
    it('should attach to RTCDataChannel', () => {
      receiver.attachToChannel(mockChannel);
      expect(receiver.isChannelAttached()).toBe(true);
    });

    it('should set up message handler', () => {
      receiver.attachToChannel(mockChannel);
      expect(mockChannel.onmessage).toBeDefined();
    });

    it('should set up close handler', () => {
      receiver.attachToChannel(mockChannel);
      expect(mockChannel.onclose).toBeDefined();
    });

    it('should set up error handler', () => {
      receiver.attachToChannel(mockChannel);
      expect(mockChannel.onerror).toBeDefined();
    });

    it('should detach from previous channel when attaching to new one', () => {
      const firstChannel = createMockDataChannel();
      const secondChannel = createMockDataChannel();

      receiver.attachToChannel(firstChannel);
      receiver.attachToChannel(secondChannel);

      expect(firstChannel.onmessage).toBeNull();
      expect(secondChannel.onmessage).toBeDefined();
    });
  });

  describe('handleMessage', () => {
    it('should process valid message and call callback', () => {
      const validMessage = { toolId: 'test_tool', type: 'completion' };
      const messageEvent = {
        data: JSON.stringify(validMessage),
      } as MessageEvent<string>;

      receiver.handleMessage(messageEvent);

      expect(mockCallback).toHaveBeenCalledWith(validMessage);
    });

    it('should reject messages exceeding size limit', () => {
            const largeData = 'x'.repeat(MAX_MESSAGE_SIZE + 1);
      const messageEvent = {
        data: largeData,
      } as MessageEvent<string>;

      receiver.handleMessage(messageEvent);

      expect(mockCallback).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle invalid message format', () => {
            const messageEvent = {
        data: JSON.stringify({ invalid: 'data' }),
      } as MessageEvent<string>;

      receiver.handleMessage(messageEvent);

      expect(mockCallback).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle parse errors gracefully', () => {
            const messageEvent = {
        data: 'not-valid-json{{{',
      } as MessageEvent<string>;

      receiver.handleMessage(messageEvent);

      expect(mockCallback).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('channel event handlers', () => {
    it('should handle channel close', () => {
            receiver.attachToChannel(mockChannel);

      // Simulate channel close
      (mockChannel.onclose as Function)();

      expect(receiver.isChannelAttached()).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('channel closed')
      );
    });

    it('should handle channel error', () => {
            receiver.attachToChannel(mockChannel);

      // Simulate channel error
      const errorEvent = { error: { message: 'Connection failed' } };
      (mockChannel.onerror as Function)(errorEvent);

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle channel error without error object', () => {
            receiver.attachToChannel(mockChannel);

      // Simulate channel error without details
      (mockChannel.onerror as Function)({});

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('detach', () => {
    it('should detach from channel', () => {
      receiver.attachToChannel(mockChannel);
      expect(receiver.isChannelAttached()).toBe(true);

      receiver.detach();

      expect(receiver.isChannelAttached()).toBe(false);
      expect(mockChannel.onmessage).toBeNull();
    });

    it('should do nothing if not attached', () => {
      // Should not throw
      receiver.detach();
      expect(receiver.isChannelAttached()).toBe(false);
    });
  });

  describe('setEventCallback', () => {
    it('should update callback', () => {
      const newCallback = vi.fn();
      receiver.setEventCallback(newCallback);

      const validMessage = { toolId: 'test', type: 'start' };
      const messageEvent = {
        data: JSON.stringify(validMessage),
      } as MessageEvent<string>;

      receiver.handleMessage(messageEvent);

      expect(newCallback).toHaveBeenCalled();
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('createToolDataChannelReceiver factory', () => {
    it('should create ToolDataChannelReceiver instance', () => {
      const callback = vi.fn();
      const instance = createToolDataChannelReceiver(callback);

      expect(instance).toBeInstanceOf(ToolDataChannelReceiver);
    });
  });
});
