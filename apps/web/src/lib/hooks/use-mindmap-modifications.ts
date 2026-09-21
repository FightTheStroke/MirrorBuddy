import { useEffect, useCallback, useRef, useState } from 'react';
import { logger } from '@/lib/logger';
import type { MindmapModifyCommand } from '@/lib/realtime/tool-events';
import { MINDMAP_RETRY_DELAYS, type MindmapRecoveryState } from '@/lib/mindmap/snapshot-client';
import type { MindmapSnapshot } from '@/lib/mindmap/protocol';
import { useMindmapSnapshots } from './use-mindmap-snapshots';

export interface MindmapModifyEvent {
  id: string;
  type: 'mindmap:modify';
  toolType: 'mindmap';
  sessionId: string;
  maestroId: string;
  timestamp: number;
  data: {
    command: MindmapModifyCommand;
    args: MindmapModifyArgs;
  };
}

export type MindmapModifyArgs =
  | { concept: string; parentNode?: string } // mindmap_add_node
  | { nodeA: string; nodeB: string } // mindmap_connect_nodes
  | { node: string; suggestions?: string[] } // mindmap_expand_node
  | { node: string } // mindmap_delete_node, mindmap_focus_node
  | { node: string; color: string }; // mindmap_set_color

export interface MindmapModificationCallbacks {
  onAddNode?: (concept: string, parentNode?: string) => void;
  onConnectNodes?: (nodeA: string, nodeB: string) => void;
  onExpandNode?: (node: string, suggestions?: string[]) => void;
  onDeleteNode?: (node: string) => void;
  onFocusNode?: (node: string) => void;
  onSetColor?: (node: string, color: string) => void;
}

export interface UseMindmapModificationsOptions {
  sessionId: string | null;
  toolId?: string | null;
  onSnapshot?: (snapshot: MindmapSnapshot) => void;
  enabled?: boolean;
  callbacks: MindmapModificationCallbacks;
}

export interface UseMindmapModificationsResult {
  isConnected: boolean;
  lastEvent: MindmapModifyEvent | null;
  reconnect: () => void;
  snapshot: MindmapSnapshot | null;
  recovery: MindmapRecoveryState;
}

export function useMindmapModifications({
  sessionId,
  toolId,
  onSnapshot,
  enabled: requestedEnabled = true,
  callbacks,
}: UseMindmapModificationsOptions): UseMindmapModificationsResult {
  const durable = useMindmapSnapshots({ sessionId, toolId, enabled: requestedEnabled, onSnapshot });
  const enabled = requestedEnabled && !toolId;
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const attemptsRef = useRef(0);
  const seenRef = useRef(new Set<string>());
  // Ref to hold connect function for recursive calls in onerror handler
  const connectRef = useRef<() => void>(() => {});
  const isMountedRef = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<MindmapModifyEvent | null>(null);

  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const closeSource = useCallback(() => {
    const source = eventSourceRef.current;
    eventSourceRef.current = null;
    if (!source) return;
    source.onopen = null;
    source.onmessage = null;
    source.onerror = null;
    source.close();
  }, []);

  const handleEvent = useCallback(
    (event: MessageEvent) => {
      try {
        if (event.data.startsWith(':')) return;

        const data = JSON.parse(event.data);

        if (data.type !== 'mindmap:modify') return;
        if (
          data.sessionId !== sessionId ||
          typeof data.id !== 'string' ||
          !data.id ||
          seenRef.current.has(data.id)
        )
          return;
        seenRef.current.add(data.id);

        const modifyEvent = data as MindmapModifyEvent;
        setLastEvent(modifyEvent);

        const { command, args } = modifyEvent.data;

        logger.info('[MindmapModifications] Received event', { command, args });

        switch (command) {
          case 'mindmap_add_node': {
            const { concept, parentNode } = args as {
              concept: string;
              parentNode?: string;
            };
            callbacksRef.current.onAddNode?.(concept, parentNode);
            break;
          }
          case 'mindmap_connect_nodes': {
            const { nodeA, nodeB } = args as { nodeA: string; nodeB: string };
            callbacksRef.current.onConnectNodes?.(nodeA, nodeB);
            break;
          }
          case 'mindmap_expand_node': {
            const { node, suggestions } = args as {
              node: string;
              suggestions?: string[];
            };
            callbacksRef.current.onExpandNode?.(node, suggestions);
            break;
          }
          case 'mindmap_delete_node': {
            const { node } = args as { node: string };
            callbacksRef.current.onDeleteNode?.(node);
            break;
          }
          case 'mindmap_focus_node': {
            const { node } = args as { node: string };
            callbacksRef.current.onFocusNode?.(node);
            break;
          }
          case 'mindmap_set_color': {
            const { node, color } = args as { node: string; color: string };
            callbacksRef.current.onSetColor?.(node, color);
            break;
          }
          default:
            logger.warn('[MindmapModifications] Unknown command', { command });
        }
      } catch (error) {
        logger.error('[MindmapModifications] Failed to parse event', {
          error: String(error),
        });
      }
    },
    [sessionId],
  );

  const connect = useCallback(() => {
    if (!isMountedRef.current || !sessionId || !enabled) return;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    closeSource();

    const url = `/api/tools/stream?sessionId=${encodeURIComponent(sessionId)}`;

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      if (eventSourceRef.current !== eventSource) return;
      logger.info('[MindmapModifications] SSE connected', { sessionId });
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      if (eventSourceRef.current === eventSource) handleEvent(event);
    };

    eventSource.onerror = (error) => {
      if (eventSourceRef.current !== eventSource) return;
      closeSource();
      logger.warn('[MindmapModifications] SSE error, reconnecting...', {
        error,
      });
      setIsConnected(false);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (attemptsRef.current >= MINDMAP_RETRY_DELAYS.length) return;
      const delay = MINDMAP_RETRY_DELAYS[attemptsRef.current++];
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        connectRef.current();
      }, delay);
    };
  }, [sessionId, enabled, handleEvent, closeSource]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const reconnect = useCallback(() => {
    attemptsRef.current = 0;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    connect();
  }, [connect]);

  useEffect(() => {
    isMountedRef.current = true;
    attemptsRef.current = 0;
    seenRef.current.clear();
    if (enabled && sessionId) {
      connect();
    }

    return () => {
      isMountedRef.current = false;
      closeSource();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      setIsConnected(false);
    };
  }, [sessionId, enabled, connect, closeSource]);

  return {
    isConnected: toolId ? durable.recovery.status === 'connected' : isConnected,
    lastEvent: toolId ? null : lastEvent,
    reconnect: toolId ? durable.reconnect : reconnect,
    snapshot: durable.snapshot,
    recovery: durable.recovery,
  };
}
