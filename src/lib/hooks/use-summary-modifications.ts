/**
 * useSummaryModifications Hook
 *
 * Listens for SSE summary modification events and provides callbacks
 * for applying real-time changes to the summary editor.
 *
 * Part of Issue #70: Real-time summary tool
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Summary modification commands
 */
export type SummaryModifyCommand =
  | 'summary_set_title'
  | 'summary_add_section'
  | 'summary_update_section'
  | 'summary_delete_section'
  | 'summary_add_point'
  | 'summary_delete_point'
  | 'summary_finalize';

/**
 * Modification event from SSE
 */
export interface SummaryModifyEvent {
  id: string;
  type: 'summary:modify';
  toolType: 'summary';
  sessionId: string;
  maestroId: string;
  timestamp: number;
  data: {
    command: SummaryModifyCommand;
    args: SummaryModifyArgs;
  };
}

/**
 * Union of all modification argument types
 */
export type SummaryModifyArgs =
  | { title: string }                                      // summary_set_title
  | { title: string; content?: string; keyPoints?: string[] }  // summary_add_section
  | { sectionIndex: number; title?: string; content?: string; keyPoints?: string[] }  // summary_update_section
  | { sectionIndex: number }                               // summary_delete_section
  | { sectionIndex: number; point: string }                // summary_add_point
  | { sectionIndex: number; pointIndex: number }           // summary_delete_point
  | Record<string, never>;                                 // summary_finalize

/**
 * Callbacks for each modification type
 */
export interface SummaryModificationCallbacks {
  onSetTitle?: (title: string) => void;
  onAddSection?: (title: string, content?: string, keyPoints?: string[]) => void;
  onUpdateSection?: (sectionIndex: number, updates: { title?: string; content?: string; keyPoints?: string[] }) => void;
  onDeleteSection?: (sectionIndex: number) => void;
  onAddPoint?: (sectionIndex: number, point: string) => void;
  onDeletePoint?: (sectionIndex: number, pointIndex: number) => void;
  onFinalize?: () => void;
}

/**
 * Hook options
 */
export interface UseSummaryModificationsOptions {
  sessionId: string | null;
  enabled?: boolean;
  callbacks: SummaryModificationCallbacks;
}

/**
 * Hook return type
 */
export interface UseSummaryModificationsResult {
  isConnected: boolean;
  lastEvent: SummaryModifyEvent | null;
  reconnect: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to listen for SSE summary modification events.
 */
export function useSummaryModifications({
  sessionId,
  enabled = true,
  callbacks,
}: UseSummaryModificationsOptions): UseSummaryModificationsResult {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectRef = useRef<() => void>(() => {});

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SummaryModifyEvent | null>(null);

  // Store callbacks in ref to avoid re-subscribing on callback changes
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Handle incoming SSE event
  const handleEvent = useCallback((event: MessageEvent) => {
    try {
      // Skip heartbeat events
      if (event.data.startsWith(':')) return;

      const data = JSON.parse(event.data);

      // Only handle summary:modify events
      if (data.type !== 'summary:modify') return;

      const modifyEvent = data as SummaryModifyEvent;
      setLastEvent(modifyEvent);

      const { command, args } = modifyEvent.data;

      logger.info('[SummaryModifications] Received event', { command, args });

      // Dispatch to appropriate callback
      switch (command) {
        case 'summary_set_title': {
          const { title } = args as { title: string };
          callbacksRef.current.onSetTitle?.(title);
          break;
        }
        case 'summary_add_section': {
          const { title, content, keyPoints } = args as {
            title: string;
            content?: string;
            keyPoints?: string[];
          };
          callbacksRef.current.onAddSection?.(title, content, keyPoints);
          break;
        }
        case 'summary_update_section': {
          const { sectionIndex, title, content, keyPoints } = args as {
            sectionIndex: number;
            title?: string;
            content?: string;
            keyPoints?: string[];
          };
          callbacksRef.current.onUpdateSection?.(sectionIndex, { title, content, keyPoints });
          break;
        }
        case 'summary_delete_section': {
          const { sectionIndex } = args as { sectionIndex: number };
          callbacksRef.current.onDeleteSection?.(sectionIndex);
          break;
        }
        case 'summary_add_point': {
          const { sectionIndex, point } = args as { sectionIndex: number; point: string };
          callbacksRef.current.onAddPoint?.(sectionIndex, point);
          break;
        }
        case 'summary_delete_point': {
          const { sectionIndex, pointIndex } = args as { sectionIndex: number; pointIndex: number };
          callbacksRef.current.onDeletePoint?.(sectionIndex, pointIndex);
          break;
        }
        case 'summary_finalize': {
          callbacksRef.current.onFinalize?.();
          break;
        }
        default:
          logger.warn('[SummaryModifications] Unknown command', { command });
      }
    } catch (error) {
      logger.error('[SummaryModifications] Failed to parse event', { error: String(error) });
    }
  }, []);

  // Connect to SSE endpoint
  const connect = useCallback(() => {
    if (!sessionId || !enabled) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `/api/tools/sse?sessionId=${encodeURIComponent(sessionId)}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      logger.info('[SummaryModifications] SSE connected', { sessionId });
      setIsConnected(true);
    };

    eventSource.onmessage = handleEvent;

    eventSource.onerror = (error) => {
      logger.warn('[SummaryModifications] SSE error, reconnecting...', { error });
      setIsConnected(false);

      // Reconnect after 3 seconds
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        connectRef.current();
      }, 3000);
    };
  }, [sessionId, enabled, handleEvent]);

  // Keep connectRef in sync with connect
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
