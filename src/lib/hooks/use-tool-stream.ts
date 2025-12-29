'use client';
// ============================================================================
// HOOK: useToolStream
// Connects to SSE endpoint for real-time tool updates
// Provides reactive state for tool building progress
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';
import type { ToolType } from '@/lib/realtime/tool-events';

// Event received from SSE stream
export interface StreamToolEvent {
  id: string;
  type:
    | 'tool:created'
    | 'tool:update'
    | 'tool:complete'
    | 'tool:error'
    | 'tool:cancelled';
  toolType: ToolType;
  sessionId: string;
  maestroId: string;
  timestamp: number;
  data: {
    title?: string;
    subject?: string;
    chunk?: string;
    progress?: number;
    content?: unknown;
    error?: string;
  };
}

// Connection state
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'reconnecting';

// Hook return type
export interface UseToolStreamResult {
  // Connection
  connectionState: ConnectionState;
  clientId: string | null;
  connect: () => void;
  disconnect: () => void;

  // Active tool state
  activeTool: ActiveToolState | null;
  toolHistory: StreamToolEvent[];

  // Stats
  eventsReceived: number;
}

// Active tool being built
export interface ActiveToolState {
  id: string;
  type: ToolType;
  maestroId: string;
  title: string;
  subject?: string;
  progress: number;
  chunks: string[];
  content: unknown;
  status: 'building' | 'completed' | 'error' | 'cancelled';
  startedAt: number;
  errorMessage?: string;
}

interface UseToolStreamOptions {
  sessionId: string;
  autoConnect?: boolean;
  onEvent?: (event: StreamToolEvent) => void;
  onError?: (error: Error) => void;
  maxReconnectAttempts?: number;
  reconnectDelayMs?: number;
}

export function useToolStream(options: UseToolStreamOptions): UseToolStreamResult {
  const {
    sessionId,
    autoConnect = true,
    onEvent,
    onError,
    maxReconnectAttempts = 5,
    reconnectDelayMs = 2000,
  } = options;

  // State
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [clientId, setClientId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ActiveToolState | null>(null);
  const [toolHistory, setToolHistory] = useState<StreamToolEvent[]>([]);
  const [eventsReceived, setEventsReceived] = useState(0);

  // Refs
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Store callbacks in refs to avoid stale closures
  const onEventRef = useRef(onEvent);
  const onErrorRef = useRef(onError);
  onEventRef.current = onEvent;
  onErrorRef.current = onError;

  // Handle tool event - defined first so it can be used in connect
  const processToolEvent = useCallback((event: StreamToolEvent) => {
    setToolHistory((prev) => [...prev, event].slice(-50)); // Keep last 50

    switch (event.type) {
      case 'tool:created':
        setActiveTool({
          id: event.id,
          type: event.toolType,
          maestroId: event.maestroId,
          title: event.data.title || 'Untitled',
          subject: event.data.subject,
          progress: 0,
          chunks: [],
          content: null,
          status: 'building',
          startedAt: event.timestamp,
        });
        break;

      case 'tool:update':
        setActiveTool((prev) => {
          if (!prev || prev.id !== event.id) return prev;
          return {
            ...prev,
            progress: event.data.progress ?? prev.progress,
            chunks: event.data.chunk
              ? [...prev.chunks, event.data.chunk]
              : prev.chunks,
            content: event.data.content ?? prev.content,
          };
        });
        break;

      case 'tool:complete':
        setActiveTool((prev) => {
          if (!prev || prev.id !== event.id) return prev;
          return {
            ...prev,
            status: 'completed',
            progress: 100,
            content: event.data.content ?? prev.content,
          };
        });
        break;

      case 'tool:error':
        setActiveTool((prev) => {
          if (!prev || prev.id !== event.id) return prev;
          return {
            ...prev,
            status: 'error',
            errorMessage: event.data.error,
          };
        });
        break;

      case 'tool:cancelled':
        setActiveTool((prev) => {
          if (!prev || prev.id !== event.id) return prev;
          return {
            ...prev,
            status: 'cancelled',
          };
        });
        break;
    }
  }, []);

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setConnectionState('disconnected');
    setClientId(null);
    logger.info('Disconnected from tool stream');
  }, []);

  // Connect to SSE
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionState('connecting');
    logger.info('Connecting to tool stream', { sessionId });

    const url = `/api/tools/stream?sessionId=${encodeURIComponent(sessionId)}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    // Handle connection open
    eventSource.addEventListener('connected', (e) => {
      try {
        const data = JSON.parse(e.data);
        setClientId(data.clientId);
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0;
        logger.info('Tool stream connected', { clientId: data.clientId });
      } catch {
        logger.warn('Failed to parse connected event');
      }
    });

    // Handle tool events
    eventSource.onmessage = (e) => {
      if (e.data.startsWith(':')) return; // Ignore heartbeats

      try {
        const event: StreamToolEvent = JSON.parse(e.data);
        setEventsReceived((prev) => prev + 1);
        processToolEvent(event);
        onEventRef.current?.(event);
      } catch {
        logger.warn('Failed to parse SSE message', { data: e.data });
      }
    };

    // Handle errors - use function reference to avoid closure issue
    eventSource.onerror = function handleError() {
      logger.warn('Tool stream error');
      eventSource.close();
      eventSourceRef.current = null;

      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        setConnectionState('reconnecting');
        reconnectAttemptsRef.current++;

        reconnectTimeoutRef.current = setTimeout(() => {
          logger.info('Reconnecting to tool stream', {
            attempt: reconnectAttemptsRef.current,
          });
          // Create new connection instead of recursive call
          const newUrl = `/api/tools/stream?sessionId=${encodeURIComponent(sessionId)}`;
          const newEventSource = new EventSource(newUrl);
          eventSourceRef.current = newEventSource;

          // Re-attach handlers (simplified for reconnect)
          newEventSource.addEventListener('connected', (evt) => {
            try {
              const data = JSON.parse(evt.data);
              setClientId(data.clientId);
              setConnectionState('connected');
              reconnectAttemptsRef.current = 0;
            } catch {
              // Ignore parse errors
            }
          });

          newEventSource.onmessage = eventSource.onmessage;
          newEventSource.onerror = handleError;
        }, reconnectDelayMs * reconnectAttemptsRef.current);
      } else {
        setConnectionState('error');
        onErrorRef.current?.(new Error('Max reconnect attempts reached'));
      }
    };
  }, [sessionId, maxReconnectAttempts, reconnectDelayMs, processToolEvent]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && sessionId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, sessionId, connect, disconnect]);

  return {
    connectionState,
    clientId,
    connect,
    disconnect,
    activeTool,
    toolHistory,
    eventsReceived,
  };
}
