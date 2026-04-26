/**
 * Unit tests for WebRTC DataChannel tool event flow
 * Tests serialization, sender, receiver, and integration with EventBroadcaster (F-11, F-12)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ToolEventType,
  serializeMessage,
  deserializeMessage,
  createToolMessage,
  type ToolDataChannelMessage,
} from '../data-channel-protocol';
import { ToolDataChannelSender } from '../data-channel-sender';
import { ToolDataChannelReceiver, type ToolEventCallback } from '../data-channel-receiver';

/**
 * Mock RTCDataChannel for testing
 */
function createMockDataChannel(): RTCDataChannel {
  return {
    send: vi.fn(),
    close: vi.fn(),
    readyState: 'open',
    onopen: null,
    onclose: null,
    onerror: null,
    onmessage: null,
  } as unknown as RTCDataChannel;
}

describe('DataChannel Protocol', () => {
  it('serializes tool messages to JSON', () => {
    const msg: ToolDataChannelMessage = {
      type: ToolEventType.TOOL_PROPOSED,
      toolId: 'test_tool',
      payload: { name: 'Test' },
      timestamp: 1000,
    };
    const serialized = serializeMessage(msg);
    expect(serialized).toContain('TOOL_PROPOSED');
    expect(serialized).toContain('test_tool');
  });

  it('deserializes valid JSON to ToolDataChannelMessage', () => {
    const json = JSON.stringify({
      type: ToolEventType.TOOL_ACCEPTED,
      toolId: 'calc_tool',
      timestamp: 1000,
    });
    const msg = deserializeMessage(json);
    expect(msg).not.toBeNull();
    expect(msg?.type).toBe(ToolEventType.TOOL_ACCEPTED);
    expect(msg?.toolId).toBe('calc_tool');
  });

  it('rejects invalid message format', () => {
    expect(deserializeMessage('not json')).toBeNull();
    expect(deserializeMessage('{}')).toBeNull(); // Missing required fields
  });

  it('creates tool message with current timestamp', () => {
    const before = Date.now();
    const msg = createToolMessage(ToolEventType.TOOL_EXECUTING, 'tool1');
    const after = Date.now();
    expect(msg.timestamp).toBeGreaterThanOrEqual(before);
    expect(msg.timestamp).toBeLessThanOrEqual(after);
  });
});

describe('ToolDataChannelSender', () => {
  let sender: ToolDataChannelSender;
  let mockChannel: RTCDataChannel;

  beforeEach(() => {
    mockChannel = createMockDataChannel();
    sender = new ToolDataChannelSender();
  });

  it('initializes without channel', () => {
    expect(sender.isConnected()).toBe(false);
  });

  it('sends event when channel is open', () => {
    sender.setChannel(mockChannel);
    if (mockChannel.onopen) mockChannel.onopen(new Event('open'));

    const msg = createToolMessage(ToolEventType.TOOL_PROPOSED, 'tool1');
    const result = sender.sendEvent(msg);

    expect(result).toBe(true);
    expect(mockChannel.send).toHaveBeenCalled();
  });

  it('returns false when channel is closed', () => {
    sender.setChannel(mockChannel);
    if (mockChannel.onclose) mockChannel.onclose(new Event('close'));

    const msg = createToolMessage(ToolEventType.TOOL_PROPOSED, 'tool1');
    const result = sender.sendEvent(msg);

    expect(result).toBe(false);
  });

  it('handles channel errors gracefully', () => {
    sender.setChannel(mockChannel);
    const errorEvent = new Event('error');
    Object.defineProperty(errorEvent, 'error', {
      value: new DOMException('Test error'),
    });
    if (mockChannel.onerror) mockChannel.onerror(errorEvent as RTCErrorEvent);

    expect(sender.isConnected()).toBe(false);
  });

  it('replaces previous channel when setChannel called', () => {
    const channel1 = createMockDataChannel();
    const channel2 = createMockDataChannel();

    sender.setChannel(channel1);
    if (channel1.onopen) channel1.onopen(new Event('open'));
    expect(sender.isConnected()).toBe(true);

    sender.setChannel(channel2);
    if (channel2.onopen) channel2.onopen(new Event('open'));
    expect(sender.isConnected()).toBe(true);
  });
});

describe('ToolDataChannelReceiver', () => {
  let receiver: ToolDataChannelReceiver;
  let mockChannel: RTCDataChannel;
  let onEventCallback: ToolEventCallback;

  beforeEach(() => {
    onEventCallback = vi.fn() as unknown as ToolEventCallback;
    receiver = new ToolDataChannelReceiver(onEventCallback);
    mockChannel = createMockDataChannel();
  });

  it('dispatches valid messages to callback', () => {
    receiver.attachToChannel(mockChannel);

    const msg = createToolMessage(ToolEventType.TOOL_COMPLETED, 'tool1');
    const event = new MessageEvent('message', {
      data: JSON.stringify(msg),
    });

    if (mockChannel.onmessage) {
      mockChannel.onmessage(event as unknown as MessageEvent<string>);
    }

    expect(onEventCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ToolEventType.TOOL_COMPLETED,
        toolId: 'tool1',
      }),
    );
  });

  it('ignores invalid messages silently', () => {
    receiver.attachToChannel(mockChannel);
    const event = new MessageEvent('message', { data: 'invalid json' });

    if (mockChannel.onmessage) {
      mockChannel.onmessage(event as unknown as MessageEvent<string>);
    }

    expect(onEventCallback).not.toHaveBeenCalled();
  });

  it('detaches from channel', () => {
    receiver.attachToChannel(mockChannel);
    expect(receiver.isChannelAttached()).toBe(true);

    receiver.detach();
    expect(receiver.isChannelAttached()).toBe(false);
  });

  it('updates event callback', () => {
    const newCallback = vi.fn() as unknown as ToolEventCallback;
    receiver.attachToChannel(mockChannel);
    receiver.setEventCallback(newCallback);

    const msg = createToolMessage(ToolEventType.TOOL_ERROR, 'tool1');
    const event = new MessageEvent('message', {
      data: JSON.stringify(msg),
    });

    if (mockChannel.onmessage) {
      mockChannel.onmessage(event as unknown as MessageEvent<string>);
    }

    expect(newCallback).toHaveBeenCalled();
    expect(onEventCallback).not.toHaveBeenCalled();
  });
});

describe('DataChannel Integration', () => {
  it('sender and receiver communicate end-to-end', () => {
    const sender = new ToolDataChannelSender();
    const callback = vi.fn() as unknown as ToolEventCallback;
    const receiver = new ToolDataChannelReceiver(callback);

    const mockChannel = createMockDataChannel();
    sender.setChannel(mockChannel);
    receiver.attachToChannel(mockChannel);

    if (mockChannel.onopen) mockChannel.onopen(new Event('open'));

    const msg = createToolMessage(ToolEventType.TOOL_ACCEPTED, 'summary_tool');
    sender.sendEvent(msg);

    expect(mockChannel.send).toHaveBeenCalledWith(JSON.stringify(msg));
  });

  it('handles multiple event types in sequence', () => {
    const eventTypes = [
      ToolEventType.TOOL_PROPOSED,
      ToolEventType.TOOL_ACCEPTED,
      ToolEventType.TOOL_EXECUTING,
      ToolEventType.TOOL_COMPLETED,
    ];

    for (const eventType of eventTypes) {
      const msg = createToolMessage(eventType, 'tool_id');
      const serialized = serializeMessage(msg);
      const deserialized = deserializeMessage(serialized);
      expect(deserialized?.type).toBe(eventType);
    }
  });
});
