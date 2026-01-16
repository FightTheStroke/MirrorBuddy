/**
 * Tool Event Processing
 * Processes SSE events and updates tool state
 */

'use client';

import type { StreamToolEvent, ActiveToolState } from '../use-tool-stream';

/**
 * Process a tool event and return updated active tool state
 */
export function processStreamToolEvent(
  event: StreamToolEvent,
  previousState: ActiveToolState | null
): ActiveToolState | null {
  switch (event.type) {
    case 'tool:created':
      return {
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
      };

    case 'tool:update':
      if (!previousState || previousState.id !== event.id) return previousState;
      // Cap chunks array to prevent unbounded growth (keep last 200)
      const newChunks = event.data.chunk
        ? [...previousState.chunks, event.data.chunk].slice(-200)
        : previousState.chunks;
      return {
        ...previousState,
        progress: event.data.progress ?? previousState.progress,
        chunks: newChunks,
        content: event.data.content ?? previousState.content,
      };

    case 'tool:complete':
      if (!previousState || previousState.id !== event.id) return previousState;
      return {
        ...previousState,
        status: 'completed',
        progress: 100,
        content: event.data.content ?? previousState.content,
      };

    case 'tool:error':
      if (!previousState || previousState.id !== event.id) return previousState;
      return {
        ...previousState,
        status: 'error',
        errorMessage: event.data.error,
      };

    case 'tool:cancelled':
      if (!previousState || previousState.id !== event.id) return previousState;
      return {
        ...previousState,
        status: 'cancelled',
      };

    default:
      return previousState;
  }
}
