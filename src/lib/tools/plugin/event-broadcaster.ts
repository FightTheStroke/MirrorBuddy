/**
 * Dual-Path Event Broadcaster - Unified interface for tool events
 * Routes events through DataChannel (primary) or SSE fallback (F-06)
 * Ensures reliable delivery across connection types
 */

import { logger } from "@/lib/logger";
import { csrfFetch } from "@/lib/auth/csrf-client";
import type {
  ToolEventType as RealtimeToolEventTypeAlias,
  ToolType as RealtimeToolType,
} from "@/lib/realtime/tool-events";
import type { ToolDataChannelMessage } from "./data-channel-protocol";
import { ToolDataChannelSender } from "./data-channel-sender";
import { ToolEventType } from "./data-channel-protocol";
import type { EventBroadcaster as EventBroadcasterInterface } from "./orchestrator";

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
        logger.debug("[ToolEventBroadcaster] Event sent via DataChannel", {
          toolId: event.toolId,
          eventType: event.type,
        });
        return true;
      }
    }

    // Schedule SSE fallback asynchronously
    this.broadcastViaSSE(event).catch((err) => {
      logger.error("[ToolEventBroadcaster] SSE broadcast promise rejected", {
        toolId: event.toolId,
        error: err instanceof Error ? err.message : String(err),
      });
    });

    return false; // DataChannel not available
  }

  /**
   * Send event via SSE fallback endpoint
   * CSRF: Must use csrfFetch for POST requests on Vercel (ADR 0053)
   */
  private async broadcastViaSSE(
    event: ToolDataChannelMessage,
  ): Promise<boolean> {
    try {
      const payload = this.mapToSsePayload(event);
      if (!payload) {
        logger.warn("[ToolEventBroadcaster] SSE payload missing metadata", {
          toolId: event.toolId,
          eventType: event.type,
        });
        return false;
      }

      const response = await csrfFetch("/api/tools/events", {
        method: "POST",
        body: JSON.stringify({
          sessionId: payload.sessionId,
          maestroId: payload.maestroId,
          type: payload.type,
          toolType: payload.toolType,
          toolId: payload.toolId,
          data: payload.data,
        }),
      });

      if (!response.ok) {
        logger.warn("[ToolEventBroadcaster] SSE fallback failed", {
          toolId: event.toolId,
          status: response.status,
        });
        return false;
      }

      logger.debug("[ToolEventBroadcaster] Event sent via SSE fallback", {
        toolId: event.toolId,
        eventType: event.type,
      });
      return true;
    } catch (error) {
      logger.error("[ToolEventBroadcaster] SSE broadcast error", {
        toolId: event.toolId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  }

  private mapToSsePayload(event: ToolDataChannelMessage): {
    sessionId: string;
    maestroId: string;
    type: RealtimeToolEventTypeAlias;
    toolType: RealtimeToolType;
    toolId: string;
    data: Record<string, unknown>;
  } | null {
    const sessionId = event.sessionId ?? this.sessionId;
    if (!sessionId || !event.maestroId || !event.toolType) {
      return null;
    }

    const type = this.mapDataChannelType(event.type);
    if (!type) {
      return null;
    }

    const data =
      event.payload && typeof event.payload === "object"
        ? (event.payload as Record<string, unknown>)
        : event.payload === undefined
          ? {}
          : { value: event.payload };

    return {
      sessionId,
      maestroId: event.maestroId,
      type,
      toolType: event.toolType as RealtimeToolType,
      toolId: event.toolId,
      data,
    };
  }

  private mapDataChannelType(
    type: ToolEventType,
  ): RealtimeToolEventTypeAlias | null {
    switch (type) {
      case ToolEventType.TOOL_PROPOSED:
      case ToolEventType.TOOL_ACCEPTED:
      case ToolEventType.TOOL_EXECUTING:
        return "tool:update";
      case ToolEventType.TOOL_COMPLETED:
        return "tool:complete";
      case ToolEventType.TOOL_ERROR:
        return "tool:error";
      case ToolEventType.TOOL_REJECTED:
        return "tool:cancelled";
      default:
        return null;
    }
  }

  /**
   * Set or update the DataChannel sender
   */
  setDataChannelSender(sender: ToolDataChannelSender | null): void {
    this.sender = sender;
    logger.debug("[ToolEventBroadcaster] Sender updated", {
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
  getDeliveryMode(): "dataChannel" | "sse" {
    return this.isUsingDataChannel() ? "dataChannel" : "sse";
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
