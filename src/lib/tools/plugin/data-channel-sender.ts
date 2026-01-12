/**
 * Tool DataChannel Sender
 * Sends tool events over WebRTC DataChannel with connection state management (F-14)
 */

import { logger } from '@/lib/logger';
import type { ToolDataChannelMessage } from './data-channel-protocol';
import { serializeMessage } from './data-channel-protocol';

/**
 * ToolDataChannelSender - Manages sending tool events via WebRTC DataChannel
 * Handles connection states, serialization, and error handling
 */
export class ToolDataChannelSender {
  private channel: RTCDataChannel | null;
  private isOpen: boolean = false;

  constructor(channel: RTCDataChannel | null = null) {
    this.channel = channel;
    if (channel) {
      this.attachChannelHandlers(channel);
    }
  }

  /**
   * Set or update the DataChannel reference
   * Attaches event handlers to the new channel
   */
  setChannel(channel: RTCDataChannel | null): void {
    // Detach handlers from old channel if present
    if (this.channel) {
      this.channel.onopen = null;
      this.channel.onclose = null;
      this.channel.onerror = null;
    }

    this.channel = channel;
    this.isOpen = false;

    if (channel) {
      this.attachChannelHandlers(channel);
    }
  }

  /**
   * Send a tool event through the DataChannel
   * Returns true if send was successful, false otherwise
   */
  sendEvent(event: ToolDataChannelMessage): boolean {
    if (!this.isConnected()) {
      logger.warn('[ToolDataChannel] Cannot send event: channel not connected', {
        toolId: event.toolId,
        eventType: event.type,
      });
      return false;
    }

    try {
      const serialized = serializeMessage(event);
      this.channel!.send(serialized);
      logger.debug('[ToolDataChannel] Event sent', {
        toolId: event.toolId,
        eventType: event.type,
      });
      return true;
    } catch (error) {
      logger.error('[ToolDataChannel] Failed to send event', {
        toolId: event.toolId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Check if DataChannel is connected and ready
   */
  isConnected(): boolean {
    return this.channel !== null && this.isOpen && this.channel.readyState === 'open';
  }

  /**
   * Attach event handlers to DataChannel
   */
  private attachChannelHandlers(channel: RTCDataChannel): void {
    channel.onopen = () => {
      this.isOpen = true;
      logger.debug('[ToolDataChannel] Channel opened');
    };

    channel.onclose = () => {
      this.isOpen = false;
      logger.debug('[ToolDataChannel] Channel closed');
    };

    channel.onerror = (event) => {
      this.isOpen = false;
      logger.error('[ToolDataChannel] Channel error', {
        error: event.error?.message || 'Unknown error',
      });
    };
  }
}

/**
 * Factory function to create and initialize a ToolDataChannelSender
 */
export function createToolDataChannelSender(
  channel: RTCDataChannel | null = null,
): ToolDataChannelSender {
  return new ToolDataChannelSender(channel);
}
