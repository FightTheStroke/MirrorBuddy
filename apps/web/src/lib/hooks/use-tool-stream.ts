'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { clientLogger as logger } from '@/lib/logger/client';
import { processStreamToolEvent } from './use-tool-stream/tool-event-processor';
import type {
  StreamToolEvent,
  ConnectionState,
  UseToolStreamResult,
  ActiveToolState,
} from './use-tool-stream/types';

// Re-export types for backwards compatibility
export type {
  StreamToolEvent,
  ConnectionState,
  UseToolStreamResult,
  ActiveToolState,
} from './use-tool-stream/types';

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

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [clientId, setClientId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ActiveToolState | null>(null);
  const [toolHistory, setToolHistory] = useState<StreamToolEvent[]>([]);
  const [eventsReceived, setEventsReceived] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(false);
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

  const processToolEvent = useCallback((event: StreamToolEvent) => {
    setToolHistory((prev) => [...prev, event].slice(-50)); // Keep last 50
    setActiveTool((prev) => processStreamToolEvent(event, prev));
  }, []);

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

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
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

  const setupEventSource = useCallback(
    (url: string): EventSource => {
      const eventSource = new EventSource(url);

      const connectedHandler = (e: Event) => {
        if (eventSourceRef.current !== eventSource) return;
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
        if (eventSourceRef.current !== eventSource) return;
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
        if (eventSourceRef.current !== eventSource) return;
        logger.warn('Tool stream error');
        cleanupEventSource(eventSource);
        eventSourceRef.current = null;

        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          setConnectionState('reconnecting');
          reconnectAttemptsRef.current++;

          const exponentialDelay = reconnectDelayMs * Math.pow(2, reconnectAttemptsRef.current - 1);
          const jitter = Math.random() * 500;
          const delay = Math.min(exponentialDelay + jitter, 30000);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            if (!isMountedRef.current || !shouldReconnectRef.current) return;
            logger.info('Reconnecting to tool stream', {
              attempt: reconnectAttemptsRef.current,
              delayMs: Math.round(delay),
            });
            const newUrl = `/api/tools/stream?sessionId=${encodeURIComponent(sessionId)}`;
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

      handlersRef.current = {
        connected: connectedHandler,
        message: messageHandler,
        error: errorHandler,
      };

      eventSource.addEventListener('connected', connectedHandler);
      eventSource.addEventListener('message', messageHandler);
      eventSource.addEventListener('error', errorHandler);

      return eventSource;
    },
    [sessionId, maxReconnectAttempts, reconnectDelayMs, processToolEvent, cleanupEventSource],
  );

  // Update ref for recursive calls - must be in useEffect
  useEffect(() => {
    setupEventSourceRef.current = setupEventSource;
  }, [setupEventSource]);

  const connect = useCallback(() => {
    if (!isMountedRef.current || !sessionId) return;
    shouldReconnectRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
    cleanupEventSource(eventSourceRef.current);
    eventSourceRef.current = null;

    setConnectionState('connecting');
    logger.info('Connecting to tool stream', { sessionId });

    const url = `/api/tools/stream?sessionId=${encodeURIComponent(sessionId)}`;
    eventSourceRef.current = setupEventSource(url);
  }, [sessionId, cleanupEventSource, setupEventSource]);

  // Auto-connect on mount
  useEffect(() => {
    let cancelled = false;
    isMountedRef.current = true;
    shouldReconnectRef.current = autoConnect && Boolean(sessionId);
    if (autoConnect && sessionId) {
      // Defer connection to avoid synchronous setState in effect
      queueMicrotask(() => {
        if (!cancelled && shouldReconnectRef.current) connect();
      });
    }

    return () => {
      cancelled = true;
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
