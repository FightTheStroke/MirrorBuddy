/**
 * EventSource Setup and Handler Configuration
 * Handles SSE connection and event listener management
 */

'use client';

import { clientLogger as logger } from '@/lib/logger/client';
import type { StreamToolEvent } from '../use-tool-stream';

/**
 * Event handlers storage
 */
export interface EventHandlers {
  connected: ((e: Event) => void) | null;
  message: ((e: MessageEvent) => void) | null;
  error: (() => void) | null;
}

/**
 * Create event handlers for EventSource
 */
export function createEventHandlers(
  onConnected: (clientId: string) => void,
  onMessage: (event: StreamToolEvent) => void,
  onError: () => void,
): EventHandlers {
  const connectedHandler = (e: Event) => {
    try {
      const data = JSON.parse((e as MessageEvent).data);
      onConnected(data.clientId);
    } catch {
      logger.warn('Failed to parse connected event');
    }
  };

  const messageHandler = (e: MessageEvent) => {
    if (e.data.startsWith(':')) return; // Ignore heartbeats
    try {
      const event: StreamToolEvent = JSON.parse(e.data);
      onMessage(event);
    } catch {
      logger.warn('Failed to parse SSE message', { data: e.data });
    }
  };

  const errorHandler = () => {
    logger.warn('Tool stream error');
    onError();
  };

  return { connected: connectedHandler, message: messageHandler, error: errorHandler };
}

/**
 * Attach handlers to EventSource
 */
export function attachEventSourceHandlers(eventSource: EventSource, handlers: EventHandlers): void {
  if (handlers.connected) {
    eventSource.addEventListener('connected', handlers.connected);
  }
  if (handlers.message) {
    eventSource.addEventListener('message', handlers.message);
  }
  if (handlers.error) {
    eventSource.addEventListener('error', handlers.error);
  }
}

/**
 * Detach handlers from EventSource
 */
export function detachEventSourceHandlers(eventSource: EventSource, handlers: EventHandlers): void {
  if (handlers.connected) {
    eventSource.removeEventListener('connected', handlers.connected);
  }
  if (handlers.message) {
    eventSource.removeEventListener('message', handlers.message);
  }
  if (handlers.error) {
    eventSource.removeEventListener('error', handlers.error);
  }
}
