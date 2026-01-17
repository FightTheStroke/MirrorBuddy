/**
 * Dual-Path Event Broadcaster - Unified interface for tool events
 * Routes events through DataChannel (primary) or SSE fallback (F-06)
 * Ensures reliable delivery across connection types
 */

import { logger } from '@/lib/logger';
import type { ToolDataChannelMessage } from './data-channel-protocol';
import { ToolDataChannelSender } from './data-channel-sender';
import type { EventBroadcaster as EventBroadcasterInterface } from './orchestrator';

/**
 * ToolEventBroadcaster - Manages dual-path event delivery
 * Primary: WebRTC DataChannel for real-time communication
 * Fallback: SSE/REST for text-only sessions
 * Implements the EventBroadcaster interface for orchestrator integration
 */
export class ToolEventBroadcaster implements EventBroadcasterInterface {
  private sender: ToolDataChannelSender | null;
  private sessionId: string | null = null;

  constructor(sender: ToolDataChannelSender | null = null, sessionId?: string) {
    this.sender = sender;
    this.sessionId = sessionId || null;
  }

  /**
   * Send a tool event using DataChannel or SSE fallback
   * Implements EventBroadcaster interface
   * Returns success for DataChannel, schedules SSE fallback asynchronously
   */
  sendEvent(event: ToolDataChannelMessage): boolean {
    // Try DataChannel first
    if (this.isUsingDataChannel()) {
      const success = this.sender!.sendEvent(event);
      if (success) {
        logger.debug('[ToolEventBroadcaster] Event sent via DataChannel', {
          toolId: event.toolId,
          eventType: event.type,
        });
        return true;
      }
    }

    // Schedule SSE fallback asynchronously
    this.broadcastViaSSE(event).catch((err) => {
      logger.error('[ToolEventBroadcaster] SSE broadcast promise rejected', {
        toolId: event.toolId,
        error: err instanceof Error ? err.message : String(err),
      });
    });

    return false; // DataChannel not available
  }

  /**
   * Send event via SSE fallback endpoint
   */
  private async broadcastViaSSE(event: ToolDataChannelMessage): Promise<boolean> {
    try {
      const response = await fetch('/api/tools/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          sessionId: this.sessionId,
        }),
      });

      if (!response.ok) {
        logger.warn('[ToolEventBroadcaster] SSE fallback failed', {
          toolId: event.toolId,
          status: response.status,
        });
        return false;
      }

      logger.debug('[ToolEventBroadcaster] Event sent via SSE fallback', {
        toolId: event.toolId,
        eventType: event.type,
      });
      return true;
    } catch (error) {
      logger.error('[ToolEventBroadcaster] SSE broadcast error', {
        toolId: event.toolId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Set or update the DataChannel sender
   */
  setDataChannelSender(sender: ToolDataChannelSender | null): void {
    this.sender = sender;
    logger.debug('[ToolEventBroadcaster] Sender updated', {
      hasDataChannel: this.isUsingDataChannel(),
    });
  }

  /**
   * Set the session ID for SSE fallback
   */
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  /**
   * Check if using DataChannel for delivery
   */
  isUsingDataChannel(): boolean {
    return this.sender !== null && this.sender.isConnected();
  }

  /**
   * Get delivery mode for debugging
   */
  getDeliveryMode(): 'dataChannel' | 'sse' {
    return this.isUsingDataChannel() ? 'dataChannel' : 'sse';
  }

  /**
   * Convenience method for broadcasting with explicit call
   */
  broadcast(event: ToolDataChannelMessage): void {
    this.sendEvent(event);
  }
}

/**
 * Factory function to create a ToolEventBroadcaster
 */
export function createToolEventBroadcaster(
  sender?: ToolDataChannelSender | null,
  sessionId?: string,
): ToolEventBroadcaster {
  return new ToolEventBroadcaster(sender || null, sessionId);
}

