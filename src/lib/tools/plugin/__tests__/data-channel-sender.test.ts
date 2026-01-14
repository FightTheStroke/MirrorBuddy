/**
 * Tests for ToolDataChannelSender
 * Verifies WebRTC DataChannel message sending and connection management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ToolDataChannelSender,
  createToolDataChannelSender,
} from '../data-channel-sender';
import { ToolEventType, type ToolDataChannelMessage } from '../data-channel-protocol';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { logger as mockLogger } from '@/lib/logger';

// Mock data-channel-protocol (preserve ToolEventType enum)
vi.mock('../data-channel-protocol', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data-channel-protocol')>();
  return {
    ...actual,
    serializeMessage: vi.fn((msg) => JSON.stringify(msg)),
  };
});

// Create mock RTCDataChannel
function createMockDataChannel(readyState: RTCDataChannelState = 'open'): RTCDataChannel {
  return {
    onopen: null,
    onclose: null,
    onerror: null,
    send: vi.fn(),
    close: vi.fn(),
    readyState,
    label: 'test-channel',
  } as unknown as RTCDataChannel;
}

describe('ToolDataChannelSender', () => {
  let sender: ToolDataChannelSender;
  let mockChannel: RTCDataChannel;

  const testEvent: ToolDataChannelMessage = {
    toolId: 'test_tool',
    type: ToolEventType.TOOL_COMPLETED,
    timestamp: Date.now(),
    payload: { result: 'success' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockChannel = createMockDataChannel();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize without channel', () => {
      sender = new ToolDataChannelSender();
      expect(sender.isConnected()).toBe(false);
    });

    it('should initialize with channel', () => {
      sender = new ToolDataChannelSender(mockChannel);
      // Channel is connected but not open until onopen fires
      expect(sender.isConnected()).toBe(false);
    });

    it('should attach handlers when initialized with channel', () => {
      sender = new ToolDataChannelSender(mockChannel);
      expect(mockChannel.onopen).toBeDefined();
      expect(mockChannel.onclose).toBeDefined();
      expect(mockChannel.onerror).toBeDefined();
    });
  });

  describe('setChannel', () => {
    it('should set a new channel', () => {
      sender = new ToolDataChannelSender();
      sender.setChannel(mockChannel);
      expect(mockChannel.onopen).toBeDefined();
    });

    it('should detach from old channel when setting new one', () => {
      const oldChannel = createMockDataChannel();
      const newChannel = createMockDataChannel();

      sender = new ToolDataChannelSender(oldChannel);
      sender.setChannel(newChannel);

      expect(oldChannel.onopen).toBeNull();
      expect(newChannel.onopen).toBeDefined();
    });

    it('should handle null channel', () => {
      sender = new ToolDataChannelSender(mockChannel);
      sender.setChannel(null);
      expect(sender.isConnected()).toBe(false);
    });
  });

  describe('sendEvent', () => {
    it('should send event when connected', () => {
      sender = new ToolDataChannelSender(mockChannel);
      // Simulate channel open
      (mockChannel.onopen as Function)();

      const result = sender.sendEvent(testEvent);

      expect(result).toBe(true);
      expect(mockChannel.send).toHaveBeenCalled();
    });

    it('should return false when not connected', () => {
      sender = new ToolDataChannelSender();

      const result = sender.sendEvent(testEvent);

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle send errors gracefully', () => {
      sender = new ToolDataChannelSender(mockChannel);
      (mockChannel.onopen as Function)();
      (mockChannel.send as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Send failed');
      });

      const result = sender.sendEvent(testEvent);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('isConnected', () => {
    it('should return false when no channel', () => {
      sender = new ToolDataChannelSender();
      expect(sender.isConnected()).toBe(false);
    });

    it('should return true when channel open', () => {
      sender = new ToolDataChannelSender(mockChannel);
      (mockChannel.onopen as Function)();

      expect(sender.isConnected()).toBe(true);
    });

    it('should return false when channel closed', () => {
      sender = new ToolDataChannelSender(mockChannel);
      (mockChannel.onopen as Function)();
      (mockChannel.onclose as Function)();

      expect(sender.isConnected()).toBe(false);
    });

    it('should return false when channel errors', () => {
      sender = new ToolDataChannelSender(mockChannel);
      (mockChannel.onopen as Function)();
      (mockChannel.onerror as Function)({ error: { message: 'Error' } });

      expect(sender.isConnected()).toBe(false);
    });

    it('should return false when readyState is not open', () => {
      const closingChannel = createMockDataChannel('closing');
      sender = new ToolDataChannelSender(closingChannel);
      (closingChannel.onopen as Function)();

      expect(sender.isConnected()).toBe(false);
    });
  });

  describe('channel event handlers', () => {
    it('should log on channel open', () => {
      sender = new ToolDataChannelSender(mockChannel);
      (mockChannel.onopen as Function)();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('opened')
      );
    });

    it('should log on channel close', () => {
      sender = new ToolDataChannelSender(mockChannel);
      (mockChannel.onclose as Function)();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('closed')
      );
    });

    it('should log on channel error with message', () => {
      sender = new ToolDataChannelSender(mockChannel);
      (mockChannel.onerror as Function)({ error: { message: 'Connection lost' } });

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should log on channel error without message', () => {
      sender = new ToolDataChannelSender(mockChannel);
      (mockChannel.onerror as Function)({});

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('createToolDataChannelSender factory', () => {
    it('should create sender without channel', () => {
      const instance = createToolDataChannelSender();
      expect(instance).toBeInstanceOf(ToolDataChannelSender);
    });

    it('should create sender with channel', () => {
      const instance = createToolDataChannelSender(mockChannel);
      expect(instance).toBeInstanceOf(ToolDataChannelSender);
    });
  });
});
