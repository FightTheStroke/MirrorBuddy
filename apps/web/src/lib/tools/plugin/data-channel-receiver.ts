/**
 * Tool DataChannel Receiver
 * Receives and processes tool events from WebRTC DataChannel (F-14)
 * Handles deserialization, validation, and event dispatch
 *
 * Security: Implements max message size to prevent memory exhaustion attacks
 */

import { logger } from '@/lib/logger';
import type { ToolDataChannelMessage } from './data-channel-protocol';
import { deserializeMessage } from './data-channel-protocol';
import { MAX_MESSAGE_SIZE } from './constants';

/**
 * Callback function type for tool event handling
 */
export type ToolEventCallback = (event: ToolDataChannelMessage) => void;

/**
 * ToolDataChannelReceiver - Manages receiving tool events via WebRTC DataChannel
 * Deserializes messages with error handling and dispatches to registered callbacks
 */
export class ToolDataChannelReceiver {
  private channel: RTCDataChannel | null;
  private onEvent: ToolEventCallback;
  private isAttached: boolean = false;

  /**
   * Initialize receiver with event callback
   * @param onEvent - Callback function to invoke when valid tool event received
   */
  constructor(onEvent: ToolEventCallback) {
    this.channel = null;
    this.onEvent = onEvent;
  }

  /**
   * Attach receiver to an RTCDataChannel
   * Sets up message handling and lifecycle handlers
   */
  attachToChannel(channel: RTCDataChannel): void {
    // Detach from previous channel if attached
    if (this.isAttached && this.channel) {
      this.channel.onmessage = null;
      this.channel.onclose = null;
      this.channel.onerror = null;
    }

    this.channel = channel;
    this.isAttached = true;

    // Handle incoming messages
    channel.onmessage = (event) => {
      this.handleMessage(event);
    };

    // Clean up on channel close
    channel.onclose = () => {
      logger.debug('[ToolDataChannel] Receiver: channel closed');
      this.isAttached = false;
    };

    // Log channel errors
    channel.onerror = (event) => {
      logger.error('[ToolDataChannel] Receiver: channel error', {
        error: event.error?.message || 'Unknown error',
      });
    };

    logger.debug('[ToolDataChannel] Receiver attached to channel');
  }

  /**
   * Handle incoming message from DataChannel
   * Deserializes and validates message, then dispatches to callback
   *
   * Security: Validates message size before processing to prevent memory exhaustion
   */
  handleMessage(event: MessageEvent<string>): void {
    try {
      // Security: Reject oversized messages to prevent memory exhaustion
      if (event.data.length > MAX_MESSAGE_SIZE) {
        logger.warn('[ToolDataChannel] Receiver: message exceeds size limit', {
          size: event.data.length,
          maxSize: MAX_MESSAGE_SIZE,
        });
        return;
      }

      const message = deserializeMessage(event.data);

      if (!message) {
        logger.warn('[ToolDataChannel] Receiver: invalid message format', {
          rawData: event.data.substring(0, 100), // Log first 100 chars for debugging
        });
        return;
      }

      // Dispatch valid event to callback
      this.onEvent(message);
      logger.debug('[ToolDataChannel] Receiver: event processed', {
        toolId: message.toolId,
        type: message.type,
      });
    } catch (error) {
      logger.error('[ToolDataChannel] Receiver: deserialization error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        rawData: event.data.substring(0, 100),
      });
    }
  }

  /**
   * Detach receiver from DataChannel
   * Cleans up event handlers and resets state
   */
  detach(): void {
    if (this.channel && this.isAttached) {
      this.channel.onmessage = null;
      this.channel.onclose = null;
      this.channel.onerror = null;
      this.isAttached = false;
      logger.debug('[ToolDataChannel] Receiver detached from channel');
    }
  }

  /**
   * Check if receiver is currently attached to a channel
   */
  isChannelAttached(): boolean {
    return this.isAttached && this.channel !== null;
  }

  /**
   * Update the event callback
   * Useful for changing handler after initialization
   */
  setEventCallback(callback: ToolEventCallback): void {
    this.onEvent = callback;
  }
}

/**
 * Factory function to create and initialize a ToolDataChannelReceiver
 */
export function createToolDataChannelReceiver(
  onEvent: ToolEventCallback,
): ToolDataChannelReceiver {
  return new ToolDataChannelReceiver(onEvent);
}
