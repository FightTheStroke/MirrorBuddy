/**
 * useMindmapModifications Hook
 *
 * Listens for SSE mindmap modification events and provides callbacks
 * for applying changes to the mindmap renderer.
 *
 * Part of Phase 7: Voice Commands for Mindmaps
 */

import { useEffect, useCallback, useRef, useState } from "react";
import { logger } from "@/lib/logger";
import type { MindmapModifyCommand } from "@/lib/realtime/tool-events";

// Modification event from SSE
export interface MindmapModifyEvent {
  id: string;
  type: "mindmap:modify";
  toolType: "mindmap";
  sessionId: string;
  maestroId: string;
  timestamp: number;
  data: {
    command: MindmapModifyCommand;
    args: MindmapModifyArgs;
  };
}

// Union of all modification argument types
export type MindmapModifyArgs =
  | { concept: string; parentNode?: string } // mindmap_add_node
  | { nodeA: string; nodeB: string } // mindmap_connect_nodes
  | { node: string; suggestions?: string[] } // mindmap_expand_node
  | { node: string } // mindmap_delete_node, mindmap_focus_node
  | { node: string; color: string }; // mindmap_set_color

// Callbacks for each modification type
export interface MindmapModificationCallbacks {
  onAddNode?: (concept: string, parentNode?: string) => void;
  onConnectNodes?: (nodeA: string, nodeB: string) => void;
  onExpandNode?: (node: string, suggestions?: string[]) => void;
  onDeleteNode?: (node: string) => void;
  onFocusNode?: (node: string) => void;
  onSetColor?: (node: string, color: string) => void;
}

// Hook options
export interface UseMindmapModificationsOptions {
  sessionId: string | null;
  enabled?: boolean;
  callbacks: MindmapModificationCallbacks;
}

// Hook return type
export interface UseMindmapModificationsResult {
  isConnected: boolean;
  lastEvent: MindmapModifyEvent | null;
  reconnect: () => void;
}

/**
 * Hook to listen for SSE mindmap modification events.
 */
export function useMindmapModifications({
  sessionId,
  enabled = true,
  callbacks,
}: UseMindmapModificationsOptions): UseMindmapModificationsResult {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Ref to hold connect function for recursive calls in onerror handler
  const connectRef = useRef<() => void>(() => {});

  // Use state for values that need to trigger re-renders
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<MindmapModifyEvent | null>(null);

  // Store callbacks in ref to avoid re-subscribing on callback changes
  const callbacksRef = useRef(callbacks);

  // Update callbacksRef when callbacks change (in effect, not during render)
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Handle incoming SSE event
  const handleEvent = useCallback((event: MessageEvent) => {
    try {
      // Skip heartbeat events
      if (event.data.startsWith(":")) return;

      const data = JSON.parse(event.data);

      // Only handle mindmap:modify events
      if (data.type !== "mindmap:modify") return;

      const modifyEvent = data as MindmapModifyEvent;
      setLastEvent(modifyEvent);

      const { command, args } = modifyEvent.data;

      logger.info("[MindmapModifications] Received event", { command, args });

      // Dispatch to appropriate callback
      switch (command) {
        case "mindmap_add_node": {
          const { concept, parentNode } = args as {
            concept: string;
            parentNode?: string;
          };
          callbacksRef.current.onAddNode?.(concept, parentNode);
          break;
        }
        case "mindmap_connect_nodes": {
          const { nodeA, nodeB } = args as { nodeA: string; nodeB: string };
          callbacksRef.current.onConnectNodes?.(nodeA, nodeB);
          break;
        }
        case "mindmap_expand_node": {
          const { node, suggestions } = args as {
            node: string;
            suggestions?: string[];
          };
          callbacksRef.current.onExpandNode?.(node, suggestions);
          break;
        }
        case "mindmap_delete_node": {
          const { node } = args as { node: string };
          callbacksRef.current.onDeleteNode?.(node);
          break;
        }
        case "mindmap_focus_node": {
          const { node } = args as { node: string };
          callbacksRef.current.onFocusNode?.(node);
          break;
        }
        case "mindmap_set_color": {
          const { node, color } = args as { node: string; color: string };
          callbacksRef.current.onSetColor?.(node, color);
          break;
        }
        default:
          logger.warn("[MindmapModifications] Unknown command", { command });
      }
    } catch (error) {
      logger.error("[MindmapModifications] Failed to parse event", {
        error: String(error),
      });
    }
  }, []);

  // Connect to SSE endpoint
  const connect = useCallback(() => {
    if (!sessionId || !enabled) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `/api/tools/stream?sessionId=${encodeURIComponent(sessionId)}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      logger.info("[MindmapModifications] SSE connected", { sessionId });
      setIsConnected(true);
    };

    eventSource.onmessage = handleEvent;

    eventSource.onerror = (error) => {
      logger.warn("[MindmapModifications] SSE error, reconnecting...", {
        error,
      });
      setIsConnected(false);

      // Reconnect after 3 seconds using ref to avoid lexical access issue
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        connectRef.current();
      }, 3000);
    };
  }, [sessionId, enabled, handleEvent]);

  // Keep connectRef in sync with connect (in effect, not during render)
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    connect();
  }, [connect]);

  // Setup SSE connection
  useEffect(() => {
    if (enabled && sessionId) {
      connect();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      setIsConnected(false);
    };
  }, [sessionId, enabled, connect]);

  return {
    isConnected,
    lastEvent,
    reconnect,
  };
}
