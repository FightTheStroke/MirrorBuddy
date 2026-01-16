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
  // Store handler references for proper cleanup
  const handlersRef = useRef<{
    connected: ((e: Event) => void) | null;
    message: ((e: MessageEvent) => void) | null;
    error: (() => void) | null;
  }>({ connected: null, message: null, error: null });
  // Ref for setupEventSource to avoid circular dependency in useCallback
  const setupEventSourceRef = useRef<((url: string) => EventSource) | null>(null);
  // Track mounted state to avoid setState on unmount
  const isMountedRef = useRef(true);

  // Store callbacks in refs to avoid stale closures
  const onEventRef = useRef(onEvent);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onEventRef.current = onEvent;
    onErrorRef.current = onError;
  }, [onEvent, onError]);

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
          // Cap chunks array to prevent unbounded growth (keep last 200)
          const newChunks = event.data.chunk
            ? [...prev.chunks, event.data.chunk].slice(-200)
            : prev.chunks;
          return {
            ...prev,
            progress: event.data.progress ?? prev.progress,
            chunks: newChunks,
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

  // Clean up EventSource listeners
  const cleanupEventSource = useCallback((es: EventSource | null) => {
    if (!es) return;
    const handlers = handlersRef.current;
    if (handlers.connected) {
      es.removeEventListener('connected', handlers.connected);
    }
    if (handlers.message) {
      es.removeEventListener('message', handlers.message);
    }
    if (handlers.error) {
      es.removeEventListener('error', handlers.error);
    }
    es.close();
  }, []);

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    cleanupEventSource(eventSourceRef.current);
    eventSourceRef.current = null;
    handlersRef.current = { connected: null, message: null, error: null };

    // Only update state if still mounted
    if (isMountedRef.current) {
      setConnectionState('disconnected');
      setClientId(null);
    }
    logger.info('Disconnected from tool stream');
  }, [cleanupEventSource]);

  // Set up EventSource with handlers
  const setupEventSource = useCallback((url: string): EventSource => {
    const eventSource = new EventSource(url);

    // Create handlers and store references for cleanup
    const connectedHandler = (e: Event) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        setClientId(data.clientId);
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0;
        logger.info('Tool stream connected', { clientId: data.clientId });
      } catch {
        logger.warn('Failed to parse connected event');
      }
    };

    const messageHandler = (e: MessageEvent) => {
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

    const errorHandler = () => {
      logger.warn('Tool stream error');
      // Clean up current EventSource properly
      cleanupEventSource(eventSourceRef.current);
      eventSourceRef.current = null;

      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        setConnectionState('reconnecting');
        reconnectAttemptsRef.current++;

        // Exponential backoff with jitter: base * 2^attempt + random(0-500ms)
        const exponentialDelay = reconnectDelayMs * Math.pow(2, reconnectAttemptsRef.current - 1);
        const jitter = Math.random() * 500;
        const delay = Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds

        reconnectTimeoutRef.current = setTimeout(() => {
          logger.info('Reconnecting to tool stream', {
            attempt: reconnectAttemptsRef.current,
            delayMs: Math.round(delay),
          });
          const newUrl = `/api/tools/stream?sessionId=${encodeURIComponent(sessionId)}`;
          // Use ref to avoid circular dependency
          const setupFn = setupEventSourceRef.current;
          if (setupFn) {
            eventSourceRef.current = setupFn(newUrl);
          }
        }, delay);
      } else {
        setConnectionState('error');
        onErrorRef.current?.(new Error('Max reconnect attempts reached'));
      }
    };

    // Store handler references for cleanup
    handlersRef.current = {
      connected: connectedHandler,
      message: messageHandler,
      error: errorHandler,
    };

    // Attach handlers
    eventSource.addEventListener('connected', connectedHandler);
    eventSource.addEventListener('message', messageHandler);
    eventSource.addEventListener('error', errorHandler);

    return eventSource;
  }, [sessionId, maxReconnectAttempts, reconnectDelayMs, processToolEvent, cleanupEventSource]);

  // Update ref for recursive calls - must be in useEffect
  useEffect(() => {
    setupEventSourceRef.current = setupEventSource;
  }, [setupEventSource]);

  // Connect to SSE
  const connect = useCallback(() => {
    // Clean up existing connection properly
    cleanupEventSource(eventSourceRef.current);
    eventSourceRef.current = null;

    setConnectionState('connecting');
    logger.info('Connecting to tool stream', { sessionId });

    const url = `/api/tools/stream?sessionId=${encodeURIComponent(sessionId)}`;
    eventSourceRef.current = setupEventSource(url);
  }, [sessionId, cleanupEventSource, setupEventSource]);

  // Auto-connect on mount
  useEffect(() => {
    isMountedRef.current = true;
    if (autoConnect && sessionId) {
      // Defer connection to avoid synchronous setState in effect
      queueMicrotask(connect);
    }

    return () => {
      isMountedRef.current = false;
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
